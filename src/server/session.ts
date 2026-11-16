import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** The signed-in user's id, or a redirect to the login page. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  return id;
}
