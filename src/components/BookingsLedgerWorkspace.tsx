import React, { useMemo, useState } from 'react';
import { formatCurrencyINR } from '../lib/bookingRules';
import type {
  BookingDetail,
  PaymentLedgerEntry,
  PlatformAnalytics,
} from '../lib/types';

interface BookingsLedgerWorkspaceProps {
  bookings: BookingDetail[];
  payments: PaymentLedgerEntry[];
  analytics: PlatformAnalytics;
  isSubmitting: boolean;
  onConfirmBooking: (bookingId: number) => Promise<void>;
  onCancelBooking: (bookingId: number) => Promise<void>;
}

export function BookingsLedgerWorkspace({
  bookings,
  payments,
  analytics,
  isSubmitting,
  onConfirmBooking,
  onCancelBooking,
}: BookingsLedgerWorkspaceProps) {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'ALL') return bookings;
    return bookings.filter((b) => b.bookingStatus === statusFilter);
  }, [bookings, statusFilter]);

  const filteredPayments = useMemo(() => {
    if (paymentTypeFilter === 'ALL') return payments;
    return payments.filter((p) => p.paymentType === paymentTypeFilter);
  }, [payments, paymentTypeFilter]);

  const handleConfirm = async (bookingId: number) => {
    setFeedback(null);
    setErrorMsg(null);
    try {
      await onConfirmBooking(bookingId);
      setFeedback(`Booking #${bookingId} confirmed and seat lock finalized.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to confirm booking.');
    }
  };

  const handleCancel = async (bookingId: number) => {
    setFeedback(null);
    setErrorMsg(null);
    try {
      await onCancelBooking(bookingId);
      setFeedback(
        `Booking #${bookingId} cancelled. Seats released back to Available inventory.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to cancel booking.');
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <section
        aria-label="Booking Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Active Bookings
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {analytics.totalBookingsCount}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            High {analytics.categoryBreakdown.High} · Med{' '}
            {analytics.categoryBreakdown.Medium} · Low{' '}
            {analytics.categoryBreakdown.Low}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Confirmed Spend
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {formatCurrencyINR(analytics.confirmedRevenue)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Settled flight reservations
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Average Booking Value
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {formatCurrencyINR(analytics.averageBookingAmount)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            Peak: {formatCurrencyINR(analytics.highestBookingAmount)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Available Seat Inventory
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {analytics.availableSeatsTotal}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {analytics.flightSeatAvailability.length} scheduled flights
          </div>
        </div>
      </section>

      {errorMsg && (
        <p
          role="alert"
          className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5"
        >
          {errorMsg}
        </p>
      )}
      {feedback && (
        <p
          role="status"
          className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5"
        >
          {feedback}
        </p>
      )}

      {/* Bookings Table */}
      <section
        aria-label="Flight Bookings"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Flight Bookings &amp; Seat Assignments
            </h2>
            <p className="text-xs text-slate-500">
              Categorized via SQL CASE thresholds (High ≥ ₹10,000, Medium ≥
              ₹5,000).
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter bookings by status"
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
          >
            {['ALL', 'Confirmed', 'Pending', 'Cancelled'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === status
                    ? 'bg-white text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status === 'ALL' ? 'All' : status}
              </button>
            ))}
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-900">
              No bookings in this status
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Reserve seats from Flights &amp; Seat Map to create a new
              booking.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-5">Booking</th>
                  <th className="py-3 px-5">Flight &amp; Route</th>
                  <th className="py-3 px-5">Seats</th>
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-5 text-right">Amount</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredBookings.map((booking) => (
                  <tr key={booking.bookingId} className="hover:bg-slate-50/70">
                    <td className="py-3 px-5 font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">
                        #{booking.bookingId}
                      </div>
                      <div className="text-slate-500">
                        {booking.bookingDate.slice(0, 10)}
                      </div>
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap">
                      <div className="font-medium text-slate-900">
                        <span className="font-mono">{booking.flightNumber}</span>{' '}
                        · {booking.airlineName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {booking.departureCode} → {booking.arrivalCode}
                      </div>
                    </td>
                    <td className="py-3 px-5 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {booking.seats
                        .map((s) => `${s.seatNumber} (${s.seatClass})`)
                        .join(', ')}
                    </td>
                    <td className="py-3 px-5 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {booking.category}
                    </td>
                    <td className="py-3 px-5 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {formatCurrencyINR(booking.totalAmount)}
                    </td>
                    <td className="py-3 px-5 text-xs font-medium whitespace-nowrap">
                      <span
                        className={
                          booking.bookingStatus === 'Confirmed'
                            ? 'text-emerald-700'
                            : booking.bookingStatus === 'Pending'
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }
                      >
                        {booking.bookingStatus}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {booking.bookingStatus === 'Pending' && (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleConfirm(booking.bookingId)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0"
                          >
                            Confirm Payment
                          </button>
                        )}
                        {booking.bookingStatus !== 'Cancelled' && (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleCancel(booking.bookingId)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Split Payment Ledger */}
      <section
        aria-label="Split Payment Ledger"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              3NF Split Payment Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Unified payments supertype specialized via booking_payments and
              subscription_payments.
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter payment ledger by type"
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
          >
            {['ALL', 'Booking Payment', 'Subscription Payment'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPaymentTypeFilter(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  paymentTypeFilter === type
                    ? 'bg-white text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type === 'ALL' ? 'All Entries' : type}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/70">
                <th className="py-3 px-5">Transaction Ref</th>
                <th className="py-3 px-5">Subtype</th>
                <th className="py-3 px-5">Reference</th>
                <th className="py-3 px-5">Method</th>
                <th className="py-3 px-5 text-right">Amount</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredPayments.map((payment) => (
                <tr key={payment.paymentId} className="hover:bg-slate-50/70">
                  <td className="py-3 px-5 font-mono text-xs text-slate-700 whitespace-nowrap">
                    {payment.transactionReference}
                  </td>
                  <td className="py-3 px-5 text-xs font-medium text-slate-900 whitespace-nowrap">
                    {payment.paymentType}
                  </td>
                  <td className="py-3 px-5 text-xs text-slate-600 whitespace-nowrap">
                    {payment.referenceLabel}
                  </td>
                  <td className="py-3 px-5 text-xs text-slate-700 whitespace-nowrap">
                    {payment.paymentMethod}
                  </td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                    {formatCurrencyINR(payment.amount)}
                  </td>
                  <td className="py-3 px-5 text-right text-xs font-medium whitespace-nowrap">
                    <span
                      className={
                        payment.paymentStatus === 'Success'
                          ? 'text-emerald-700'
                          : payment.paymentStatus === 'Pending'
                            ? 'text-amber-700'
                            : 'text-red-700'
                      }
                    >
                      {payment.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
