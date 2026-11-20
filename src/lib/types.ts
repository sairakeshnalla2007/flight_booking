export type SeatStatus = 'Available' | 'Held' | 'Booked';
export type SeatClass = 'Economy' | 'Business';
export type BookingStatus = 'Pending' | 'Confirmed' | 'Cancelled';
export type PaymentStatus = 'Pending' | 'Success' | 'Failed' | 'Refunded';
export type PaymentMethod = 'UPI' | 'Card' | 'Net Banking';
export type SubscriptionStatus = 'Active' | 'Expired' | 'Cancelled';
export type BookingCategory = 'High' | 'Medium' | 'Low';

export interface Airport {
  airportId: number;
  airportName: string;
  city: string;
  airportCode: string;
}

export interface Airline {
  airlineId: number;
  airlineName: string;
  airlineCode: string;
}

export interface FlightSeat {
  flightSeatId: number;
  flightId: number;
  seatNumber: string;
  seatClass: SeatClass | string;
  price: number;
  status: SeatStatus | string;
}

export interface SubscriptionPlan {
  subscriptionId: number;
  planName: string;
  amount: number;
  durationDays: number;
}

export interface UserSubscription {
  userSubscriptionId: number;
  userId: number;
  subscriptionId: number;
  planName: string;
  planAmount: number;
  durationDays: number;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus | string;
}

export interface LastMinuteOffer {
  offerId: number;
  flightId: number;
  subscriptionId: number;
  planName: string;
  flightNumber: string;
  airlineName: string;
  departureCode: string;
  arrivalCode: string;
  departureTime: string;
  offerPrice: number;
  validUntil: string;
  availableSeats: number;
}

export interface FlightSummary {
  flightId: number;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  airline: Airline;
  departureAirport: Airport;
  arrivalAirport: Airport;
  seats: FlightSeat[];
  offers: LastMinuteOffer[];
  availableSeatCount: number;
  minPrice: number;
}

export interface BookingDetail {
  bookingId: number;
  userId: number;
  flightId: number;
  flightNumber: string;
  airlineName: string;
  airlineCode: string;
  departureCode: string;
  departureCity: string;
  arrivalCode: string;
  arrivalCity: string;
  departureTime: string;
  bookingDate: string;
  bookingStatus: BookingStatus | string;
  totalAmount: number;
  category: BookingCategory;
  seats: Array<{
    flightSeatId: number;
    seatNumber: string;
    seatClass: string;
    price: number;
  }>;
  payment: {
    paymentId: number;
    amount: number;
    paymentDate: string;
    paymentStatus: PaymentStatus | string;
    paymentMethod: PaymentMethod | string;
    transactionReference: string;
  } | null;
}

export interface PaymentLedgerEntry {
  paymentId: number;
  paymentType: 'Booking Payment' | 'Subscription Payment';
  referenceLabel: string;
  amount: number;
  paymentDate: string;
  paymentStatus: PaymentStatus | string;
  paymentMethod: PaymentMethod | string;
  transactionReference: string;
}

export interface PlatformAnalytics {
  totalBookingsCount: number;
  confirmedRevenue: number;
  averageBookingAmount: number;
  highestBookingAmount: number;
  availableSeatsTotal: number;
  categoryBreakdown: Record<BookingCategory, number>;
  paymentMethodBreakdown: Array<{ method: string; count: number; total: number }>;
  flightSeatAvailability: Array<{
    flightId: number;
    flightNumber: string;
    availableSeats: number;
    totalSeats: number;
  }>;
}
