import { Router } from "express";
import { prisma } from "../prisma";
import { requireUserFromRequest } from "../auth";

export const ridesRouter = Router();

ridesRouter.post("/", async (req, res) => {
  try {
    const user = await requireUserFromRequest(req);
    const { origin, destination, requestedSeats = 1, metadata } = req.body;

    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "origin and destination are required",
        },
      });
    }

    const passenger = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (!passenger) {
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "user not found" },
      });
    }

    const ride = await prisma.ride.create({
      data: {
        passengerId: passenger.id,
        originAddress: origin.address || "Unknown origin",
        originLat: Number(origin.lat),
        originLng: Number(origin.lng),
        destinationAddress: destination.address || "Unknown destination",
        destinationLat: Number(destination.lat),
        destinationLng: Number(destination.lng),
        requestedSeats: Number(requestedSeats),
        fareCents: 750,
        currency: "usd",
        status: "REQUESTED",
        metadata: metadata || {},
      },
    });

    return res.status(201).json({
      ok: true,
      ride: {
        id: ride.id,
        passengerId: ride.passengerId,
        status: ride.status,
        fareCents: ride.fareCents,
        currency: ride.currency,
        createdAt: ride.createdAt,
      },
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      error: {
        code: error.statusCode === 401 ? "UNAUTHORIZED" : "INTERNAL",
        message: error.message || "Error creating ride",
      },
    });
  }
});

ridesRouter.get("/:rideId", async (req, res) => {
  const { rideId } = req.params;

  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      driver: true,
      payment: true,
      passenger: true,
    },
  });

  if (!ride) {
    return res.status(404).json({
      ok: false,
      error: { code: "NOT_FOUND", message: "ride not found" },
    });
  }

  return res.status(200).json({ ok: true, ride });
});

ridesRouter.patch("/:rideId/status", async (req, res) => {
  try {
    const user = await requireUserFromRequest(req);
    const { rideId } = req.params;
    const { action, driverId } = req.body;

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "ride not found" },
      });
    }

    let nextStatus: any = null;

    switch (action) {
      case "ACCEPT":
        nextStatus = "ACCEPTED";
        break;
      case "START":
        nextStatus = "IN_PROGRESS";
        break;
      case "COMPLETE":
        nextStatus = "COMPLETED";
        break;
      case "CANCEL":
        nextStatus = "CANCELLED";
        break;
      default:
        return res.status(400).json({
          ok: false,
          error: { code: "INVALID_INPUT", message: "unsupported action" },
        });
    }

    const updated = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: nextStatus,
        driverId: action === "ACCEPT" ? Number(driverId) : ride.driverId,
      },
    });

    return res.status(200).json({
      ok: true,
      ride: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      error: {
        code: error.statusCode === 401 ? "UNAUTHORIZED" : "INTERNAL",
        message: error.message || "Error updating ride status",
      },
    });
  }
});
