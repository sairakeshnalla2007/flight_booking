import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
import { db, pool } from './index.ts';
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
  users,
} from './schema.ts';

dotenv.config();

async function seed() {
  console.log('🌱 Seeding FlyFlex database...\n');

  // Clear tables in reverse dependency order
  console.log('  Clearing existing data...');
  await db.delete(subscriptionPayments);
  await db.delete(bookingPayments);
  await db.delete(payments);
  await db.delete(bookingSeats);
  await db.delete(bookings);
  await db.delete(lastMinuteOffers);
  await db.delete(flightSeats);
  await db.delete(flights);
  await db.delete(userSubscriptions);
  await db.delete(subscriptions);
  await db.delete(airports);
  await db.delete(airlines);
  await db.delete(users);

  // Reset sequences
  await db.execute(sql`ALTER SEQUENCE users_user_id_seq RESTART WITH 101`);
  await db.execute(sql`ALTER SEQUENCE subscriptions_subscription_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE user_subscriptions_user_subscription_id_seq RESTART WITH 1001`);
  await db.execute(sql`ALTER SEQUENCE airlines_airline_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE airports_airport_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE flights_flight_id_seq RESTART WITH 201`);
  await db.execute(sql`ALTER SEQUENCE flight_seats_flight_seat_id_seq RESTART WITH 301`);
  await db.execute(sql`ALTER SEQUENCE last_minute_offers_offer_id_seq RESTART WITH 401`);
  await db.execute(sql`ALTER SEQUENCE bookings_booking_id_seq RESTART WITH 501`);
  await db.execute(sql`ALTER SEQUENCE booking_seats_booking_seat_id_seq RESTART WITH 601`);
  await db.execute(sql`ALTER SEQUENCE payments_payment_id_seq RESTART WITH 701`);

  // 1. Users
  console.log('  Inserting users...');
  await db.insert(users).values([
    { uid: 'ravi@gmail.com', name: 'Ravi', email: 'ravi@gmail.com', phone: '9876543210', passwordHash: 'password123' },
    { uid: 'priya@gmail.com', name: 'Priya', email: 'priya@gmail.com', phone: '9876543211', passwordHash: 'password123' },
    { uid: 'arjun@gmail.com', name: 'Arjun', email: 'arjun@gmail.com', phone: '9876543212', passwordHash: 'password123' },
  ]);

  // 2. Subscription Plans
  console.log('  Inserting subscription plans...');
  await db.insert(subscriptions).values([
    { planName: 'Basic', amount: '199.00', durationDays: 30 },
    { planName: 'Premium', amount: '399.00', durationDays: 30 },
    { planName: 'Gold', amount: '699.00', durationDays: 90 },
  ]);

  // 3. User Subscriptions
  console.log('  Inserting user subscriptions...');
  await db.insert(userSubscriptions).values([
    { userId: 101, subscriptionId: 2, startDate: '2026-11-01', endDate: '2026-12-01', status: 'Active' },
    { userId: 102, subscriptionId: 1, startDate: '2026-11-05', endDate: '2026-12-05', status: 'Active' },
    { userId: 103, subscriptionId: 3, startDate: '2026-11-10', endDate: '2027-02-08', status: 'Active' },
  ]);

  // 4. Airlines
  console.log('  Inserting airlines...');
  await db.insert(airlines).values([
    { airlineName: 'Air India', airlineCode: 'AI' },
    { airlineName: 'IndiGo', airlineCode: '6E' },
    { airlineName: 'SpiceJet', airlineCode: 'SG' },
  ]);

  // 5. Airports
  console.log('  Inserting airports...');
  await db.insert(airports).values([
    { airportName: 'Rajiv Gandhi International Airport', city: 'Hyderabad', airportCode: 'HYD' },
    { airportName: 'Chennai International Airport', city: 'Chennai', airportCode: 'MAA' },
    { airportName: 'Kempegowda International Airport', city: 'Bengaluru', airportCode: 'BLR' },
    { airportName: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', airportCode: 'BOM' },
  ]);

  // 6. Flights
  console.log('  Inserting flights...');
  await db.insert(flights).values([
    {
      airlineId: 1, departureAirportId: 1, arrivalAirportId: 2,
      flightNumber: 'AI101',
      departureTime: new Date('2026-11-25T08:00:00Z'),
      arrivalTime: new Date('2026-11-25T09:30:00Z'),
    },
    {
      airlineId: 2, departureAirportId: 2, arrivalAirportId: 3,
      flightNumber: '6E202',
      departureTime: new Date('2026-11-26T10:00:00Z'),
      arrivalTime: new Date('2026-11-26T11:15:00Z'),
    },
    {
      airlineId: 3, departureAirportId: 3, arrivalAirportId: 1,
      flightNumber: 'SG303',
      departureTime: new Date('2026-11-27T14:00:00Z'),
      arrivalTime: new Date('2026-11-27T15:30:00Z'),
    },
    {
      airlineId: 1, departureAirportId: 1, arrivalAirportId: 4,
      flightNumber: 'AI404',
      departureTime: new Date('2026-11-28T17:30:00Z'),
      arrivalTime: new Date('2026-11-28T19:00:00Z'),
    },
  ]);

  // 7. Flight Seats
  console.log('  Inserting flight seats...');
  await db.insert(flightSeats).values([
    // AI101 (flight 201)
    { flightId: 201, seatNumber: '1A', seatClass: 'Business', price: '9000.00', status: 'Available' },
    { flightId: 201, seatNumber: '1B', seatClass: 'Business', price: '9000.00', status: 'Available' },
    { flightId: 201, seatNumber: '12A', seatClass: 'Economy', price: '5000.00', status: 'Booked' },
    { flightId: 201, seatNumber: '12B', seatClass: 'Economy', price: '5000.00', status: 'Booked' },
    { flightId: 201, seatNumber: '12C', seatClass: 'Economy', price: '5000.00', status: 'Available' },
    { flightId: 201, seatNumber: '14A', seatClass: 'Economy', price: '4800.00', status: 'Available' },
    // 6E202 (flight 202)
    { flightId: 202, seatNumber: '2A', seatClass: 'Business', price: '7500.00', status: 'Available' },
    { flightId: 202, seatNumber: '15A', seatClass: 'Economy', price: '4000.00', status: 'Booked' },
    { flightId: 202, seatNumber: '15B', seatClass: 'Economy', price: '4000.00', status: 'Available' },
    { flightId: 202, seatNumber: '15C', seatClass: 'Economy', price: '4000.00', status: 'Available' },
    // SG303 (flight 203)
    { flightId: 203, seatNumber: '3A', seatClass: 'Business', price: '8200.00', status: 'Available' },
    { flightId: 203, seatNumber: '10A', seatClass: 'Economy', price: '4500.00', status: 'Held' },
    { flightId: 203, seatNumber: '10B', seatClass: 'Economy', price: '4500.00', status: 'Available' },
    { flightId: 203, seatNumber: '10C', seatClass: 'Economy', price: '4500.00', status: 'Available' },
    // AI404 (flight 204)
    { flightId: 204, seatNumber: '1C', seatClass: 'Business', price: '10200.00', status: 'Available' },
    { flightId: 204, seatNumber: '8A', seatClass: 'Economy', price: '5400.00', status: 'Available' },
    { flightId: 204, seatNumber: '8B', seatClass: 'Economy', price: '5400.00', status: 'Available' },
  ]);

  // 8. Last-Minute Offers
  console.log('  Inserting last-minute offers...');
  await db.insert(lastMinuteOffers).values([
    { flightId: 201, subscriptionId: 1, offerPrice: '4800.00', validUntil: new Date('2026-11-24T23:59:00Z'), availableSeats: 5 },
    { flightId: 201, subscriptionId: 2, offerPrice: '4500.00', validUntil: new Date('2026-11-24T23:59:00Z'), availableSeats: 8 },
    { flightId: 202, subscriptionId: 3, offerPrice: '3500.00', validUntil: new Date('2026-11-25T23:59:00Z'), availableSeats: 10 },
    { flightId: 203, subscriptionId: 2, offerPrice: '4100.00', validUntil: new Date('2026-11-26T23:59:00Z'), availableSeats: 6 },
    { flightId: 204, subscriptionId: 3, offerPrice: '4700.00', validUntil: new Date('2026-11-27T23:59:00Z'), availableSeats: 4 },
  ]);

  // 9. Bookings
  console.log('  Inserting bookings...');
  await db.insert(bookings).values([
    { userId: 101, flightId: 201, bookingDate: new Date('2026-11-18T10:00:00Z'), bookingStatus: 'Confirmed', totalAmount: '10000.00' },
    { userId: 102, flightId: 202, bookingDate: new Date('2026-11-18T11:00:00Z'), bookingStatus: 'Confirmed', totalAmount: '4000.00' },
    { userId: 103, flightId: 203, bookingDate: new Date('2026-11-18T12:00:00Z'), bookingStatus: 'Pending', totalAmount: '4500.00' },
  ]);

  // 10. Booking Seats
  console.log('  Inserting booking seats...');
  await db.insert(bookingSeats).values([
    { bookingId: 501, flightSeatId: 303 },
    { bookingId: 501, flightSeatId: 304 },
    { bookingId: 502, flightSeatId: 308 },
    { bookingId: 503, flightSeatId: 312 },
  ]);

  // 11. Payments
  console.log('  Inserting payments...');
  await db.insert(payments).values([
    { amount: '10000.00', paymentDate: new Date('2026-11-18T10:05:00Z'), paymentStatus: 'Success', paymentMethod: 'UPI', transactionReference: 'TXN-BK-20261118-501' },
    { amount: '4000.00', paymentDate: new Date('2026-11-18T11:05:00Z'), paymentStatus: 'Success', paymentMethod: 'Card', transactionReference: 'TXN-BK-20261118-502' },
    { amount: '4500.00', paymentDate: new Date('2026-11-18T12:05:00Z'), paymentStatus: 'Pending', paymentMethod: 'Net Banking', transactionReference: 'TXN-BK-20261118-503' },
    { amount: '399.00', paymentDate: new Date('2026-11-01T09:00:00Z'), paymentStatus: 'Success', paymentMethod: 'UPI', transactionReference: 'TXN-SUB-20261101-1001' },
    { amount: '199.00', paymentDate: new Date('2026-11-05T09:00:00Z'), paymentStatus: 'Success', paymentMethod: 'Card', transactionReference: 'TXN-SUB-20261105-1002' },
  ]);

  // 12. Booking Payments (3NF subtype)
  console.log('  Inserting booking payments...');
  await db.insert(bookingPayments).values([
    { paymentId: 701, bookingId: 501 },
    { paymentId: 702, bookingId: 502 },
    { paymentId: 703, bookingId: 503 },
  ]);

  // 13. Subscription Payments (3NF subtype)
  console.log('  Inserting subscription payments...');
  await db.insert(subscriptionPayments).values([
    { paymentId: 704, userSubscriptionId: 1001 },
    { paymentId: 705, userSubscriptionId: 1002 },
  ]);

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📋 Sample Login Credentials:');
  console.log('   Email: ravi@gmail.com    Password: password123');
  console.log('   Email: priya@gmail.com   Password: password123');
  console.log('   Email: arjun@gmail.com   Password: password123\n');

  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
