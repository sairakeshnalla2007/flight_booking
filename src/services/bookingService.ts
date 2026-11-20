import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db/index.ts';
import {
  airlines,
  airports,
  bookingPayments,
  bookingSeats,
  bookings,
  flightSeats,
  flights,
  lastMinuteOffers,
  payments,
  subscriptionPayments,
  subscriptions,
  userSubscriptions,
} from '../db/schema.ts';
import {
  calculateBookingPricing,
  categorizeBookingAmount,
} from '../lib/bookingRules.ts';
import type {
  BookingDetail,
  PaymentLedgerEntry,
  PaymentMethod,
} from '../lib/types.ts';

export async function listUserBookings(
  userId: number
): Promise<BookingDetail[]> {
  try {
    const depAirport = alias(airports, 'dep_airport');
    const arrAirport = alias(airports, 'arr_airport');

    const bookingRows = await db
      .select({
        bookingId: bookings.bookingId,
        userId: bookings.userId,
        flightId: bookings.flightId,
        bookingDate: bookings.bookingDate,
        bookingStatus: bookings.bookingStatus,
        totalAmount: bookings.totalAmount,
        flightNumber: flights.flightNumber,
        departureTime: flights.departureTime,
        airlineName: airlines.airlineName,
        airlineCode: airlines.airlineCode,
        departureCode: depAirport.airportCode,
        departureCity: depAirport.city,
        arrivalCode: arrAirport.airportCode,
        arrivalCity: arrAirport.city,
      })
      .from(bookings)
      .innerJoin(flights, eq(bookings.flightId, flights.flightId))
      .innerJoin(airlines, eq(flights.airlineId, airlines.airlineId))
      .innerJoin(
        depAirport,
        eq(flights.departureAirportId, depAirport.airportId)
      )
      .innerJoin(arrAirport, eq(flights.arrivalAirportId, arrAirport.airportId))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.bookingDate));

    if (bookingRows.length === 0) return [];

    const bookingIds = bookingRows.map((b) => b.bookingId);

    const [seatRows, paymentRows] = await Promise.all([
      db
        .select({
          bookingId: bookingSeats.bookingId,
          flightSeatId: flightSeats.flightSeatId,
          seatNumber: flightSeats.seatNumber,
          seatClass: flightSeats.seatClass,
          price: flightSeats.price,
        })
        .from(bookingSeats)
        .innerJoin(
          flightSeats,
          eq(bookingSeats.flightSeatId, flightSeats.flightSeatId)
        )
        .where(inArray(bookingSeats.bookingId, bookingIds)),
      db
        .select({
          bookingId: bookingPayments.bookingId,
          paymentId: payments.paymentId,
          amount: payments.amount,
          paymentDate: payments.paymentDate,
          paymentStatus: payments.paymentStatus,
          paymentMethod: payments.paymentMethod,
          transactionReference: payments.transactionReference,
        })
        .from(bookingPayments)
        .innerJoin(payments, eq(bookingPayments.paymentId, payments.paymentId))
        .where(inArray(bookingPayments.bookingId, bookingIds)),
    ]);

    return bookingRows.map((b) => {
      const totalAmount = Number(b.totalAmount);
      const pay = paymentRows.find((p) => p.bookingId === b.bookingId);
      const seats = seatRows
        .filter((s) => s.bookingId === b.bookingId)
        .map((s) => ({
          flightSeatId: s.flightSeatId,
          seatNumber: s.seatNumber,
          seatClass: s.seatClass,
          price: Number(s.price),
        }));

      return {
        bookingId: b.bookingId,
        userId: b.userId,
        flightId: b.flightId,
        flightNumber: b.flightNumber,
        airlineName: b.airlineName,
        airlineCode: b.airlineCode,
        departureCode: b.departureCode,
        departureCity: b.departureCity,
        arrivalCode: b.arrivalCode,
        arrivalCity: b.arrivalCity,
        departureTime: b.departureTime.toISOString(),
        bookingDate: b.bookingDate.toISOString(),
        bookingStatus: b.bookingStatus,
        totalAmount,
        category: categorizeBookingAmount(totalAmount),
        seats,
        payment: pay
          ? {
              paymentId: pay.paymentId,
              amount: Number(pay.amount),
              paymentDate: pay.paymentDate.toISOString(),
              paymentStatus: pay.paymentStatus,
              paymentMethod: pay.paymentMethod,
              transactionReference: pay.transactionReference,
            }
          : null,
      };
    });
  } catch (error) {
    console.error('Database query failed in listUserBookings:', error);
    throw new Error('Failed to load user bookings.', { cause: error });
  }
}

