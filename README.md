# flight_booking

An international flight booking website built with React, Express, and PostgreSQL.

## Run locally

Prerequisites: Node.js and PostgreSQL.

1. Install dependencies:
   ```sh
   npm install
   ```
2. Configure the database variables in `.env` using `.env.example` as a guide.
3. Create the database, then set up its schema and seed data:
   ```sh
   npm run db:setup
   ```
4. Start the development server:
   ```sh
   npm run dev
   ```

The app is available at `http://localhost:3000`.
