import React, { useCallback, useEffect, useState } from 'react';
import {
  CreditCard,
  Database,
  LogIn,
  LogOut,
  Menu,
  Plane,
  Ticket,
  UserPlus,
  X,
} from 'lucide-react';
import { BookingsLedgerWorkspace } from './components/BookingsLedgerWorkspace';
import { FlightsWorkspace } from './components/FlightsWorkspace';
import { SchemaArchitectureWorkspace } from './components/SchemaArchitectureWorkspace';
import { SubscriptionsWorkspace } from './components/SubscriptionsWorkspace';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  SEED_ACTIVE_SUBSCRIPTION,
  SEED_AIRPORTS,
  SEED_ANALYTICS,
  SEED_BOOKINGS,
  SEED_FLIGHTS,
  SEED_OFFERS,
  SEED_PAYMENTS,
  SEED_SUBSCRIPTIONS,
} from './data/seedCatalog';
import { apiFetch } from './lib/apiClient';
import {
  calculateBookingPricing,
  calculateSubscriptionEndDate,
  categorizeBookingAmount,
  isOfferActiveAndEligible,
} from './lib/bookingRules';
import type {
  Airport,
  BookingDetail,
  FlightSummary,
  LastMinuteOffer,
  PaymentLedgerEntry,
  PaymentMethod,
  PlatformAnalytics,
  SubscriptionPlan,
  UserSubscription,
} from './lib/types';

type WorkspaceTab = 'flights' | 'subscriptions' | 'bookings' | 'architecture';

const NAV_ITEMS: Array<{
  id: WorkspaceTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'flights', label: 'Flights & Seat Map', icon: Plane },
  { id: 'subscriptions', label: 'Subscriptions & Offers', icon: Ticket },
  { id: 'bookings', label: 'Bookings & Ledger', icon: CreditCard },
  { id: 'architecture', label: 'Database Architecture', icon: Database },
];

function computeLocalAnalytics(
  bookings: BookingDetail[],
  flights: FlightSummary[]
): PlatformAnalytics {
  const active = bookings.filter((b) => b.bookingStatus !== 'Cancelled');
  const confirmedRevenue = active
    .filter((b) => b.bookingStatus === 'Confirmed')
    .reduce((sum, b) => sum + b.totalAmount, 0);
  const amounts = active.map((b) => b.totalAmount);
  const averageBookingAmount =
    amounts.length > 0
      ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length)
      : 0;
  const highestBookingAmount = amounts.length > 0 ? Math.max(...amounts) : 0;

  const categoryBreakdown = { High: 0, Medium: 0, Low: 0 };
  for (const b of active) {
    categoryBreakdown[categorizeBookingAmount(b.totalAmount)] += 1;
  }

  const flightSeatAvailability = flights.map((f) => ({
    flightId: f.flightId,
    flightNumber: f.flightNumber,
    availableSeats: f.seats.filter((s) => s.status === 'Available').length,
    totalSeats: f.seats.length,
  }));

  return {
    totalBookingsCount: active.length,
    confirmedRevenue,
    averageBookingAmount,
    highestBookingAmount,
    availableSeatsTotal: flightSeatAvailability.reduce(
      (sum, f) => sum + f.availableSeats,
      0
    ),
    categoryBreakdown,
    paymentMethodBreakdown: SEED_ANALYTICS.paymentMethodBreakdown,
    flightSeatAvailability,
  };
}

// ─── Auth Form Component ─────────────────────────────────────────────