export async function listUserPaymentLedger(
  userId: number
): Promise<PaymentLedgerEntry[]> {
  try {
    const [bookingPayRows, subPayRows] = await Promise.all([
      db
        .select({
          paymentId: payments.paymentId,
          amount: payments.amount,
          paymentDate: payments.paymentDate,
          paymentStatus: payments.paymentStatus,
          paymentMethod: payments.paymentMethod,
          transactionReference: payments.transactionReference,
          bookingId: bookings.bookingId,
          flightNumber: flights.flightNumber,
        })
        .from(bookingPayments)
        .innerJoin(payments, eq(bookingPayments.paymentId, payments.paymentId))
        .innerJoin(bookings, eq(bookingPayments.bookingId, bookings.bookingId))
        .innerJoin(flights, eq(bookings.flightId, flights.flightId))
        .where(eq(bookings.userId, userId)),
      db
        .select({
          paymentId: payments.paymentId,
          amount: payments.amount,
          paymentDate: payments.paymentDate,
          paymentStatus: payments.paymentStatus,
          paymentMethod: payments.paymentMethod,
          transactionReference: payments.transactionReference,
          planName: subscriptions.planName,
          userSubscriptionId: userSubscriptions.userSubscriptionId,
        })
        .from(subscriptionPayments)
        .innerJoin(
          payments,
          eq(subscriptionPayments.paymentId, payments.paymentId)
        )
        .innerJoin(
          userSubscriptions,
          eq(
            subscriptionPayments.userSubscriptionId,
            userSubscriptions.userSubscriptionId
          )
        )
        .innerJoin(
          subscriptions,
          eq(userSubscriptions.subscriptionId, subscriptions.subscriptionId)
        )
        .where(eq(userSubscriptions.userId, userId)),
    ]);

    const combined: PaymentLedgerEntry[] = [
      ...bookingPayRows.map((row) => ({
        paymentId: row.paymentId,
        paymentType: 'Booking Payment' as const,
        referenceLabel: `Booking #${row.bookingId} · ${row.flightNumber}`,
        amount: Number(row.amount),
        paymentDate: row.paymentDate.toISOString(),
        paymentStatus: row.paymentStatus,
        paymentMethod: row.paymentMethod,
        transactionReference: row.transactionReference,
      })),
      ...subPayRows.map((row) => ({
        paymentId: row.paymentId,
        paymentType: 'Subscription Payment' as const,
        referenceLabel: `${row.planName} Plan (#${row.userSubscriptionId})`,
        amount: Number(row.amount),
        paymentDate: row.paymentDate.toISOString(),
        paymentStatus: row.paymentStatus,
        paymentMethod: row.paymentMethod,
        transactionReference: row.transactionReference,
      })),
    ];

    combined.sort(
      (a, b) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
    return combined;
  } catch (error) {
    console.error('Database query failed in listUserPaymentLedger:', error);
    throw new Error('Failed to load payment ledger.', { cause: error });
  }
}

export async function createBooking(params: {
  userId: number;
  flightId: number;
  seatIds: number[];
  paymentMethod: PaymentMethod;
  holdOnly?: boolean;
}) {
  if (params.seatIds.length === 0) {
    throw new Error('NO_SEATS_SELECTED');
  }

  try {
    return await db.transaction(async (tx) => {
      // Lock requested seats with SELECT ... FOR UPDATE to guarantee concurrency safety
      const lockedSeats = await tx
        .select()
        .from(flightSeats)
        .where(
          and(
            eq(flightSeats.flightId, params.flightId),
            inArray(flightSeats.flightSeatId, params.seatIds)
          )
        )
        .for('update');

      if (lockedSeats.length !== params.seatIds.length) {
        throw new Error('SEAT_NOT_FOUND');
      }

      const unavailable = lockedSeats.filter((s) => s.status !== 'Available');
      if (unavailable.length > 0) {
        throw new Error(
          `SEAT_UNAVAILABLE:${unavailable.map((s) => s.seatNumber).join(',')}`
        );
      }

      // Resolve user's active subscription & eligible last-minute offer
      const activeSubRows = await tx
        .select()
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.userId, params.userId),
            eq(userSubscriptions.status, 'Active')
          )
        )
        .orderBy(desc(userSubscriptions.userSubscriptionId))
        .limit(1);

      const activeSub = activeSubRows[0] ?? null;
      let eligibleOffer = null;

      if (activeSub) {
        const offerRows = await tx
          .select()
          .from(lastMinuteOffers)
          .where(
            and(
              eq(lastMinuteOffers.flightId, params.flightId),
              eq(lastMinuteOffers.subscriptionId, activeSub.subscriptionId)
            )
          )
          .for('update');
        if (offerRows[0]) {
          eligibleOffer = {
            offerId: offerRows[0].offerId,
            subscriptionId: offerRows[0].subscriptionId,
            offerPrice: Number(offerRows[0].offerPrice),
            validUntil: offerRows[0].validUntil.toISOString(),
            availableSeats: offerRows[0].availableSeats,
          };
        }
      }

      const pricing = calculateBookingPricing(
        lockedSeats.map((s) => ({
          flightSeatId: s.flightSeatId,
          seatClass: s.seatClass,
          price: Number(s.price),
        })),
        eligibleOffer,
        activeSub?.subscriptionId ?? null
      );

      const targetSeatStatus = params.holdOnly ? 'Held' : 'Booked';
      const targetBookingStatus = params.holdOnly ? 'Pending' : 'Confirmed';
      const targetPaymentStatus = params.holdOnly ? 'Pending' : 'Success';

      await tx
        .update(flightSeats)
        .set({ status: targetSeatStatus })
        .where(inArray(flightSeats.flightSeatId, params.seatIds));

      if (pricing.appliedOfferId !== null && pricing.discountedSeatCount > 0) {
        await tx
          .update(lastMinuteOffers)
          .set({
            availableSeats: sql`GREATEST(0, ${lastMinuteOffers.availableSeats} - ${pricing.discountedSeatCount})`,
          })
          .where(eq(lastMinuteOffers.offerId, pricing.appliedOfferId));
      }

      const [createdBooking] = await tx
        .insert(bookings)
        .values({
          userId: params.userId,
          flightId: params.flightId,
          bookingStatus: targetBookingStatus,
          totalAmount: pricing.effectiveTotal.toFixed(2),
        })
        .returning();

      await tx.insert(bookingSeats).values(
        params.seatIds.map((seatId) => ({
          bookingId: createdBooking.bookingId,
          flightSeatId: seatId,
        }))
      );

      const txnRef = `TXN-BK-${Date.now()}-${createdBooking.bookingId}`;

      const [createdPayment] = await tx
        .insert(payments)
        .values({
          amount: pricing.effectiveTotal.toFixed(2),
          paymentStatus: targetPaymentStatus,
          paymentMethod: params.paymentMethod,
          transactionReference: txnRef,
        })
        .returning();

      await tx.insert(bookingPayments).values({
        paymentId: createdPayment.paymentId,
        bookingId: createdBooking.bookingId,
      });

      return {
        bookingId: createdBooking.bookingId,
        bookingStatus: createdBooking.bookingStatus,
        totalAmount: Number(createdBooking.totalAmount),
        pricing,
        transactionReference: txnRef,
      };
    });
  } catch (error: any) {
    if (
      error?.message === 'NO_SEATS_SELECTED' ||
      error?.message === 'SEAT_NOT_FOUND' ||
      error?.message?.startsWith('SEAT_UNAVAILABLE:')
    ) {
      throw error;
    }
    console.error('Database transaction failed in createBooking:', error);
    throw new Error('Failed to create booking.', { cause: error });
  }
}

