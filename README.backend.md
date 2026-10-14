# Uber Backend Setup

This repo now includes a lightweight Node/Express backend for production-oriented flows.

## Prerequisites

- Node.js 18+
- PostgreSQL local or Docker
- Stripe CLI (optional, for webhooks)
- Clerk account

## Local setup

1. Install dependencies
```bash
npm install
```

2. Start Postgres
```bash
docker-compose up -d postgres
```

3. Create a `.env` file based on `.env.example`
```bash
cp .env.example .env
```

4. Fill in the real values for Clerk, Stripe, and database.

5. Generate Prisma client and push schema
```bash
npx prisma generate
npx prisma db push
```

6. Start the API
```bash
npm run server:dev
```

7. Test the server
```bash
curl http://localhost:3000/api/health
```

## Environment variables

- `DATABASE_URL`: PostgreSQL connection string
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhooks signing secret
- `CLERK_SECRET_KEY`: Clerk secret key
- `CLERK_WEBHOOK_SECRET`: Clerk webhook secret
- `EXPO_PUBLIC_SERVER_URL`: backend URL used by the Expo app

## Useful commands

```bash
npx prisma studio
npx prisma generate
npx prisma db push
npm run server:dev
npm run server:start
```

## Webhook testing

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Notes

- The Expo mobile app should not contain database secrets or Stripe secret keys.
- All sensitive logic stays on the backend side.