function AuthForm() {
  const { login, register, authError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <Plane className="w-8 h-8 text-blue-700" />
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              FlyFlex
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Flight Subscription & Booking Platform
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setLocalError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setLocalError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="block text-xs font-medium text-slate-600 mb-1.5">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ravi Kumar"
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-slate-600 mb-1.5">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ravi@gmail.com"
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-slate-600 mb-1.5">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>

            {(localError || authError) && (
              <p
                role="alert"
                className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
              >
                {localError || authError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 px-4 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                'Please wait...'
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-5 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-2 font-medium">
              Demo Login Credentials:
            </p>
            <div className="grid grid-cols-1 gap-1.5 text-xs font-mono text-slate-600">
              <div className="flex justify-between bg-slate-50 px-3 py-1.5 rounded">
                <span>ravi@gmail.com</span>
                <span className="text-slate-400">password123</span>
              </div>
              <div className="flex justify-between bg-slate-50 px-3 py-1.5 rounded">
                <span>priya@gmail.com</span>
                <span className="text-slate-400">password123</span>
              </div>
              <div className="flex justify-between bg-slate-50 px-3 py-1.5 rounded">
                <span>arjun@gmail.com</span>
                <span className="text-slate-400">password123</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          FlyFlex DBMS Project · PostgreSQL 3NF · Drizzle ORM
        </p>
      </div>
    </div>
  );
}

// ─── Main App Shell ──────────────────────────────────────────────────

function FlyFlexShell() {
  const { user, authLoading, authError, logout, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('flights');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [flights, setFlights] = useState<FlightSummary[]>(SEED_FLIGHTS);
  const [airports, setAirports] = useState<Airport[]>(SEED_AIRPORTS);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(SEED_SUBSCRIPTIONS);
  const [activeSubscription, setActiveSubscription] =
    useState<UserSubscription | null>(SEED_ACTIVE_SUBSCRIPTION);
  const [subscriptionHistory, setSubscriptionHistory] = useState<
    UserSubscription[]
  >([SEED_ACTIVE_SUBSCRIPTION]);
  const [offers, setOffers] = useState<LastMinuteOffer[]>(SEED_OFFERS);
  const [bookings, setBookings] = useState<BookingDetail[]>(SEED_BOOKINGS);
  const [payments, setPayments] =
    useState<PaymentLedgerEntry[]>(SEED_PAYMENTS);
  const [analytics, setAnalytics] = useState<PlatformAnalytics>(SEED_ANALYTICS);

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadLivePlatformData = useCallback(async () => {
    if (!isAuthenticated) return;

    setDataLoading(true);
    setDataError(null);
    try {
      const [meRes, flightsRes, subsRes, offersRes, bookingsRes, analyticsRes] =
        await Promise.all([
          apiFetch<{ activeSubscription: UserSubscription | null }>('/api/me'),
          apiFetch<{ flights: FlightSummary[]; airports: Airport[] }>('/api/flights'),
          apiFetch<{
            plans: SubscriptionPlan[];
            activeSubscription: UserSubscription | null;
            history: UserSubscription[];
          }>('/api/subscriptions'),
          apiFetch<{ offers: LastMinuteOffer[] }>('/api/offers'),
          apiFetch<{
            bookings: BookingDetail[];
            payments: PaymentLedgerEntry[];
          }>('/api/bookings'),
          apiFetch<{ analytics: PlatformAnalytics }>('/api/analytics'),
        ]);

      setFlights(flightsRes.flights);
      setAirports(flightsRes.airports);
      setPlans(subsRes.plans);
      setActiveSubscription(
        subsRes.activeSubscription ?? meRes.activeSubscription
      );
      setSubscriptionHistory(subsRes.history);
      setOffers(offersRes.offers);
      setBookings(bookingsRes.bookings);
      setPayments(bookingsRes.payments);
      setAnalytics(analyticsRes.analytics);
    } catch (err: any) {
      setDataError(
        err?.message || 'Unable to load your live account records.'
      );
    } finally {
      setDataLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadLivePlatformData();
    } else {
      setFlights(SEED_FLIGHTS);
      setAirports(SEED_AIRPORTS);
      setPlans(SEED_SUBSCRIPTIONS);
      setActiveSubscription(SEED_ACTIVE_SUBSCRIPTION);
      setSubscriptionHistory([SEED_ACTIVE_SUBSCRIPTION]);
      setOffers(SEED_OFFERS);
      setBookings(SEED_BOOKINGS);
      setPayments(SEED_PAYMENTS);
      setAnalytics(SEED_ANALYTICS);
      setDataError(null);
    }
  }, [isAuthenticated, loadLivePlatformData]);

  const handleBookSeats = async (params: {
    flightId: number;
    seatIds: number[];
    paymentMethod: PaymentMethod;
    holdOnly: boolean;
  }) => {
    setIsSubmitting(true);
    try {
      if (isAuthenticated) {
        await apiFetch('/api/bookings', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        await loadLivePlatformData();
      } else {
        const targetFlight = flights.find(
          (f) => f.flightId === params.flightId
        );
        if (!targetFlight) throw new Error('Flight not found.');

        const chosenSeats = targetFlight.seats.filter((s) =>
          params.seatIds.includes(s.flightSeatId)
        );
        if (chosenSeats.some((s) => s.status !== 'Available')) {
          throw new Error('One or more selected seats are not available.');
        }

        const now = new Date('2026-11-20T06:00:00Z');
        const subId = activeSubscription?.subscriptionId ?? null;
        const eligibleOffer =
          targetFlight.offers.find((o) =>
            isOfferActiveAndEligible(o, subId, now)
          ) ?? null;

        const pricing = calculateBookingPricing(
          chosenSeats,
          eligibleOffer,
          subId,
          now
        );

        const nextSeatStatus = params.holdOnly ? 'Held' : 'Booked';
        const nextBookingId =
          bookings.reduce((max, b) => Math.max(max, b.bookingId), 500) + 1;
        const nextPaymentId =
          payments.reduce((max, p) => Math.max(max, p.paymentId), 700) + 1;
        const txnRef = `TXN-BK-${Date.now()}-${nextBookingId}`;

        const updatedFlights = flights.map((f) => {
          if (f.flightId !== params.flightId) return f;
          const updatedSeats = f.seats.map((s) =>
            params.seatIds.includes(s.flightSeatId)
              ? { ...s, status: nextSeatStatus }
              : s
          );
          return {
            ...f,
            seats: updatedSeats,
            availableSeatCount: updatedSeats.filter(
              (s) => s.status === 'Available'
            ).length,
          };
        });

        const newBooking: BookingDetail = {
          bookingId: nextBookingId,
          userId: 101,
          flightId: targetFlight.flightId,
          flightNumber: targetFlight.flightNumber,
          airlineName: targetFlight.airline.airlineName,
          airlineCode: targetFlight.airline.airlineCode,
          departureCode: targetFlight.departureAirport.airportCode,
          departureCity: targetFlight.departureAirport.city,
          arrivalCode: targetFlight.arrivalAirport.airportCode,
          arrivalCity: targetFlight.arrivalAirport.city,
          departureTime: targetFlight.departureTime,
          bookingDate: new Date().toISOString(),
          bookingStatus: params.holdOnly ? 'Pending' : 'Confirmed',
          totalAmount: pricing.effectiveTotal,
          category: categorizeBookingAmount(pricing.effectiveTotal),
          seats: chosenSeats.map((s) => ({
            flightSeatId: s.flightSeatId,
            seatNumber: s.seatNumber,
            seatClass: s.seatClass,
            price: s.price,
          })),
          payment: {
            paymentId: nextPaymentId,
            amount: pricing.effectiveTotal,
            paymentDate: new Date().toISOString(),
            paymentStatus: params.holdOnly ? 'Pending' : 'Success',
            paymentMethod: params.paymentMethod,
            transactionReference: txnRef,
          },
        };

        const newPayment: PaymentLedgerEntry = {
          paymentId: nextPaymentId,
          paymentType: 'Booking Payment',
          referenceLabel: `Booking #${nextBookingId} · ${targetFlight.flightNumber}`,
          amount: pricing.effectiveTotal,
          paymentDate: new Date().toISOString(),
          paymentStatus: params.holdOnly ? 'Pending' : 'Success',
          paymentMethod: params.paymentMethod,
          transactionReference: txnRef,
        };

        const nextBookings = [newBooking, ...bookings];
        setFlights(updatedFlights);
        setBookings(nextBookings);
        setPayments([newPayment, ...payments]);
        setAnalytics(computeLocalAnalytics(nextBookings, updatedFlights));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmBooking = async (bookingId: number) => {
    setIsSubmitting(true);
    try {
      if (isAuthenticated) {
        await apiFetch(`/api/bookings/${bookingId}/confirm`, {
          method: 'POST',
          body: JSON.stringify({}),
        });
        await loadLivePlatformData();
      } else {
        const target = bookings.find((b) => b.bookingId === bookingId);
        if (!target) throw new Error('Booking not found.');
        const seatIds = target.seats.map((s) => s.flightSeatId);

        const updatedFlights = flights.map((f) => {
          if (f.flightId !== target.flightId) return f;
          const updatedSeats = f.seats.map((s) =>
            seatIds.includes(s.flightSeatId) ? { ...s, status: 'Booked' } : s
          );
          return {
            ...f,
            seats: updatedSeats,
            availableSeatCount: updatedSeats.filter(
              (s) => s.status === 'Available'
            ).length,
          };
        });

        const nextBookings = bookings.map((b) =>
          b.bookingId === bookingId
            ? {
                ...b,
                bookingStatus: 'Confirmed',
                payment: b.payment
                  ? { ...b.payment, paymentStatus: 'Success' }
                  : null,
              }
            : b
        );
        const nextPayments = payments.map((p) =>
          target.payment && p.paymentId === target.payment.paymentId
            ? { ...p, paymentStatus: 'Success' }
            : p
        );

        setFlights(updatedFlights);
        setBookings(nextBookings);
        setPayments(nextPayments);
        setAnalytics(computeLocalAnalytics(nextBookings, updatedFlights));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    setIsSubmitting(true);
    try {
      if (isAuthenticated) {
        await apiFetch(`/api/bookings/${bookingId}/cancel`, {
          method: 'POST',
          body: JSON.stringify({}),
        });
        await loadLivePlatformData();
      } else {
        const target = bookings.find((b) => b.bookingId === bookingId);
        if (!target) throw new Error('Booking not found.');
        const seatIds = target.seats.map((s) => s.flightSeatId);

        const updatedFlights = flights.map((f) => {
          if (f.flightId !== target.flightId) return f;
          const updatedSeats = f.seats.map((s) =>
            seatIds.includes(s.flightSeatId)
              ? { ...s, status: 'Available' }
              : s
          );
          return {
            ...f,
            seats: updatedSeats,
            availableSeatCount: updatedSeats.filter(
              (s) => s.status === 'Available'
            ).length,
          };
        });

        const nextBookings = bookings.map((b) =>
          b.bookingId === bookingId
            ? {
                ...b,
                bookingStatus: 'Cancelled',
                payment: b.payment
                  ? { ...b.payment, paymentStatus: 'Refunded' }
                  : null,
              }
            : b
        );
        const nextPayments = payments.map((p) =>
          target.payment && p.paymentId === target.payment.paymentId
            ? { ...p, paymentStatus: 'Refunded' }
            : p
        );

        setFlights(updatedFlights);
        setBookings(nextBookings);
        setPayments(nextPayments);
        setAnalytics(computeLocalAnalytics(nextBookings, updatedFlights));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePurchasePlan = async (params: {
    subscriptionId: number;
    paymentMethod: PaymentMethod;
  }) => {
    setIsSubmitting(true);
    try {
      if (isAuthenticated) {
        await apiFetch('/api/subscriptions/purchase', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        await loadLivePlatformData();
      } else {
        const plan = plans.find(
          (p) => p.subscriptionId === params.subscriptionId
        );
        if (!plan) throw new Error('Plan not found.');
        const startDate = new Date().toISOString().slice(0, 10);
        const endDate = calculateSubscriptionEndDate(
          startDate,
          plan.durationDays
        );
        const nextSubId =
          subscriptionHistory.reduce(
            (max, s) => Math.max(max, s.userSubscriptionId),
            1000
          ) + 1;
        const nextPaymentId =
          payments.reduce((max, p) => Math.max(max, p.paymentId), 700) + 1;

        const newSub: UserSubscription = {
          userSubscriptionId: nextSubId,
          userId: 101,
          subscriptionId: plan.subscriptionId,
          planName: plan.planName,
          planAmount: plan.amount,
          durationDays: plan.durationDays,
          startDate,
          endDate,
          status: 'Active',
        };

        const expiredHistory = subscriptionHistory.map((item) =>
          item.status === 'Active' ? { ...item, status: 'Expired' } : item
        );

        const newPayment: PaymentLedgerEntry = {
          paymentId: nextPaymentId,
          paymentType: 'Subscription Payment',
          referenceLabel: `${plan.planName} Plan (#${nextSubId})`,
          amount: plan.amount,
          paymentDate: new Date().toISOString(),
          paymentStatus: 'Success',
          paymentMethod: params.paymentMethod,
          transactionReference: `TXN-SUB-${Date.now()}-${nextSubId}`,
        };

        setActiveSubscription(newSub);
        setSubscriptionHistory([newSub, ...expiredHistory]);
        setPayments([newPayment, ...payments]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubscriptionStatus = async (
    userSubscriptionId: number,
    status: 'Expired' | 'Cancelled'
  ) => {
    setIsSubmitting(true);
    try {
      if (isAuthenticated) {
        await apiFetch(`/api/subscriptions/${userSubscriptionId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
        await loadLivePlatformData();
      } else {
        setActiveSubscription(null);
        setSubscriptionHistory((prev) =>
          prev.map((item) =>
            item.userSubscriptionId === userSubscriptionId
              ? { ...item, status }
              : item
          )
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // If not authenticated, show the auth form
  if (!isAuthenticated && !authLoading) {
    return <AuthForm />;
  }

  const activeNavItem =
    NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 shrink-0">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('flights');
            }}
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
          >
            <Plane className="w-5 h-5 text-blue-700" />
            FlyFlex
          </a>
        </div>

        <nav aria-label="Workspace Sections" className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs space-y-1">
          <div className="text-slate-500">Active Tier</div>
          <div className="font-semibold text-slate-900">
            {activeSubscription
              ? `${activeSubscription.planName} Pass`
              : 'Standard Traveler'}
          </div>
          {activeSubscription && (
            <div className="font-mono text-slate-500 tabular-nums">
              Until {activeSubscription.endDate}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-50 w-64 bg-white h-full border-r border-slate-200 flex flex-col">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Plane className="w-5 h-5 text-blue-700" />
                FlyFlex
              </span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-600 hover:text-slate-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav aria-label="Mobile Navigation" className="p-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-slate-500 hidden sm:inline">FlyFlex</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-semibold text-slate-900 truncate">
                {activeNavItem.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {authLoading ? (
              <span className="text-xs text-slate-500">
                Checking session...
              </span>
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-xs font-medium text-slate-700 truncate max-w-[180px]">
                  {user.name} ({user.email})
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="h-9 px-3.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-4">
          {authError && (
            <div
              role="alert"
              className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3"
            >
              {authError}
            </div>
          )}

          {dataError && (
            <div
              role="alert"
              className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4"
            >
              <span>{dataError}</span>
              <button
                type="button"
                onClick={loadLivePlatformData}
                className="font-semibold underline whitespace-nowrap"
              >
                Retry
              </button>
            </div>
          )}

          {dataLoading ? (
            <div className="space-y-4" aria-busy="true">
              <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
              <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              {activeTab === 'flights' && (
                <FlightsWorkspace
                  flights={flights}
                  airports={airports}
                  plans={plans}
                  activeSubscription={activeSubscription}
                  isAuthenticated={isAuthenticated}
                  isSubmitting={isSubmitting}
                  onBookSeats={handleBookSeats}
                />
              )}
              {activeTab === 'subscriptions' && (
                <SubscriptionsWorkspace
                  plans={plans}
                  activeSubscription={activeSubscription}
                  subscriptionHistory={subscriptionHistory}
                  offers={offers}
                  isSubmitting={isSubmitting}
                  onPurchasePlan={handlePurchasePlan}
                  onUpdateStatus={handleUpdateSubscriptionStatus}
                />
              )}
              {activeTab === 'bookings' && (
                <BookingsLedgerWorkspace
                  bookings={bookings}
                  payments={payments}
                  analytics={analytics}
                  isSubmitting={isSubmitting}
                  onConfirmBooking={handleConfirmBooking}
                  onCancelBooking={handleCancelBooking}
                />
              )}
              {activeTab === 'architecture' && <SchemaArchitectureWorkspace />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FlyFlexShell />
    </AuthProvider>
  );
}
