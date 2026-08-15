import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./auth";

export const getServerSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export async function requireAdminSession() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