export async function confirmPendingBooking(
  bookingId: number,
  userId: number,
  paymentMethod?: PaymentMethod
) {
  try {
    return await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(bookings)
        .where(
          and(eq(bookings.bookingId, bookingId), eq(bookings.userId, userId))
        )
        .for('update');

      const booking = rows[0];
      if (!booking) throw new Error('BOOKING_NOT_FOUND');
      if (booking.bookingStatus !== 'Pending') {
        throw new Error('BOOKING_NOT_PENDING');
      }

      const bSeats = await tx
        .select()
        .from(bookingSeats)
        .where(eq(bookingSeats.bookingId, bookingId));

      const seatIds = bSeats.map((s) => s.flightSeatId);
      if (seatIds.length > 0) {
        await tx
          .update(flightSeats)
          .set({ status: 'Booked' })
          .where(inArray(flightSeats.flightSeatId, seatIds));
      }

      const [updatedBooking] = await tx
        .update(bookings)
        .set({ bookingStatus: 'Confirmed' })
        .where(eq(bookings.bookingId, bookingId))
        .returning();

      const bpRows = await tx
        .select()
        .from(bookingPayments)
        .where(eq(bookingPayments.bookingId, bookingId));

      if (bpRows[0]) {
        await tx
          .update(payments)
          .set({
            paymentStatus: 'Success',
            ...(paymentMethod ? { paymentMethod } : {}),
          })
          .where(eq(payments.paymentId, bpRows[0].paymentId));
      }

      return updatedBooking;
    });
  } catch (error: any) {
    if (
      error?.message === 'BOOKING_NOT_FOUND' ||
      error?.message === 'BOOKING_NOT_PENDING'
    ) {
      throw error;
    }
    console.error('Database transaction failed in confirmPendingBooking:', error);
    throw new Error('Failed to confirm booking.', { cause: error });
  }
}

