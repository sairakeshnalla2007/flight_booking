import { relations } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

// 1. USER
export const users = pgTable('users', {
  userId: serial('user_id').primaryKey(),
  uid: text('uid').notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. SUBSCRIPTION
export const subscriptions = pgTable('subscriptions', {
  subscriptionId: serial('subscription_id').primaryKey(),
  planName: varchar('plan_name', { length: 50 }).notNull().unique(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  durationDays: integer('duration_days').notNull(),
});

// 3. USER_SUBSCRIPTION
export const userSubscriptions = pgTable(
  'user_subscriptions',
  {
    userSubscriptionId: serial('user_subscription_id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    subscriptionId: integer('subscription_id')
      .notNull()
      .references(() => subscriptions.subscriptionId),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('Active'),
  },
  (table) => [
    index('idx_user_subscription_user_status').on(table.userId, table.status),
  ]
);

// 4. AIRLINE
export const airlines = pgTable('airlines', {
  airlineId: serial('airline_id').primaryKey(),
  airlineName: varchar('airline_name', { length: 100 }).notNull(),
  airlineCode: varchar('airline_code', { length: 10 }).notNull().unique(),
});

// 5. AIRPORT
export const airports = pgTable('airports', {
  airportId: serial('airport_id').primaryKey(),
  airportName: varchar('airport_name', { length: 120 }).notNull(),
  city: varchar('city', { length: 50 }).notNull(),
  airportCode: varchar('airport_code', { length: 10 }).notNull().unique(),
});

// 6. FLIGHT
export const flights = pgTable(
  'flights',
  {
    flightId: serial('flight_id').primaryKey(),
    airlineId: integer('airline_id')
      .notNull()
      .references(() => airlines.airlineId),
    departureAirportId: integer('departure_airport_id')
      .notNull()
      .references(() => airports.airportId),
    arrivalAirportId: integer('arrival_airport_id')
      .notNull()
      .references(() => airports.airportId),
    flightNumber: varchar('flight_number', { length: 20 }).notNull(),
    departureTime: timestamp('departure_time').notNull(),
    arrivalTime: timestamp('arrival_time').notNull(),
  },
  (table) => [
    index('idx_flight_route_departure').on(
      table.departureAirportId,
      table.arrivalAirportId,
      table.departureTime
    ),
  ]
);

// 7. FLIGHT_SEAT
export const flightSeats = pgTable(
  'flight_seats',
  {
    flightSeatId: serial('flight_seat_id').primaryKey(),
    flightId: integer('flight_id')
      .notNull()
      .references(() => flights.flightId, { onDelete: 'cascade' }),
    seatNumber: varchar('seat_number', { length: 10 }).notNull(),
    seatClass: varchar('seat_class', { length: 20 }).notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('Available'),
  },
  (table) => [
    unique('uq_flight_seat_number').on(table.flightId, table.seatNumber),
    index('idx_flight_seat_status').on(table.flightId, table.status),
  ]
);

// 8. LAST_MINUTE_OFFER
export const lastMinuteOffers = pgTable(
  'last_minute_offers',
  {
    offerId: serial('offer_id').primaryKey(),
    flightId: integer('flight_id')
      .notNull()
      .references(() => flights.flightId, { onDelete: 'cascade' }),
    subscriptionId: integer('subscription_id')
      .notNull()
      .references(() => subscriptions.subscriptionId),
    offerPrice: numeric('offer_price', { precision: 10, scale: 2 }).notNull(),
    validUntil: timestamp('valid_until').notNull(),
    availableSeats: integer('available_seats').notNull(),
  },
  (table) => [
    unique('uq_offer_flight_subscription').on(
      table.flightId,
      table.subscriptionId
    ),
    index('idx_offer_valid_until').on(table.validUntil),
  ]
);

// 9. BOOKING
export const bookings = pgTable(
  'bookings',
  {
    bookingId: serial('booking_id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.userId),
    flightId: integer('flight_id')
      .notNull()
      .references(() => flights.flightId),
    bookingDate: timestamp('booking_date').defaultNow().notNull(),
    bookingStatus: varchar('booking_status', { length: 20 })
      .notNull()
      .default('Pending'),
    totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    index('idx_booking_user').on(table.userId),
    index('idx_booking_flight').on(table.flightId),
  ]
);

// 10. BOOKING_SEAT
export const bookingSeats = pgTable(
  'booking_seats',
  {
    bookingSeatId: serial('booking_seat_id').primaryKey(),
    bookingId: integer('booking_id')
      .notNull()
      .references(() => bookings.bookingId, { onDelete: 'cascade' }),
    flightSeatId: integer('flight_seat_id')
      .notNull()
      .references(() => flightSeats.flightSeatId),
  },
  (table) => [
    unique('uq_booking_flight_seat').on(table.bookingId, table.flightSeatId),
  ]
);

// 11. PAYMENT
export const payments = pgTable(
  'payments',
  {
    paymentId: serial('payment_id').primaryKey(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    paymentDate: timestamp('payment_date').defaultNow().notNull(),
    paymentStatus: varchar('payment_status', { length: 20 })
      .notNull()
      .default('Pending'),
    paymentMethod: varchar('payment_method', { length: 30 }).notNull(),
    transactionReference: varchar('transaction_reference', { length: 100 })
      .notNull()
      .unique(),
  },
  (table) => [index('idx_payment_status').on(table.paymentStatus)]
);

// 12. BOOKING_PAYMENT (3NF Payment Subtype for Flight Bookings)
export const bookingPayments = pgTable('booking_payments', {
  paymentId: integer('payment_id')
    .primaryKey()
    .references(() => payments.paymentId, { onDelete: 'cascade' }),
  bookingId: integer('booking_id')
    .notNull()
    .references(() => bookings.bookingId, { onDelete: 'cascade' }),
});

// 13. SUBSCRIPTION_PAYMENT (3NF Payment Subtype for Subscription Purchases)
export const subscriptionPayments = pgTable('subscription_payments', {
  paymentId: integer('payment_id')
    .primaryKey()
    .references(() => payments.paymentId, { onDelete: 'cascade' }),
  userSubscriptionId: integer('user_subscription_id')
    .notNull()
    .references(() => userSubscriptions.userSubscriptionId, {
      onDelete: 'cascade',
    }),
});

// Drizzle Relations
export const usersRelations = relations(users, ({ many }) => ({
  userSubscriptions: many(userSubscriptions),
  bookings: many(bookings),
}));

export const subscriptionsRelations = relations(subscriptions, ({ many }) => ({
  userSubscriptions: many(userSubscriptions),
  lastMinuteOffers: many(lastMinuteOffers),
}));

export const userSubscriptionsRelations = relations(
  userSubscriptions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [userSubscriptions.userId],
      references: [users.userId],
    }),
    subscription: one(subscriptions, {
      fields: [userSubscriptions.subscriptionId],
      references: [subscriptions.subscriptionId],
    }),
    subscriptionPayments: many(subscriptionPayments),
  })
);

export const airlinesRelations = relations(airlines, ({ many }) => ({
  flights: many(flights),
}));

export const airportsRelations = relations(airports, ({ many }) => ({
  departingFlights: many(flights, { relationName: 'departureAirport' }),
  arrivingFlights: many(flights, { relationName: 'arrivalAirport' }),
}));

export const flightsRelations = relations(flights, ({ one, many }) => ({
  airline: one(airlines, {
    fields: [flights.airlineId],
    references: [airlines.airlineId],
  }),
  departureAirport: one(airports, {
    fields: [flights.departureAirportId],
    references: [airports.airportId],
    relationName: 'departureAirport',
  }),
  arrivalAirport: one(airports, {
    fields: [flights.arrivalAirportId],
    references: [airports.airportId],
    relationName: 'arrivalAirport',
  }),
  seats: many(flightSeats),
  lastMinuteOffers: many(lastMinuteOffers),
  bookings: many(bookings),
}));

export const flightSeatsRelations = relations(flightSeats, ({ one, many }) => ({
  flight: one(flights, {
    fields: [flightSeats.flightId],
    references: [flights.flightId],
  }),
  bookingSeats: many(bookingSeats),
}));

export const lastMinuteOffersRelations = relations(
  lastMinuteOffers,
  ({ one }) => ({
    flight: one(flights, {
      fields: [lastMinuteOffers.flightId],
      references: [flights.flightId],
    }),
    subscription: one(subscriptions, {
      fields: [lastMinuteOffers.subscriptionId],
      references: [subscriptions.subscriptionId],
    }),
  })
);

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.userId],
  }),
  flight: one(flights, {
    fields: [bookings.flightId],
    references: [flights.flightId],
  }),
  bookingSeats: many(bookingSeats),
  bookingPayments: many(bookingPayments),
}));

