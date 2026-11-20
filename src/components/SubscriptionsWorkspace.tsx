import React, { useMemo, useState } from 'react';
import { Check, Tag } from 'lucide-react';
import { formatCurrencyINR } from '../lib/bookingRules';
import type {
  LastMinuteOffer,
  PaymentMethod,
  SubscriptionPlan,
  UserSubscription,
} from '../lib/types';

interface SubscriptionsWorkspaceProps {
  plans: SubscriptionPlan[];
  activeSubscription: UserSubscription | null;
  subscriptionHistory: UserSubscription[];
  offers: LastMinuteOffer[];
  isSubmitting: boolean;
  onPurchasePlan: (params: {
    subscriptionId: number;
    paymentMethod: PaymentMethod;
  }) => Promise<void>;
  onUpdateStatus: (
    userSubscriptionId: number,
    status: 'Expired' | 'Cancelled'
  ) => Promise<void>;
}

const PLAN_AUDIENCE: Record<string, { subtitle: string; limit: string }> = {
  Basic: {
    subtitle: 'For occasional flyers',
    limit: 'Unlocks Basic-tier last-minute Economy fares for 30 days',
  },
  Premium: {
    subtitle: 'For frequent regional travelers',
    limit: 'Unlocks deep last-minute discounts across primary corridors for 30 days',
  },
  Gold: {
    subtitle: 'For high-frequency commuters',
    limit: 'Extended 90-day pass with lowest fare caps across all routes',
  },
};

