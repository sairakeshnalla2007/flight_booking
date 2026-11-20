import React, { useState } from 'react';
import { Database, GitBranch, Key, Layers } from 'lucide-react';
import { SCHEMA_ENTITIES } from '../data/seedCatalog';

const NORMALIZATION_STAGES = [
  {
    stage: 'UNF (Unnormalized)',
    problem:
      'Repeating multi-valued Seat_Numbers ("12A, 12B") stored in a single cell alongside User_Name and Flight_Number.',
    resolution:
      'Identify non-atomic attributes and prepare to decompose repeating groups into atomic rows.',
  },
  {
    stage: '1NF (First Normal Form)',
    problem:
      'Repeating seat values split into one row per seat, creating a composite key (Booking_ID, Seat_Number) with duplicated booking headers.',
    resolution:
      'Every column holds atomic values and every row is uniquely identifiable.',
  },
  {
    stage: '2NF (Second Normal Form)',
    problem:
      'Partial dependency: User_Name, Flight_Number, and Payment_Amount depend only on Booking_ID, not on Seat_Number.',
    resolution:
      'Decompose into bookings (Booking_ID PK) and booking_seats (booking_id FK, flight_seat_id FK) to eliminate partial dependencies.',
  },
  {
    stage: '3NF (Third Normal Form & Subtype Specialization)',
    problem:
      'Transitive dependencies (flight_id -> airline_id -> airline_name) and nullable foreign keys in a single monolithic payments table.',
    resolution:
      'Extract airlines and airports into separate reference entities, and split payments into booking_payments and subscription_payments subtypes.',
  },
];

const API_ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/auth/register',
    description: 'Creates a new user account in PostgreSQL users table with hashed password, starts a session.',
  },
  {
    method: 'POST',
    path: '/api/auth/login',
    description: 'Authenticates user against stored credentials and creates a server-side session cookie.',
  },
  {
    method: 'GET',
    path: '/api/auth/me',
    description: 'Returns the currently logged-in user from the session cookie, or 401 if not authenticated.',
  },
  {
    method: 'GET',
    path: '/api/me',
    description: 'Returns user profile from PostgreSQL and their active subscription (session-authenticated).',
  },
  {
    method: 'GET',
    path: '/api/flights',
    description: 'Joins flights, airlines, departure/arrival airports, seat map, and last-minute offers.',
  },
  {
    method: 'POST',
    path: '/api/bookings',
    description: 'Executes SELECT ... FOR UPDATE row locking on flight_seats, computes subscriber pricing, and writes bookings + booking_seats + payments + booking_payments.',
  },
  {
    method: 'POST',
    path: '/api/bookings/:id/confirm',
    description: 'Transitions Pending booking, Held seats, and Pending payment to Confirmed / Booked / Success atomically.',
  },
  {
    method: 'POST',
    path: '/api/bookings/:id/cancel',
    description: 'Cancels booking, releases seats back to Available, and marks payment Refunded.',
  },
  {
    method: 'POST',
    path: '/api/subscriptions/purchase',
    description: 'Expires previous active pass, inserts user_subscriptions, and records payment via subscription_payments.',
  },
  {
    method: 'GET',
    path: '/api/analytics',
    description: 'Runs SQL aggregations (COUNT, SUM, AVG, MAX, CASE categorization) for bookings and seat availability.',
  },
];

export function SchemaArchitectureWorkspace() {
  const [selectedTable, setSelectedTable] = useState<string>(
    SCHEMA_ENTITIES[0].tableName
  );

  const activeEntity =
    SCHEMA_ENTITIES.find((e) => e.tableName === selectedTable) ??
    SCHEMA_ENTITIES[0];

  return (
    <div className="space-y-6">
      {/* 3NF Normalization Progression */}
      <section
        aria-label="Database Normalization Progression"
        className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-700" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900">
            Step-by-Step 3NF Normalization Architecture
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {NORMALIZATION_STAGES.map((item) => (
            <div
              key={item.stage}
              className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2"
            >
              <div className="text-xs font-semibold text-blue-700">
                {item.stage}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {item.problem}
              </p>
              <p className="text-xs text-slate-900 font-medium leading-relaxed pt-1 border-t border-slate-200/70">
                {item.resolution}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 13-Table PostgreSQL Entity Explorer */}
      <section
        aria-label="PostgreSQL Entity Explorer"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-700" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-900">
                PostgreSQL Entities (13)
              </h3>
            </div>
          </div>
          <div className="divide-y divide-slate-200 max-h-[540px] overflow-y-auto">
            {SCHEMA_ENTITIES.map((entity) => {
              const isSelected = entity.tableName === activeEntity.tableName;
              return (
                <button
                  key={entity.tableName}
                  type="button"
                  onClick={() => setSelectedTable(entity.tableName)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    isSelected
                      ? 'bg-blue-50/80 text-blue-900'
                      : 'bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="font-mono text-xs font-semibold">
                    {entity.tableName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {entity.entityRole}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 font-mono">
                public.{activeEntity.tableName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeEntity.entityRole}
              </p>
            </div>
            <div className="text-xs font-mono text-slate-600">
              PK: <span className="text-slate-900 font-semibold">{activeEntity.primaryKey}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/70">
                  <th className="py-2.5 px-3">Column</th>
                  <th className="py-2.5 px-3">PostgreSQL Type</th>
                  <th className="py-2.5 px-3">Design &amp; Constraint Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {activeEntity.columns.map((col) => (
                  <tr key={col.name}>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {col.name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-blue-800 whitespace-nowrap">
                      {col.type}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{col.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-xs">
            <div>
              <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1.5">
                <GitBranch className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                Foreign Key Relationships
              </div>
              {activeEntity.foreignKeys.length > 0 ? (
                <ul className="space-y-1 font-mono text-slate-600">
                  {activeEntity.foreignKeys.map((fk) => (
                    <li key={fk}>{fk}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">Root reference entity (no outbound FKs).</p>
              )}
            </div>

            <div>
              <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1.5">
                <Key className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                B-Tree Indexes &amp; Unique Keys
              </div>
              <ul className="space-y-1 font-mono text-slate-600">
                {activeEntity.indexes.map((idx) => (
                  <li key={idx}>{idx}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* REST API Reference */}
      <section
        aria-label="Backend API Endpoints"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Backend API Architecture (Express + Drizzle ORM + Row Locking)
          </h2>
          <p className="text-xs text-slate-500">
            All database endpoints enforce session-based cookie authentication.
            Users register/login via /api/auth endpoints.
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {API_ENDPOINTS.map((ep) => (
            <div
              key={`${ep.method}-${ep.path}`}
              className="px-5 py-3.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-6"
            >
              <div className="md:w-80 shrink-0 flex items-center gap-2.5 font-mono text-xs">
                <span className={`font-semibold w-12 ${
                  ep.method === 'POST' ? 'text-emerald-700' :
                  ep.method === 'PATCH' ? 'text-amber-700' :
                  ep.method === 'GET' ? 'text-blue-700' : 'text-slate-700'
                }`}>
                  {ep.method}
                </span>
                <span className="text-slate-900 font-medium">{ep.path}</span>
              </div>
              <p className="text-xs text-slate-600">{ep.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