export const bookingSeatsRelations = relations(bookingSeats, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingSeats.bookingId],
    references: [bookings.bookingId],
  }),
  flightSeat: one(flightSeats, {
    fields: [bookingSeats.flightSeatId],
    references: [flightSeats.flightSeatId],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  bookingPayment: one(bookingPayments, {
    fields: [payments.paymentId],
    references: [bookingPayments.paymentId],
  }),
  subscriptionPayment: one(subscriptionPayments, {
    fields: [payments.paymentId],
    references: [subscriptionPayments.paymentId],
  }),
}));

export const bookingPaymentsRelations = relations(
  bookingPayments,
  ({ one }) => ({
    payment: one(payments, {
      fields: [bookingPayments.paymentId],
      references: [payments.paymentId],
    }),
    booking: one(bookings, {
      fields: [bookingPayments.bookingId],
      references: [bookings.bookingId],
    }),
  })
);

export const subscriptionPaymentsRelations = relations(
  subscriptionPayments,
  ({ one }) => ({
    payment: one(payments, {
      fields: [subscriptionPayments.paymentId],
      references: [payments.paymentId],
    }),
    userSubscription: one(userSubscriptions, {
      fields: [subscriptionPayments.userSubscriptionId],
      references: [userSubscriptions.userSubscriptionId],
    }),
  })
);