export function SubscriptionsWorkspace({
  plans,
  activeSubscription,
  subscriptionHistory,
  offers,
  isSubmitting,
  onPurchasePlan,
  onUpdateStatus,
}: SubscriptionsWorkspaceProps) {
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const filteredOffers = useMemo(() => {
    if (tierFilter === 'ALL') return offers;
    return offers.filter((o) => o.planName === tierFilter);
  }, [offers, tierFilter]);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    setStatusMessage(null);
    setStatusError(null);
    try {
      await onPurchasePlan({
        subscriptionId: plan.subscriptionId,
        paymentMethod,
      });
      setStatusMessage(
        `${plan.planName} pass activated via ${paymentMethod} for ${plan.durationDays} days.`
      );
    } catch (err: any) {
      setStatusError(err?.message || 'Failed to activate subscription plan.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Pass Banner */}
      <section
        aria-label="Active Membership"
        className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="text-xs font-medium text-slate-500">
            Active Membership Status
          </div>
          {activeSubscription ? (
            <>
              <div className="flex items-center gap-2.5 mt-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  {activeSubscription.planName} Pass
                </h2>
                <span className="text-xs font-medium text-emerald-700">
                  · {activeSubscription.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
                Valid {activeSubscription.startDate} to{' '}
                {activeSubscription.endDate} ·{' '}
                {formatCurrencyINR(activeSubscription.planAmount)} /{' '}
                {activeSubscription.durationDays} days
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mt-1">
                No Active Subscription
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose a tier below to unlock subscriber-only last-minute flight
                fares.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="sub-payment-method" className="sr-only">
              Subscription Payment Method
            </label>
            <select
              id="sub-payment-method"
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as PaymentMethod)
              }
              className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
            >
              <option value="UPI">Pay via UPI</option>
              <option value="Card">Pay via Card</option>
              <option value="Net Banking">Pay via Net Banking</option>
            </select>
          </div>

          {activeSubscription && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() =>
                onUpdateStatus(
                  activeSubscription.userSubscriptionId,
                  'Cancelled'
                )
              }
              className="h-10 px-4 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Cancel Pass
            </button>
          )}
        </div>
      </section>

      {statusError && (
        <p
          role="alert"
          className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5"
        >
          {statusError}
        </p>
      )}
      {statusMessage && (
        <p
          role="status"
          className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5"
        >
          {statusMessage}
        </p>
      )}

      {/* Plan Comparison Grid */}
      <section aria-label="Subscription Plans" className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const isCurrent =
            activeSubscription?.subscriptionId === plan.subscriptionId &&
            activeSubscription?.status === 'Active';
          const meta = PLAN_AUDIENCE[plan.planName] ?? {
            subtitle: 'Travel pass',
            limit: `${plan.durationDays} days validity`,
          };
          const matchingOfferCount = offers.filter(
            (o) => o.subscriptionId === plan.subscriptionId
          ).length;

          return (
            <div
              key={plan.subscriptionId}
              className={`bg-white border rounded-xl p-5 flex flex-col justify-between gap-5 ${
                isCurrent ? 'border-blue-700' : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    {meta.subtitle}
                  </span>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      Current Plan
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {plan.planName}
                  </h3>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                      {formatCurrencyINR(plan.amount)}
                    </span>
                    <span className="text-xs text-slate-500 font-mono tabular-nums">
                      / {plan.durationDays} days
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {meta.limit}
                </p>

                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                  <span>Active Last-Minute Offers</span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900">
                    {matchingOfferCount}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={isCurrent || isSubmitting}
                onClick={() => handleSubscribe(plan)}
                className={`h-10 px-4 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-500 cursor-default'
                    : 'bg-blue-700 hover:bg-blue-800 text-white'
                }`}
              >
                {isCurrent ? 'Active Tier' : `Activate ${plan.planName}`}
              </button>
            </div>
          );
        })}
      </section>

      {/* Last-Minute Offers Table */}
      <section
        aria-label="Last-Minute Flight Offers"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-700" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Eligible Last-Minute Offers
              </h2>
              <p className="text-xs text-slate-500">
                Tiered fares queried from last_minute_offers joined with
                flights and subscriptions.
              </p>
            </div>
          </div>

          <div
            role="group"
            aria-label="Filter offers by tier"
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
          >
            {['ALL', ...plans.map((p) => p.planName)].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setTierFilter(tier)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  tierFilter === tier
                    ? 'bg-white text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tier === 'ALL' ? 'All Tiers' : tier}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/70">
                <th className="py-3 px-5">Flight</th>
                <th className="py-3 px-5">Route</th>
                <th className="py-3 px-5">Required Plan</th>
                <th className="py-3 px-5 text-right">Offer Price</th>
                <th className="py-3 px-5 text-right">Seat Quota</th>
                <th className="py-3 px-5 text-right">Valid Until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredOffers.map((offer) => {
                const isEligibleForUser =
                  activeSubscription?.subscriptionId === offer.subscriptionId &&
                  activeSubscription?.status === 'Active';

                return (
                  <tr key={offer.offerId} className="hover:bg-slate-50/70">
                    <td className="py-3 px-5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {offer.flightNumber}
                      <span className="font-sans font-normal text-xs text-slate-500 ml-2">
                        {offer.airlineName}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-slate-700 font-mono text-xs whitespace-nowrap">
                      {offer.departureCode} → {offer.arrivalCode}
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap">
                      <span className="text-slate-900 font-medium">
                        {offer.planName}
                      </span>
                      {isEligibleForUser && (
                        <span className="ml-2 text-xs font-medium text-emerald-700">
                          · Eligible
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {formatCurrencyINR(offer.offerPrice)}
                    </td>
                    <td className="py-3 px-5 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {offer.availableSeats}
                    </td>
                    <td className="py-3 px-5 text-right font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                      {offer.validUntil.slice(0, 16).replace('T', ' ')} UTC
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Subscription History */}
      {subscriptionHistory.length > 0 && (
        <section
          aria-label="Membership History"
          className="bg-white border border-slate-200 rounded-xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Membership Cycle History
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-5">Pass ID</th>
                  <th className="py-3 px-5">Plan</th>
                  <th className="py-3 px-5">Start Date</th>
                  <th className="py-3 px-5">End Date</th>
                  <th className="py-3 px-5 text-right">Amount</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {subscriptionHistory.map((item) => (
                  <tr key={item.userSubscriptionId}>
                    <td className="py-3 px-5 font-mono tabular-nums text-xs text-slate-600">
                      #{item.userSubscriptionId}
                    </td>
                    <td className="py-3 px-5 font-medium text-slate-900">
                      {item.planName}
                    </td>
                    <td className="py-3 px-5 font-mono tabular-nums text-xs text-slate-600">
                      {item.startDate}
                    </td>
                    <td className="py-3 px-5 font-mono tabular-nums text-xs text-slate-600">
                      {item.endDate}
                    </td>
                    <td className="py-3 px-5 text-right font-mono tabular-nums text-slate-900">
                      {formatCurrencyINR(item.planAmount)}
                    </td>
                    <td className="py-3 px-5 text-right text-xs font-medium">
                      <span
                        className={
                          item.status === 'Active'
                            ? 'text-emerald-700'
                            : 'text-slate-500'
                        }
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
