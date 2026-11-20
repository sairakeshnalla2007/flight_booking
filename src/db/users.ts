import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(
  email: string,
  name?: string | null,
  passwordHash?: string | null
) {
  const safeName = (name && name.trim()) || email.split('@')[0] || 'Traveler';
  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    const result = await db
      .insert(users)
      .values({
        uid: email,
        email,
        name: safeName,
        passwordHash: passwordHash || null,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function getUserByEmail(email: string) {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in getUserByEmail:', error);
    throw new Error('Failed to retrieve user profile.', { cause: error });
  }
}

export async function getUserById(userId: number) {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in getUserById:', error);
    throw new Error('Failed to retrieve user profile.', { cause: error });
  }
}
