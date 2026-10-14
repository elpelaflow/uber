import { Router } from "express";
import { prisma } from "../prisma";
import { requireUserFromRequest } from "../auth";

export const driversRouter = Router();

driversRouter.get("/", async (req, res) => {
  const { lat, lng, limit = 20 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      ok: false,
      error: { code: "INVALID_INPUT", message: "lat and lng are required" },
    });
  }

  const latitude = Number(lat);
  const longitude = Number(lng);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return res.status(400).json({
      ok: false,
      error: { code: "INVALID_INPUT", message: "lat and lng must be numbers" },
    });
  }

  const drivers = await prisma.driver.findMany({
    where: { isOnline: true },
    take: Number(limit),
    orderBy: { rating: "desc" },
  });

  return res.status(200).json({
    ok: true,
    drivers: drivers.map((driver) => ({
      id: driver.id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      profileImageUrl: driver.profileImageUrl,
      carSeats: driver.carSeats,
      rating: driver.rating,
      currentLat: driver.currentLat,
      currentLng: driver.currentLng,
      priceEstimate: 750,
    })),
  });
});

driversRouter.patch("/:driverId/location", async (req, res) => {
  try {
    const user = await requireUserFromRequest(req);
    const { driverId } = req.params;
    const { lat, lng } = req.body;

    const driver = await prisma.driver.findUnique({
      where: { id: Number(driverId) },
    });

    if (!driver) {
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "driver not found" },
      });
    }

    const isOwner = driver.userId === user.id;
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: "FORBIDDEN", message: "not allowed to update this driver" },
      });
    }

    await prisma.driver.update({
      where: { id: Number(driverId) },
      data: {
        currentLat: lat,
        currentLng: lng,
      },
    });

    return res.status(204).send();
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      error: {
        code: error.statusCode === 401 ? "UNAUTHORIZED" : "INTERNAL",
        message: error.message || "Error updating driver location",
      },
    });
  }
});
