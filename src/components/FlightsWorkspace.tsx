import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, Lock, Plane, Search } from 'lucide-react';
import {
  calculateBookingPricing,
  formatCurrencyINR,
  isOfferActiveAndEligible,
} from '../lib/bookingRules';
import type {
  Airport,
  FlightSeat,
  FlightSummary,
  PaymentMethod,
  SubscriptionPlan,
  UserSubscription,
} from '../lib/types';

interface FlightsWorkspaceProps {
  flights: FlightSummary[];
  airports: Airport[];
  plans: SubscriptionPlan[];
  activeSubscription: UserSubscription | null;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  onBookSeats: (params: {
    flightId: number;
    seatIds: number[];
    paymentMethod: PaymentMethod;
    holdOnly: boolean;
  }) => Promise<void>;
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function FlightsWorkspace({
  flights,
  airports,
  plans,
  activeSubscription,
  isAuthenticated,
  isSubmitting,
  onBookSeats,
}: FlightsWorkspaceProps) {
  const [fromCode, setFromCode] = useState<string>('');
  const [toCode, setToCode] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFlightId, setSelectedFlightId] = useState<number>(
    flights[0]?.flightId ?? 201
  );
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [previewPlanId, setPreviewPlanId] = useState<number | null>(
    activeSubscription?.subscriptionId ?? null
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const effectiveSubscriptionId = isAuthenticated
    ? activeSubscription?.subscriptionId ?? null
    : previewPlanId;

  const filteredFlights = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return flights.filter((flight) => {
      if (fromCode && flight.departureAirport.airportCode !== fromCode) {
        return false;
      }
      if (toCode && flight.arrivalAirport.airportCode !== toCode) {
        return false;
      }
      if (!q) return true;
      return (
        flight.flightNumber.toLowerCase().includes(q) ||
        flight.airline.airlineName.toLowerCase().includes(q) ||
        flight.departureAirport.city.toLowerCase().includes(q) ||
        flight.arrivalAirport.city.toLowerCase().includes(q) ||
        flight.departureAirport.airportCode.toLowerCase().includes(q) ||
        flight.arrivalAirport.airportCode.toLowerCase().includes(q)
      );
    });
  }, [flights, fromCode, toCode, searchQuery]);

  const activeFlight = useMemo(() => {
    return (
      filteredFlights.find((f) => f.flightId === selectedFlightId) ??
      filteredFlights[0] ??
      null
    );
  }, [filteredFlights, selectedFlightId]);

  const selectedSeats: FlightSeat[] = useMemo(() => {
    if (!activeFlight) return [];
    return activeFlight.seats.filter((s) =>
      selectedSeatIds.includes(s.flightSeatId)
    );
  }, [activeFlight, selectedSeatIds]);

  const eligibleOffer = useMemo(() => {
    if (!activeFlight || effectiveSubscriptionId === null) return null;
    const now = new Date('2026-11-20T06:00:00Z');
    return (
      activeFlight.offers.find((o) =>
        isOfferActiveAndEligible(o, effectiveSubscriptionId, now)
      ) ?? null
    );
  }, [activeFlight, effectiveSubscriptionId]);

  const pricing = useMemo(() => {
    const now = new Date('2026-11-20T06:00:00Z');
    return calculateBookingPricing(
      selectedSeats,
      eligibleOffer,
      effectiveSubscriptionId,
      now
    );
  }, [selectedSeats, eligibleOffer, effectiveSubscriptionId]);

  const handleSelectFlight = (flightId: number) => {
    setSelectedFlightId(flightId);
    setSelectedSeatIds([]);
    setActionMessage(null);
    setActionError(null);
  };

  const toggleSeat = (seat: FlightSeat) => {
    if (seat.status !== 'Available') return;
    setActionMessage(null);
    setActionError(null);
    setSelectedSeatIds((prev) =>
      prev.includes(seat.flightSeatId)
        ? prev.filter((id) => id !== seat.flightSeatId)
        : [...prev, seat.flightSeatId]
    );
  };

  const handleBookingSubmit = async (holdOnly: boolean) => {
    if (!activeFlight || selectedSeatIds.length === 0) {
      setActionError('Select at least one available seat before continuing.');
      return;
    }
    setActionError(null);
    setActionMessage(null);
    try {
      await onBookSeats({
        flightId: activeFlight.flightId,
        seatIds: selectedSeatIds,
        paymentMethod,
        holdOnly,
      });
      setActionMessage(
        holdOnly
          ? `Held ${selectedSeatIds.length} seat(s) on ${activeFlight.flightNumber}. Complete payment in Bookings & Ledger.`
          : `Confirmed ${selectedSeatIds.length} seat(s) on ${activeFlight.flightNumber} for ${formatCurrencyINR(pricing.effectiveTotal)}.`
      );
      setSelectedSeatIds([]);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to complete seat reservation.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Route & Flight Filter Bar */}
      <section
        aria-label="Flight Search Filters"
        className="bg-white border border-slate-200 rounded-xl p-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label
              htmlFor="filter-from"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Departure Airport
            </label>
            <select
              id="filter-from"
              value={fromCode}
              onChange={(e) => {
                setFromCode(e.target.value);
                setSelectedSeatIds([]);
              }}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
            >
              <option value="">All Origins</option>
              {airports.map((ap) => (
                <option key={ap.airportId} value={ap.airportCode}>
                  {ap.city} ({ap.airportCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-to"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Arrival Airport
            </label>
            <select
              id="filter-to"
              value={toCode}
              onChange={(e) => {
                setToCode(e.target.value);
                setSelectedSeatIds([]);
              }}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
            >
              <option value="">All Destinations</option>
              {airports.map((ap) => (
                <option key={ap.airportId} value={ap.airportCode}>
                  {ap.city} ({ap.airportCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-search"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Flight or Carrier
            </label>
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="filter-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="AI101, IndiGo, HYD..."
                className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3">
            {(fromCode || toCode || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setFromCode('');
                  setToCode('');
                  setSearchQuery('');
                  setSelectedSeatIds([]);
                }}
                className="h-10 px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Reset Filters
              </button>
            )}
            <div className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
              {filteredFlights.length}{' '}
              {filteredFlights.length === 1 ? 'flight' : 'flights'} listed
            </div>
          </div>
        </div>
      </section>

      {/* Main Split: Flight Schedule + Interactive Seat Map & Reservation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Flight Schedule Table/List */}
        <section
          aria-label="Scheduled Flights"
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Scheduled Departures
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select a flight to inspect seat inventory and subscriber rates.
              </p>
            </div>
          </div>

          {filteredFlights.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-900">
                No flights match the selected route
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Clear your airport or keyword filters to view all scheduled
                departures.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredFlights.map((flight) => {
                const isSelected = activeFlight?.flightId === flight.flightId;
                const bestOffer = flight.offers.find(
                  (o) => o.subscriptionId === effectiveSubscriptionId
                );

                return (
                  <button
                    key={flight.flightId}
                    type="button"
                    onClick={() => handleSelectFlight(flight.flightId)}
                    aria-pressed={isSelected}
                    className={`w-full text-left px-5 py-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-blue-50/70'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-semibold text-slate-900">
                          {flight.flightNumber}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{flight.airline.airlineName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {formatDate(flight.departureTime)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
                        <span>
                          {flight.departureAirport.city} (
                          {flight.departureAirport.airportCode})
                        </span>
                        <ArrowRight
                          className="w-4 h-4 text-slate-400 shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          {flight.arrivalAirport.city} (
                          {flight.arrivalAirport.airportCode})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600 font-mono tabular-nums">
                        <span>
                          {formatTime(flight.departureTime)} –{' '}
                          {formatTime(flight.arrivalTime)} UTC
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {flight.availableSeatCount} of {flight.seats.length}{' '}
                          seats available
                        </span>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 space-y-1">
                      <div className="text-base font-semibold text-slate-900 font-mono tabular-nums">
                        {bestOffer
                          ? formatCurrencyINR(bestOffer.offerPrice)
                          : formatCurrencyINR(flight.minPrice)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {bestOffer ? (
                          <span className="text-emerald-700 font-medium">
                            {bestOffer.planName} Offer Active
                          </span>
                        ) : (
                          <span>Standard Base Fare</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Cabin Seat Map & Atomic Booking Checkout */}
        <section
          aria-label="Seat Map and Reservation"
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 space-y-3.5"
        >
          {activeFlight ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Plane className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                    <span className="font-mono font-medium text-slate-700">
                      {activeFlight.flightNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {activeFlight.departureAirport.airportCode} to{' '}
                      {activeFlight.arrivalAirport.airportCode}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-slate-900 mt-1">
                    Select Cabin Seats
                  </h2>
                </div>

                {!isAuthenticated && (
                  <div className="shrink-0">
                    <label htmlFor="preview-tier" className="sr-only">
                      Preview Subscription Tier
                    </label>
                    <select
                      id="preview-tier"
                      value={previewPlanId ?? ''}
                      onChange={(e) =>
                        setPreviewPlanId(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-700"
                    >
                      <option value="">No Pass (Standard)</option>
                      {plans.map((p) => (
                        <option key={p.subscriptionId} value={p.subscriptionId}>
                          {p.planName} Pass Preview
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Seat Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-white border border-slate-300" />
                  Available
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-blue-700" />
                  Selected
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-400" />
                  Held
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-slate-200" />
                  Booked
                </span>
              </div>

              {/* Seat Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {activeFlight.seats.map((seat) => {
                  const isChosen = selectedSeatIds.includes(seat.flightSeatId);
                  const isAvailable = seat.status === 'Available';
                  const isHeld = seat.status === 'Held';

                  return (
                    <button
                      key={seat.flightSeatId}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => toggleSeat(seat)}
                      aria-label={`Seat ${seat.seatNumber} ${seat.seatClass} ${seat.status}`}
                      className={`p-3 rounded-lg border text-left transition-colors flex items-center justify-between gap-2 ${
                        isChosen
                          ? 'bg-blue-700 border-blue-700 text-white'
                          : isAvailable
                            ? 'bg-white border-slate-200 hover:border-blue-700 text-slate-900'
                            : isHeld
                              ? 'bg-amber-50 border-amber-200 text-amber-900 cursor-not-allowed'
                              : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <div>
                        <div className="font-mono text-sm font-semibold tabular-nums">
                          {seat.seatNumber}
                        </div>
                        <div
                          className={`text-xs ${
                            isChosen
                              ? 'text-blue-100'
                              : isHeld
                                ? 'text-amber-700'
                                : 'text-slate-500'
                          }`}
                        >
                          {seat.seatClass} · {seat.status}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xs font-medium tabular-nums">
                          {formatCurrencyINR(seat.price)}
                        </div>
                        {isChosen && (
                          <Check className="w-3.5 h-3.5 ml-auto mt-0.5" aria-hidden="true" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Eligible Offer Notice */}
              {eligibleOffer && (
                <div className="px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="font-semibold">
                      {eligibleOffer.planName} Offer
                    </span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono tabular-nums">
                      {formatCurrencyINR(eligibleOffer.offerPrice)} / Economy
                    </span>
                  </div>
                  <span className="font-mono tabular-nums text-emerald-700 shrink-0">
                    {eligibleOffer.availableSeats} left
                  </span>
                </div>
              )}

              {/* Pricing Breakdown & Payment Method */}
              <div className="border-t border-slate-200 pt-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Selected Seats</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900">
                    {selectedSeats.length > 0
                      ? selectedSeats.map((s) => s.seatNumber).join(', ')
                      : 'None'}
                  </span>
                </div>
                {pricing.savings > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-700">
                    <span>Subscriber Offer Savings</span>
                    <span className="font-mono tabular-nums font-semibold">
                      −{formatCurrencyINR(pricing.savings)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                  <span>Total Payable</span>
                  <span className="font-mono tabular-nums text-base">
                    {formatCurrencyINR(pricing.effectiveTotal)}
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="booking-payment-method"
                    className="block text-xs font-medium text-slate-600 mb-1.5"
                  >
                    Payment Method
                  </label>
                  <select
                    id="booking-payment-method"
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as PaymentMethod)
                    }
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>
                </div>

                {actionError && (
                  <p
                    role="alert"
                    className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                  >
                    {actionError}
                  </p>
                )}
                {actionMessage && (
                  <p
                    role="status"
                    className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
                  >
                    {actionMessage}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    disabled={selectedSeatIds.length === 0 || isSubmitting}
                    onClick={() => handleBookingSubmit(true)}
                    className="h-10 px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Hold Seats
                  </button>
                  <button
                    type="button"
                    disabled={selectedSeatIds.length === 0 || isSubmitting}
                    onClick={() => handleBookingSubmit(false)}
                    className="h-10 px-4 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                  >
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    Reserve &amp; Pay
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Select a flight from the schedule to inspect seat availability.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
