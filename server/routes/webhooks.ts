import { Router } from "express";
import Stripe from "stripe";
import { prisma } from "../prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

export const webhooksRouter = Router();

webhooksRouter.post("/stripe", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const rawBody = req.body;

  if (!sig || !rawBody) {
    return res.status(400).json({
      ok: false,
      error: { code: "INVALID_SIGNATURE", message: "missing stripe signature" },
    });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET || "",
    );
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: { code: "INVALID_SIGNATURE", message: "webhook signature failed" },
    });
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const rideId = paymentIntent.metadata.rideId;

    if (rideId) {
      await prisma.payment.updateMany({
        where: { rideId },
        data: { status: "SUCCEEDED" },
      });

      await prisma.ride.update({
        where: { id: rideId },
        data: { status: "PENDING" },
      });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const rideId = paymentIntent.metadata.rideId;

    if (rideId) {
      await prisma.payment.updateMany({
        where: { rideId },
        data: { status: "FAILED" },
      });
    }
  }

  return res.status(200).json({ ok: true });
});
