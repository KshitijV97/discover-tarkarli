import "server-only";
import { db } from "./db";

import { roleForEmail, type UserRole } from "@/lib/auth/roles";

export type { UserRole };
export { roleForEmail };

export interface AppUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  image: string | null;
  role: UserRole;
}

/**
 * Find-or-create a user for an external identity (e.g. Google). Links by
 * provider id first, then by verified email, so the same person signing in
 * with different methods ends up on one account.
 */
export async function upsertIdentityUser(input: {
  provider: string;
  providerAccountId: string;
  email: string | null;
  emailVerified: boolean;
  name?: string | null;
  image?: string | null;
}): Promise<AppUser> {
  const email = input.email?.toLowerCase() ?? null;
  const role = roleForEmail(email);
  const sql = db();
  return sql.begin(async (tx) => {
    const [linked] = await tx<{ user_id: string }[]>`
      select user_id from user_identities where provider = ${input.provider} and provider_account_id = ${input.providerAccountId}`;
    let userId = linked?.user_id;

    if (!userId && email && input.emailVerified) {
      const [byEmail] = await tx<{ id: string }[]>`select id from users where email = ${email}`;
      userId = byEmail?.id;
    }

    if (!userId) {
      const [created] = await tx<{ id: string }[]>`
        insert into users (email, email_verified_at, name, image, role)
        values (${email}, ${input.emailVerified ? new Date() : null}, ${input.name ?? null}, ${input.image ?? null}, ${role})
        returning id`;
      userId = created.id;
    }

    await tx`insert into user_identities (user_id, provider, provider_account_id)
             values (${userId}, ${input.provider}, ${input.providerAccountId}) on conflict do nothing`;

    // Refresh profile + role on every sign-in (allow-list changes take effect at next login).
    const [user] = await tx<AppUser[]>`
      update users set
        name = coalesce(${input.name ?? null}, name),
        image = coalesce(${input.image ?? null}, image),
        email_verified_at = case when ${input.emailVerified} then coalesce(email_verified_at, now()) else email_verified_at end,
        role = ${role},
        last_login_at = now()
      where id = ${userId}
      returning id, email, phone, name, image, role`;
    return user;
  });
}
