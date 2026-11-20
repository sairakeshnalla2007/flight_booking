import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db/index.ts';
import {
  airlines,
  airports,
  flightSeats,
  flights,
  lastMinuteOffers,
  subscriptions,
} from '../db/schema.ts';
import type { FlightSummary, LastMinuteOffer } from '../lib/types.ts';

export async function listAirlinesAndAirports() {
  try {
    const [airlineRows, airportRows] = await Promise.all([
      db.select().from(airlines).orderBy(asc(airlines.airlineName)),
      db.select().from(airports).orderBy(asc(airports.city)),
    ]);
    return { airlines: airlineRows, airports: airportRows };
  } catch (error) {
    console.error('Database query failed in listAirlinesAndAirports:', error);
    throw new Error('Failed to load airlines and airports.', { cause: error });
  }
}

export interface FlightFilterOptions {
  departureCode?: string;
  arrivalCode?: string;
  search?: string;
}

export async function listFlightsWithDetails(
  filters: FlightFilterOptions = {}
): Promise<FlightSummary[]> {
  try {
    const depAirport = alias(airports, 'dep_airport');
    const arrAirport = alias(airports, 'arr_airport');

    const conditions = [];
    if (filters.departureCode) {
      conditions.push(eq(depAirport.airportCode, filters.departureCode));
    }
    if (filters.arrivalCode) {
      conditions.push(eq(arrAirport.airportCode, filters.arrivalCode));
    }

    const flightRows = await db
      .select({
        flightId: flights.flightId,
        flightNumber: flights.flightNumber,
        departureTime: flights.departureTime,
        arrivalTime: flights.arrivalTime,
        airlineId: airlines.airlineId,
        airlineName: airlines.airlineName,
        airlineCode: airlines.airlineCode,
        depId: depAirport.airportId,
        depName: depAirport.airportName,
        depCity: depAirport.city,
        depCode: depAirport.airportCode,
        arrId: arrAirport.airportId,
        arrName: arrAirport.airportName,
        arrCity: arrAirport.city,
        arrCode: arrAirport.airportCode,
      })
      .from(flights)
      .innerJoin(airlines, eq(flights.airlineId, airlines.airlineId))
      .innerJoin(
        depAirport,
        eq(flights.departureAirportId, depAirport.airportId)
      )
      .innerJoin(arrAirport, eq(flights.arrivalAirportId, arrAirport.airportId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(flights.departureTime));

    const [seatRows, offerRows] = await Promise.all([
      db
        .select()
        .from(flightSeats)
        .orderBy(asc(flightSeats.flightId), asc(flightSeats.seatNumber)),
      db
        .select({
          offerId: lastMinuteOffers.offerId,
          flightId: lastMinuteOffers.flightId,
          subscriptionId: lastMinuteOffers.subscriptionId,
          planName: subscriptions.planName,
          offerPrice: lastMinuteOffers.offerPrice,
          validUntil: lastMinuteOffers.validUntil,
          availableSeats: lastMinuteOffers.availableSeats,
        })
        .from(lastMinuteOffers)
        .innerJoin(
          subscriptions,
          eq(lastMinuteOffers.subscriptionId, subscriptions.subscriptionId)
        )
        .where(gte(lastMinuteOffers.availableSeats, 0)),
    ]);

    const searchLower = filters.search?.trim().toLowerCase() ?? '';

    const mapped: FlightSummary[] = flightRows
      .filter((row) => {
        if (!searchLower) return true;
        return (
          row.flightNumber.toLowerCase().includes(searchLower) ||
          row.airlineName.toLowerCase().includes(searchLower) ||
          row.depCity.toLowerCase().includes(searchLower) ||
          row.arrCity.toLowerCase().includes(searchLower) ||
          row.depCode.toLowerCase().includes(searchLower) ||
          row.arrCode.toLowerCase().includes(searchLower)
        );
      })
      .map((row) => {
        const seats = seatRows
          .filter((s) => s.flightId === row.flightId)
          .map((s) => ({
            flightSeatId: s.flightSeatId,
            flightId: s.flightId,
            seatNumber: s.seatNumber,
            seatClass: s.seatClass,
            price: Number(s.price),
            status: s.status,
          }));

        const offers: LastMinuteOffer[] = offerRows
          .filter((o) => o.flightId === row.flightId)
          .map((o) => ({
            offerId: o.offerId,
            flightId: o.flightId,
            subscriptionId: o.subscriptionId,
            planName: o.planName,
            flightNumber: row.flightNumber,
            airlineName: row.airlineName,
            departureCode: row.depCode,
            arrivalCode: row.arrCode,
            departureTime: row.departureTime.toISOString(),
            offerPrice: Number(o.offerPrice),
            validUntil: o.validUntil.toISOString(),
            availableSeats: o.availableSeats,
          }));

        const availableSeats = seats.filter((s) => s.status === 'Available');
        const minPrice =
          availableSeats.length > 0
            ? Math.min(...availableSeats.map((s) => s.price))
            : seats.length > 0
              ? Math.min(...seats.map((s) => s.price))
              : 0;

        return {
          flightId: row.flightId,
          flightNumber: row.flightNumber,
          departureTime: row.departureTime.toISOString(),
          arrivalTime: row.arrivalTime.toISOString(),
          airline: {
            airlineId: row.airlineId,
            airlineName: row.airlineName,
            airlineCode: row.airlineCode,
          },
          departureAirport: {
            airportId: row.depId,
            airportName: row.depName,
            city: row.depCity,
            airportCode: row.depCode,
          },
          arrivalAirport: {
            airportId: row.arrId,
            airportName: row.arrName,
            city: row.arrCity,
            airportCode: row.arrCode,
          },
          seats,
          offers,
          availableSeatCount: availableSeats.length,
          minPrice,
        };
      });

    return mapped;
  } catch (error) {
    console.error('Database query failed in listFlightsWithDetails:', error);
    throw new Error('Failed to load flights and seat inventory.', {
      cause: error,
    });
  }
}

export async function listActiveOffers(): Promise<LastMinuteOffer[]> {
  try {
    const depAirport = alias(airports, 'dep_airport');
    const arrAirport = alias(airports, 'arr_airport');

    const rows = await db
      .select({
        offerId: lastMinuteOffers.offerId,
        flightId: lastMinuteOffers.flightId,
        subscriptionId: lastMinuteOffers.subscriptionId,
        planName: subscriptions.planName,
        flightNumber: flights.flightNumber,
        airlineName: airlines.airlineName,
        departureCode: depAirport.airportCode,
        arrivalCode: arrAirport.airportCode,
        departureTime: flights.departureTime,
        offerPrice: lastMinuteOffers.offerPrice,
        validUntil: lastMinuteOffers.validUntil,
        availableSeats: lastMinuteOffers.availableSeats,
      })
      .from(lastMinuteOffers)
      .innerJoin(
        subscriptions,
        eq(lastMinuteOffers.subscriptionId, subscriptions.subscriptionId)
      )
      .innerJoin(flights, eq(lastMinuteOffers.flightId, flights.flightId))
      .innerJoin(airlines, eq(flights.airlineId, airlines.airlineId))
      .innerJoin(
        depAirport,
        eq(flights.departureAirportId, depAirport.airportId)
      )
      .innerJoin(arrAirport, eq(flights.arrivalAirportId, arrAirport.airportId))
      .orderBy(asc(lastMinuteOffers.validUntil));

    return rows.map((r) => ({
      offerId: r.offerId,
      flightId: r.flightId,
      subscriptionId: r.subscriptionId,
      planName: r.planName,
      flightNumber: r.flightNumber,
      airlineName: r.airlineName,
      departureCode: r.departureCode,
      arrivalCode: r.arrivalCode,
      departureTime: r.departureTime.toISOString(),
      offerPrice: Number(r.offerPrice),
      validUntil: r.validUntil.toISOString(),
      availableSeats: r.availableSeats,
    }));
  } catch (error) {
    console.error('Database query failed in listActiveOffers:', error);
    throw new Error('Failed to load last-minute offers.', { cause: error });
  }
}

export async function getFlightSeatSummaryByFlight() {
  try {
    const rows = await db
      .select({
        flightId: flights.flightId,
        flightNumber: flights.flightNumber,
        availableSeats: sql<number>`count(*) filter (where ${flightSeats.status} = 'Available')::int`,
        totalSeats: sql<number>`count(${flightSeats.flightSeatId})::int`,
      })
      .from(flights)
      .leftJoin(flightSeats, eq(flights.flightId, flightSeats.flightId))
      .groupBy(flights.flightId, flights.flightNumber)
      .orderBy(asc(flights.flightId));

    return rows;
  } catch (error) {
    console.error(
      'Database query failed in getFlightSeatSummaryByFlight:',
      error
    );
    throw new Error('Failed to summarize seat availability.', { cause: error });
  }
}
