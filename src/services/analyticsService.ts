import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { bookings, flightSeats, payments } from '../db/schema.ts';
import { categorizeBookingAmount } from '../lib/bookingRules.ts';
import type { BookingCategory, PlatformAnalytics } from '../lib/types.ts';
import { getFlightSeatSummaryByFlight } from './flightService.ts';

export async function getUserAnalytics(
  userId: number
): Promise<PlatformAnalytics> {
  try {
    const [userBookingRows, paymentMethodRows, seatSummary] = await Promise.all(
      [
        db
          .select({
            bookingId: bookings.bookingId,
            bookingStatus: bookings.bookingStatus,
            totalAmount: bookings.totalAmount,
          })
          .from(bookings)
          .where(eq(bookings.userId, userId)),
        db
          .select({
            method: payments.paymentMethod,
            count: sql<number>`count(*)::int`,
            total: sql<string>`coalesce(sum(${payments.amount}), 0)`,
          })
          .from(payments)
          .groupBy(payments.paymentMethod),
        getFlightSeatSummaryByFlight(),
      ]
    );

    const activeBookings = userBookingRows.filter(
      (b) => b.bookingStatus !== 'Cancelled'
    );
    const totalBookingsCount = activeBookings.length;
    const confirmedRevenue = activeBookings
      .filter((b) => b.bookingStatus === 'Confirmed')
      .reduce((sum, b) => sum + Number(b.totalAmount), 0);

    const amounts = activeBookings.map((b) => Number(b.totalAmount));
    const averageBookingAmount =
      amounts.length > 0
        ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length)
        : 0;
    const highestBookingAmount = amounts.length > 0 ? Math.max(...amounts) : 0;

    const categoryBreakdown: Record<BookingCategory, number> = {
      High: 0,
      Medium: 0,
      Low: 0,
    };

    for (const b of activeBookings) {
      const cat = categorizeBookingAmount(Number(b.totalAmount));
      categoryBreakdown[cat] += 1;
    }

    const availableSeatsTotal = seatSummary.reduce(
      (sum, f) => sum + Number(f.availableSeats),
      0
    );

    return {
      totalBookingsCount,
      confirmedRevenue,
      averageBookingAmount,
      highestBookingAmount,
      availableSeatsTotal,
      categoryBreakdown,
      paymentMethodBreakdown: paymentMethodRows.map((r) => ({
        method: r.method,
        count: Number(r.count),
        total: Number(r.total),
      })),
      flightSeatAvailability: seatSummary.map((f) => ({
        flightId: f.flightId,
        flightNumber: f.flightNumber,
        availableSeats: Number(f.availableSeats),
        totalSeats: Number(f.totalSeats),
      })),
    };
  } catch (error) {
    console.error('Database query failed in getUserAnalytics:', error);
    throw new Error('Failed to load analytics.', { cause: error });
  }
}

export async function getGlobalSeatAvailabilityCount(): Promise<number> {
  try {
    const [row] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(flightSeats)
      .where(eq(flightSeats.status, 'Available'));
    return Number(row?.count ?? 0);
  } catch (error) {
    console.error(
      'Database query failed in getGlobalSeatAvailabilityCount:',
      error
    );
    throw new Error('Failed to count available seats.', { cause: error });
  }
}
