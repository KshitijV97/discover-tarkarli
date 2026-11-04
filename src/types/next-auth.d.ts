import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/server/users-repo";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: UserRole } & DefaultSession["user"];
  }
}