export async function cancelUserBooking(bookingId: number, userId: number) {
  try {
    return await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(bookings)
        .where(
          and(eq(bookings.bookingId, bookingId), eq(bookings.userId, userId))
        )
        .for('update');

      const booking = rows[0];
      if (!booking) throw new Error('BOOKING_NOT_FOUND');
      if (booking.bookingStatus === 'Cancelled') {
        throw new Error('BOOKING_ALREADY_CANCELLED');
      }

      const bSeats = await tx
        .select()
        .from(bookingSeats)
        .where(eq(bookingSeats.bookingId, bookingId));

      const seatIds = bSeats.map((s) => s.flightSeatId);
      if (seatIds.length > 0) {
        await tx
          .update(flightSeats)
          .set({ status: 'Available' })
          .where(inArray(flightSeats.flightSeatId, seatIds));
      }

      const [updatedBooking] = await tx
        .update(bookings)
        .set({ bookingStatus: 'Cancelled' })
        .where(eq(bookings.bookingId, bookingId))
        .returning();

      const bpRows = await tx
        .select()
        .from(bookingPayments)
        .where(eq(bookingPayments.bookingId, bookingId));

      if (bpRows[0]) {
        await tx
          .update(payments)
          .set({ paymentStatus: 'Refunded' })
          .where(eq(payments.paymentId, bpRows[0].paymentId));
      }

      return updatedBooking;
    });
  } catch (error: any) {
    if (
      error?.message === 'BOOKING_NOT_FOUND' ||
      error?.message === 'BOOKING_ALREADY_CANCELLED'
    ) {
      throw error;
    }
    console.error('Database transaction failed in cancelUserBooking:', error);
    throw new Error('Failed to cancel booking.', { cause: error });
  }
}
