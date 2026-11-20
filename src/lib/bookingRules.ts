import type {
  BookingCategory,
  FlightSeat,
  LastMinuteOffer,
  SeatStatus,
} from './types';

export function categorizeBookingAmount(amount: number): BookingCategory {
  if (amount >= 10000) return 'High';
  if (amount >= 5000) return 'Medium';
  return 'Low';
}

export function calculateSubscriptionEndDate(
  startDateIso: string,
  durationDays: number
): string {
  const [year, month, day] = startDateIso.split('-').map(Number);
  if (!year || !month || !day || durationDays <= 0) {
    throw new Error('Invalid subscription start date or duration.');
  }
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + durationDays);
  return utcDate.toISOString().slice(0, 10);
}

export function isOfferActiveAndEligible(
  offer: Pick<
    LastMinuteOffer,
    'subscriptionId' | 'availableSeats' | 'validUntil'
  >,
  activeSubscriptionId: number | null,
  now: Date = new Date()
): boolean {
  if (activeSubscriptionId === null) return false;
  if (offer.subscriptionId !== activeSubscriptionId) return false;
  if (offer.availableSeats <= 0) return false;
  const expiry = new Date(offer.validUntil);
  return !Number.isNaN(expiry.getTime()) && expiry.getTime() > now.getTime();
}

export interface PricingCalculationResult {
  standardTotal: number;
  effectiveTotal: number;
  savings: number;
  appliedOfferId: number | null;
  discountedSeatCount: number;
}

export function calculateBookingPricing(
  selectedSeats: Array<
    Pick<FlightSeat, 'flightSeatId' | 'seatClass' | 'price'>
  >,
  eligibleOffer: Pick<
    LastMinuteOffer,
    'offerId' | 'offerPrice' | 'availableSeats' | 'validUntil' | 'subscriptionId'
  > | null,
  activeSubscriptionId: number | null,
  now: Date = new Date()
): PricingCalculationResult {
  if (selectedSeats.length === 0) {
    return {
      standardTotal: 0,
      effectiveTotal: 0,
      savings: 0,
      appliedOfferId: null,
      discountedSeatCount: 0,
    };
  }

  const standardTotal = selectedSeats.reduce(
    (sum, seat) => sum + Number(seat.price),
    0
  );

  const offerEligible =
    eligibleOffer !== null &&
    isOfferActiveAndEligible(eligibleOffer, activeSubscriptionId, now) &&
    eligibleOffer.availableSeats >= selectedSeats.length;

  if (!offerEligible || !eligibleOffer) {
    return {
      standardTotal,
      effectiveTotal: standardTotal,
      savings: 0,
      appliedOfferId: null,
      discountedSeatCount: 0,
    };
  }

  let effectiveTotal = 0;
  let discountedSeatCount = 0;

  for (const seat of selectedSeats) {
    const basePrice = Number(seat.price);
    const offerPrice = Number(eligibleOffer.offerPrice);
    if (seat.seatClass === 'Economy' && offerPrice < basePrice) {
      effectiveTotal += offerPrice;
      discountedSeatCount += 1;
    } else {
      effectiveTotal += basePrice;
    }
  }

  const savings = Math.max(0, standardTotal - effectiveTotal);

  return {
    standardTotal,
    effectiveTotal,
    savings,
    appliedOfferId: discountedSeatCount > 0 ? eligibleOffer.offerId : null,
    discountedSeatCount,
  };
}

export function canTransitionSeatStatus(
  currentStatus: SeatStatus | string,
  targetStatus: SeatStatus
): boolean {
  if (currentStatus === targetStatus) return false;
  if (currentStatus === 'Available') {
    return targetStatus === 'Held' || targetStatus === 'Booked';
  }
  if (currentStatus === 'Held') {
    return targetStatus === 'Booked' || targetStatus === 'Available';
  }
  if (currentStatus === 'Booked') {
    return targetStatus === 'Available';
  }
  return false;
}

export function formatCurrencyINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
