import { Router } from "express";
import Stripe from "stripe";
import { prisma } from "../prisma";
import { requireUserFromRequest } from "../auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

export const paymentsRouter = Router();

paymentsRouter.post("/create", async (req, res) => {
  try {
    const user = await requireUserFromRequest(req);
    const { rideId, amountCents, currency = "usd", customer } = req.body;

    if (!rideId || !amountCents) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "rideId and amountCents are required",
        },
      });
    }

    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) {
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "ride not found" },
      });
    }

    let customerId: string | null = null;

    if (customer?.email) {
      const existing = await stripe.customers.list({ email: customer.email, limit: 1 });
      customerId = existing.data[0]?.id || null;
    }

    if (!customerId && customer?.email) {
      const created = await stripe.customers.create({
        name: customer.name || "Passenger",
        email: customer.email,
      });
      customerId = created.id;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Number(amountCents),
      currency,
      customer: customerId || undefined,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: { rideId, clerkUserId: user.id },
    });

    await prisma.payment.upsert({
      where: { rideId },
      create: {
        rideId,
        stripePaymentIntentId: paymentIntent.id,
        amountCents: Number(amountCents),
        currency,
        status: "PENDING",
      },
      update: {
        stripePaymentIntentId: paymentIntent.id,
        amountCents: Number(amountCents),
        currency,
        status: "PENDING",
      },
    });

    return res.status(200).json({
      ok: true,
      paymentIntent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
      },
      customerId,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      error: {
        code: error.statusCode === 401 ? "UNAUTHORIZED" : "INTERNAL",
        message: error.message || "Error creating payment",
      },
    });
  }
});
