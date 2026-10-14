import { createClerkClient } from "@clerk/clerk-sdk-node";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY || "",
});

export async function requireUserFromRequest(req: any) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : null;

  if (!token) {
    throw Object.assign(new Error("UNAUTHORIZED"), { statusCode: 401 });
  }

  try {
    const verified = await clerk.verifyToken(token);
    return {
      id: verified.sub,
      email: verified.email || null,
      role: "PASSENGER",
    };
  } catch (error) {
    throw Object.assign(new Error("INVALID_TOKEN"), { statusCode: 401 });
  }
}

export function getUserOrThrow(req: any) {
  return requireUserFromRequest(req);
}
