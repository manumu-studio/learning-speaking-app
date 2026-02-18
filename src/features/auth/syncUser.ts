// Synchronize authenticated user with local database
import { findOrCreateUser } from '@/lib/db-utils';
import type { User } from '@prisma/client';

interface SyncUserParams {
  externalId: string;
  email?: string | null;
  displayName?: string | null;
}

/**
 * Find or create user in local database after OAuth sign-in
 */
export async function syncUser(params: SyncUserParams): Promise<User> {
  const { externalId, email, displayName } = params;

  return findOrCreateUser(externalId, {
    email: email ?? undefined,
    displayName: displayName ?? undefined,
  });
}
