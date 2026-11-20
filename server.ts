import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import session from 'express-session';
import { createServer as createViteServer } from 'vite';
import { getOrCreateUser, getUserByEmail, getUserById } from './src/db/users.ts';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';
import type { PaymentMethod } from './src/lib/types.ts';
import { getUserAnalytics } from './src/services/analyticsService.ts';
import {
  cancelUserBooking,
  confirmPendingBooking,
  createBooking,
  listUserBookings,
  listUserPaymentLedger,
} from './src/services/bookingService.ts';
import {
  listActiveOffers,
  listAirlinesAndAirports,
  listFlightsWithDetails,
} from './src/services/flightService.ts';
import {
  getUserActiveSubscription,
  listSubscriptionPlans,
  listUserSubscriptionHistory,
  purchaseSubscription,
  updateSubscriptionStatus,
} from './src/services/subscriptionService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

declare module 'express-session' {
  interface SessionData {
    userId: number;
    userEmail: string;
    userName: string;
  }
}

const ALLOWED_PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Card',
  'Net Banking',
];

function isValidPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    typeof value === 'string' &&
    ALLOWED_PAYMENT_METHODS.includes(value as PaymentMethod)
  );
}

async function createApp() {
  const app = express();
  app.use(express.json());

  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'flyflex_secret_key_2026',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // ─── Auth Routes ───────────────────────────────────────────────────

  // Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required.' });
      }

      const existing = await getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
      }

      const user = await getOrCreateUser(email, name, password);
      req.session.userId = user.userId;
      req.session.userEmail = user.email;
      req.session.userName = user.name;

      res.status(201).json({
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error: any) {
      console.error('POST /api/auth/register failed:', error);
      res.status(500).json({ error: error?.message || 'Registration failed.' });
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Simple password check (demo — not production-grade)
      if (user.passwordHash && user.passwordHash !== password) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      req.session.userId = user.userId;
      req.session.userEmail = user.email;
      req.session.userName = user.name;

      res.json({
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error: any) {
      console.error('POST /api/auth/login failed:', error);
      res.status(500).json({ error: error?.message || 'Login failed.' });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed.' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully.' });
    });
  });

  // Session check
  app.get('/api/auth/me', (req, res) => {
    if (req.session.userId) {
      res.json({
        user: {
          userId: req.session.userId,
          email: req.session.userEmail,
          name: req.session.userName,
        },
      });
    } else {
      res.status(401).json({ error: 'Not logged in.' });
    }
  });

  // ─── Public Health ─────────────────────────────────────────────────

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // ─── Protected API Routes ─────────────────────────────────────────

  // Current user profile & active subscription
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await getUserById(req.userId!);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      const activeSubscription = await getUserActiveSubscription(user.userId);
      res.json({
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
        activeSubscription,
      });
    } catch (error: any) {
      console.error('GET /api/me failed:', error);
      res.status(500).json({ error: error?.message || 'Failed to load profile' });
    }
  });

  // Flights, seat inventory, airlines, airports
  app.get('/api/flights', requireAuth, async (req: AuthRequest, res) => {
    try {
      const departureCode =
        typeof req.query.from === 'string' && req.query.from
          ? req.query.from.toUpperCase()
          : undefined;
      const arrivalCode =
        typeof req.query.to === 'string' && req.query.to
          ? req.query.to.toUpperCase()
          : undefined;
      const search =
        typeof req.query.q === 'string' ? req.query.q : undefined;

      const [flights, reference] = await Promise.all([
        listFlightsWithDetails({ departureCode, arrivalCode, search }),
        listAirlinesAndAirports(),
      ]);

      res.json({
        flights,
        airlines: reference.airlines,
        airports: reference.airports,
      });
    } catch (error: any) {
      console.error('GET /api/flights failed:', error);
      res.status(500).json({ error: error?.message || 'Failed to load flights' });
    }
  });

  // Last-minute subscriber offers
  app.get('/api/offers', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const offers = await listActiveOffers();
      res.json({ offers });
    } catch (error: any) {
      console.error('GET /api/offers failed:', error);
      res.status(500).json({ error: error?.message || 'Failed to load offers' });
    }
  });

  // Subscription plans & user subscription history
  app.get('/api/subscriptions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const [plans, activeSubscription, history] = await Promise.all([
        listSubscriptionPlans(),
        getUserActiveSubscription(userId),
        listUserSubscriptionHistory(userId),
      ]);
      res.json({ plans, activeSubscription, history });
    } catch (error: any) {
      console.error('GET /api/subscriptions failed:', error);
      res.status(500).json({ error: error?.message || 'Failed to load subscriptions' });
    }
  });

  // Purchase or upgrade subscription plan atomically
  app.post('/api/subscriptions/purchase', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const subscriptionId = Number(req.body?.subscriptionId);
      const paymentMethod = req.body?.paymentMethod;

      if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) {
        return res.status(400).json({ error: 'Valid subscriptionId is required.' });
      }
      if (!isValidPaymentMethod(paymentMethod)) {
        return res.status(400).json({ error: 'paymentMethod must be one of UPI, Card, or Net Banking.' });
      }

      const subscription = await purchaseSubscription({
        userId,
        subscriptionId,
        paymentMethod,
      });

      res.status(201).json({ subscription });
    } catch (error: any) {
      if (error?.message === 'SUBSCRIPTION_NOT_FOUND') {
        return res.status(404).json({ error: 'Requested subscription plan not found.' });
      }
      console.error('POST /api/subscriptions/purchase failed:', error);
      res.status(500).json({ error: error?.message || 'Failed to purchase subscription' });
    }
  });

  // Update user subscription status
  app.patch('/api/subscriptions/:id/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const id = Number(req.params.id);
      const status = req.body?.status;

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Valid userSubscriptionId is required.' });
      }
      if (status !== 'Expired' && status !== 'Cancelled') {
        return res.status(400).json({ error: 'status must be Expired or Cancelled.' });
      }

      const updated = await updateSubscriptionStatus(id, userId, status);
      if (!updated) {
        return res.status(404).json({ error: 'Subscription not found.' });
      }
      res.json({ subscription: updated });
    } catch (error: any) {
      console.error('PATCH /api/subscriptions/:id/status failed:', error);
      res.status(500).json({ error: error?.message || 'Failed to update subscription' });
    }
  });

  // User bookings & split payment ledger
  app.get('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const [bookings, payments] = await Promise.all([
        listUserBookings(userId),
        listUserPaymentLedger(userId),
      ]);
      res.json({ bookings, payments });
    } catch (error: any) {
      console.error('GET /api/bookings failed:', error);
      res.status(500).json({ error: error?.message || 'Failed to load bookings' });
    }
  });

  // Create atomic flight booking with SELECT ... FOR UPDATE seat locking
  app.post('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const flightId = Number(req.body?.flightId);
      const seatIdsRaw = req.body?.seatIds;
      const paymentMethod = req.body?.paymentMethod;
      const holdOnly = Boolean(req.body?.holdOnly);

      if (!Number.isInteger(flightId) || flightId <= 0) {
        return res.status(400).json({ error: 'Valid flightId is required.' });
      }
      if (
        !Array.isArray(seatIdsRaw) ||
        seatIdsRaw.length === 0 ||
        !seatIdsRaw.every((id) => Number.isInteger(Number(id)) && Number(id) > 0)
      ) {
        return res.status(400).json({ error: 'At least one valid seatId must be selected.' });
      }
      if (!isValidPaymentMethod(paymentMethod)) {
        return res.status(400).json({ error: 'paymentMethod must be one of UPI, Card, or Net Banking.' });
      }

      const uniqueSeatIds = Array.from(new Set(seatIdsRaw.map((id) => Number(id))));

      const booking = await createBooking({
        userId,
        flightId,
        seatIds: uniqueSeatIds,
        paymentMethod,
        holdOnly,
      });

      res.status(201).json({ booking });
    } catch (error: any) {
      if (error?.message === 'NO_SEATS_SELECTED') {
        return res.status(400).json({ error: 'No seats selected.' });
      }
      if (error?.message === 'SEAT_NOT_FOUND') {
        return res.status(404).json({ error: 'One or more requested seats do not exist on this flight.' });
      }
      if (typeof error?.message === 'string' && error.message.startsWith('SEAT_UNAVAILABLE:')) {
        const seats = error.message.split(':')[1] || '';
        return res.status(409).json({ error: `Selected seat(s) ${seats} are no longer available.` });
      }
      console.error('POST /api/bookings failed:', error);
      res.status(500).json({ error: error?.message || 'Failed to create booking' });
    }
  });

  // Confirm a pending/held booking
  app.post('/api/bookings/:id/confirm', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const bookingId = Number(req.params.id);
      const paymentMethod = req.body?.paymentMethod;

      if (!Number.isInteger(bookingId) || bookingId <= 0) {
        return res.status(400).json({ error: 'Valid bookingId is required.' });
      }
      if (paymentMethod !== undefined && !isValidPaymentMethod(paymentMethod)) {
        return res.status(400).json({ error: 'paymentMethod must be one of UPI, Card, or Net Banking.' });
      }

      const booking = await confirmPendingBooking(bookingId, userId, paymentMethod);
      res.json({ booking });
    } catch (error: any) {
      if (error?.message === 'BOOKING_NOT_FOUND') {
        return res.status(404).json({ error: 'Booking not found.' });
      }
      if (error?.message === 'BOOKING_NOT_PENDING') {
        return res.status(409).json({ error: 'Only pending bookings can be confirmed.' });
      }
      console.error('POST /api/bookings/:id/confirm failed:', error);
      res.status(500).json({ error: error?.message || 'Failed to confirm booking' });
    }
  });

  // Cancel booking & release seats
  app.post('/api/bookings/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const bookingId = Number(req.params.id);
      if (!Number.isInteger(bookingId) || bookingId <= 0) {
        return res.status(400).json({ error: 'Valid bookingId is required.' });
      }

      const booking = await cancelUserBooking(bookingId, userId);
      res.json({ booking });
    } catch (error: any) {
      if (error?.message === 'BOOKING_NOT_FOUND') {
        return res.status(404).json({ error: 'Booking not found.' });
      }
      if (error?.message === 'BOOKING_ALREADY_CANCELLED') {
        return res.status(409).json({ error: 'Booking is already cancelled.' });
      }
      console.error('POST /api/bookings/:id/cancel failed:', error);
      res.status(500).json({ error: error?.message || 'Failed to cancel booking' });
    }
  });

  // Platform analytics & SQL aggregations
  app.get('/api/analytics', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const analytics = await getUserAnalytics(userId);
      res.json({ analytics });
    } catch (error: any) {
      console.error('GET /api/analytics failed:', error);
      res.status(500).json({ error: error?.message || 'Failed to load analytics' });
    }
  });

  // ─── Vite / Static Serving ─────────────────────────────────────────

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`\n  ✈  FlyFlex server running at http://localhost:${port}\n`);
  });
}

createApp().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
