import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  payments,
  subscriptionPayments,
  subscriptions,
  userSubscriptions,
} from '../db/schema.ts';
import { calculateSubscriptionEndDate } from '../lib/bookingRules.ts';
import type {
  PaymentMethod,
  SubscriptionPlan,
  UserSubscription,
} from '../lib/types.ts';

export async function listSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const rows = await db
      .select()
      .from(subscriptions)
      .orderBy(asc(subscriptions.amount));

    return rows.map((r) => ({
      subscriptionId: r.subscriptionId,
      planName: r.planName,
      amount: Number(r.amount),
      durationDays: r.durationDays,
    }));
  } catch (error) {
    console.error('Database query failed in listSubscriptionPlans:', error);
    throw new Error('Failed to load subscription plans.', { cause: error });
  }
}

export async function getUserActiveSubscription(
  userId: number
): Promise<UserSubscription | null> {
  try {
    const rows = await db
      .select({
        userSubscriptionId: userSubscriptions.userSubscriptionId,
        userId: userSubscriptions.userId,
        subscriptionId: userSubscriptions.subscriptionId,
        planName: subscriptions.planName,
        planAmount: subscriptions.amount,
        durationDays: subscriptions.durationDays,
        startDate: userSubscriptions.startDate,
        endDate: userSubscriptions.endDate,
        status: userSubscriptions.status,
      })
      .from(userSubscriptions)
      .innerJoin(
        subscriptions,
        eq(userSubscriptions.subscriptionId, subscriptions.subscriptionId)
      )
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, 'Active')
        )
      )
      .orderBy(desc(userSubscriptions.userSubscriptionId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      userSubscriptionId: row.userSubscriptionId,
      userId: row.userId,
      subscriptionId: row.subscriptionId,
      planName: row.planName,
      planAmount: Number(row.planAmount),
      durationDays: row.durationDays,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
    };
  } catch (error) {
    console.error('Database query failed in getUserActiveSubscription:', error);
    throw new Error('Failed to retrieve active user subscription.', {
      cause: error,
    });
  }
}

export async function listUserSubscriptionHistory(
  userId: number
): Promise<UserSubscription[]> {
  try {
    const rows = await db
      .select({
        userSubscriptionId: userSubscriptions.userSubscriptionId,
        userId: userSubscriptions.userId,
        subscriptionId: userSubscriptions.subscriptionId,
        planName: subscriptions.planName,
        planAmount: subscriptions.amount,
        durationDays: subscriptions.durationDays,
        startDate: userSubscriptions.startDate,
        endDate: userSubscriptions.endDate,
        status: userSubscriptions.status,
      })
      .from(userSubscriptions)
      .innerJoin(
        subscriptions,
        eq(userSubscriptions.subscriptionId, subscriptions.subscriptionId)
      )
      .where(eq(userSubscriptions.userId, userId))
      .orderBy(desc(userSubscriptions.userSubscriptionId));

    return rows.map((r) => ({
      userSubscriptionId: r.userSubscriptionId,
      userId: r.userId,
      subscriptionId: r.subscriptionId,
      planName: r.planName,
      planAmount: Number(r.planAmount),
      durationDays: r.durationDays,
      startDate: r.startDate,
      endDate: r.endDate,
      status: r.status,
    }));
  } catch (error) {
    console.error(
      'Database query failed in listUserSubscriptionHistory:',
      error
    );
    throw new Error('Failed to load subscription history.', { cause: error });
  }
}

export async function purchaseSubscription(params: {
  userId: number;
  subscriptionId: number;
  paymentMethod: PaymentMethod;
}): Promise<UserSubscription> {
  try {
    return await db.transaction(async (tx) => {
      const planRows = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.subscriptionId, params.subscriptionId))
        .limit(1);

      const plan = planRows[0];
      if (!plan) {
        throw new Error('SUBSCRIPTION_NOT_FOUND');
      }

      // Expire any existing active subscription before activating the new tier
      await tx
        .update(userSubscriptions)
        .set({ status: 'Expired' })
        .where(
          and(
            eq(userSubscriptions.userId, params.userId),
            eq(userSubscriptions.status, 'Active')
          )
        );

      const startDate = new Date().toISOString().slice(0, 10);
      const endDate = calculateSubscriptionEndDate(
        startDate,
        plan.durationDays
      );

      const [createdSub] = await tx
        .insert(userSubscriptions)
        .values({
          userId: params.userId,
          subscriptionId: plan.subscriptionId,
          startDate,
          endDate,
          status: 'Active',
        })
        .returning();

      const txnRef = `TXN-SUB-${Date.now()}-${createdSub.userSubscriptionId}`;

      const [payment] = await tx
        .insert(payments)
        .values({
          amount: plan.amount,
          paymentStatus: 'Success',
          paymentMethod: params.paymentMethod,
          transactionReference: txnRef,
        })
        .returning();

      await tx.insert(subscriptionPayments).values({
        paymentId: payment.paymentId,
        userSubscriptionId: createdSub.userSubscriptionId,
      });

      return {
        userSubscriptionId: createdSub.userSubscriptionId,
        userId: createdSub.userId,
        subscriptionId: createdSub.subscriptionId,
        planName: plan.planName,
        planAmount: Number(plan.amount),
        durationDays: plan.durationDays,
        startDate: createdSub.startDate,
        endDate: createdSub.endDate,
        status: createdSub.status,
      };
    });
  } catch (error: any) {
    if (error?.message === 'SUBSCRIPTION_NOT_FOUND') {
      throw error;
    }
    console.error('Database transaction failed in purchaseSubscription:', error);
    throw new Error('Failed to activate subscription plan.', { cause: error });
  }
}

export async function updateSubscriptionStatus(
  userSubscriptionId: number,
  userId: number,
  status: 'Expired' | 'Cancelled'
) {
  try {
    const updated = await db
      .update(userSubscriptions)
      .set({ status })
      .where(
        and(
          eq(userSubscriptions.userSubscriptionId, userSubscriptionId),
          eq(userSubscriptions.userId, userId)
        )
      )
      .returning();

    return updated[0] ?? null;
  } catch (error) {
    console.error('Database update failed in updateSubscriptionStatus:', error);
    throw new Error('Failed to update subscription status.', { cause: error });
  }
}
