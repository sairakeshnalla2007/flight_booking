DROP DATABASE IF EXISTS Flight_Booking_DB;
CREATE DATABASE IF NOT EXISTS Flight_Booking_DB;

USE Flight_Booking_DB;

CREATE TABLE USER (
    user_id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(15),
    password VARCHAR(255)
);

CREATE TABLE SUBSCRIPTION (
    subscription_id INT PRIMARY KEY,
    plan_name VARCHAR(50),
    amount DECIMAL(10,2),
    duration_days INT
);

CREATE TABLE USER_SUBSCRIPTION (
    user_subscription_id INT PRIMARY KEY,
    user_id INT,
    subscription_id INT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20),

    FOREIGN KEY (user_id)
        REFERENCES USER(user_id),

    FOREIGN KEY (subscription_id)
        REFERENCES SUBSCRIPTION(subscription_id)
);

CREATE TABLE AIRLINE (

    airline_id INT PRIMARY KEY,

    airline_name VARCHAR(100),

    airline_code VARCHAR(10) UNIQUE

);

CREATE TABLE AIRPORT (
    airport_id INT PRIMARY KEY,
    airport_name VARCHAR(100),
    city VARCHAR(50),
    airport_code VARCHAR(10)
);

CREATE TABLE FLIGHT (
    flight_id INT PRIMARY KEY,
    airline_id INT,
    departure_airport_id INT,
    arrival_airport_id INT,
    departure_time DATETIME,
    arrival_time DATETIME,
    flight_number VARCHAR(20),

    FOREIGN KEY (airline_id)
        REFERENCES AIRLINE(airline_id),

    FOREIGN KEY (departure_airport_id)
        REFERENCES AIRPORT(airport_id),

    FOREIGN KEY (arrival_airport_id)
        REFERENCES AIRPORT(airport_id)
);

CREATE TABLE FLIGHT_SEAT (
    flight_seat_id INT PRIMARY KEY,
    flight_id INT,
    seat_number VARCHAR(10),
    class VARCHAR(20),
    price DECIMAL(10,2),
    status VARCHAR(20),

    FOREIGN KEY (flight_id)
        REFERENCES FLIGHT(flight_id),

    UNIQUE (flight_id, seat_number)
);

CREATE TABLE LAST_MINUTE_OFFER (
    offer_id INT PRIMARY KEY,
    flight_id INT,
    subscription_id INT,
    offer_price DECIMAL(10,2),
    valid_until DATETIME,
    available_seats INT,

    FOREIGN KEY (flight_id)
        REFERENCES FLIGHT(flight_id),

    FOREIGN KEY (subscription_id)
        REFERENCES SUBSCRIPTION(subscription_id)
);

CREATE TABLE BOOKING (
    booking_id INT PRIMARY KEY,
    user_id INT,
    flight_id INT,
    booking_date DATETIME,
    booking_status VARCHAR(20),
    total_amount DECIMAL(10,2),

    FOREIGN KEY (user_id)
        REFERENCES USER(user_id),

    FOREIGN KEY (flight_id)
        REFERENCES FLIGHT(flight_id)
);

CREATE TABLE BOOKING_SEAT (
    booking_seat_id INT PRIMARY KEY,
    booking_id INT,
    flight_seat_id INT,

    FOREIGN KEY (booking_id)
        REFERENCES BOOKING(booking_id),

    FOREIGN KEY (flight_seat_id)
        REFERENCES FLIGHT_SEAT(flight_seat_id),

    UNIQUE (booking_id, flight_seat_id)
);

CREATE TABLE PAYMENT (
    payment_id INT PRIMARY KEY,
    booking_id INT,
    user_subscription_id INT,
    amount DECIMAL(10,2),
    payment_date DATETIME,
    payment_status VARCHAR(20),
    payment_method VARCHAR(30),

    FOREIGN KEY (booking_id)
        REFERENCES BOOKING(booking_id),

    FOREIGN KEY (user_subscription_id)
        REFERENCES USER_SUBSCRIPTION(user_subscription_id)
);

INSERT INTO USER
(user_id, name, email, phone, password)
VALUES
(101, 'Ravi', 'ravi@gmail.com', '9876543210', 'hashed_password_1'),
(102, 'Priya', 'priya@gmail.com', '9876543211', 'hashed_password_2'),
(103, 'Arjun', 'arjun@gmail.com', '9876543212', 'hashed_password_3');

INSERT INTO SUBSCRIPTION
(subscription_id, plan_name, amount, duration_days)
VALUES
(1, 'Basic', 199.00, 30),
(2, 'Premium', 399.00, 30),
(3, 'Gold', 699.00, 90);

INSERT INTO USER_SUBSCRIPTION
(user_subscription_id, user_id, subscription_id, start_date, end_date, status)
VALUES
(1001, 101, 2, '2026-11-01', '2026-12-01', 'Active'),
(1002, 102, 1, '2026-11-05', '2026-12-05', 'Active'),
(1003, 103, 3, '2026-11-10', '2027-02-08', 'Active');

INSERT INTO AIRLINE
(airline_id, airline_name, airline_code)
VALUES
(1, 'Air India', 'AI'),
(2, 'IndiGo', '6E'),
(3, 'SpiceJet', 'SG');

INSERT INTO AIRPORT
(airport_id, airport_name, city, airport_code)
VALUES
(1, 'Rajiv Gandhi International Airport', 'Hyderabad', 'HYD'),
(2, 'Chennai International Airport', 'Chennai', 'MAA'),
(3, 'Kempegowda International Airport', 'Bengaluru', 'BLR');

INSERT INTO FLIGHT
(flight_id, airline_id, departure_airport_id, arrival_airport_id,
 departure_time, arrival_time, flight_number)
VALUES
(201, 1, 1, 2, '2026-11-25 08:00:00', '2026-11-25 09:30:00', 'AI101'),
(202, 2, 2, 3, '2026-11-26 10:00:00', '2026-11-26 11:15:00', '6E202'),
(203, 3, 3, 1, '2026-11-27 14:00:00', '2026-11-27 15:30:00', 'SG303');

INSERT INTO FLIGHT_SEAT
(flight_seat_id, flight_id, seat_number, class, price, status)
VALUES
(301, 201, '12A', 'Economy', 5000, 'Available'),
(302, 201, '12B', 'Economy', 5000, 'Booked'),
(303, 201, '1A', 'Business', 9000, 'Available'),
(304, 202, '15A', 'Economy', 4000, 'Booked'),
(305, 202, '15B', 'Economy', 4000, 'Available'),
(306, 203, '10A', 'Economy', 4500, 'Held');

INSERT INTO LAST_MINUTE_OFFER
(offer_id, flight_id, subscription_id, offer_price, valid_until, available_seats)
VALUES
(401, 201, 1, 4800, '2026-11-24 23:59:00', 5),
(402, 201, 2, 4500, '2026-11-24 23:59:00', 8),
(403, 202, 3, 3500, '2026-11-25 23:59:00', 10);

INSERT INTO BOOKING
(booking_id, user_id, flight_id, booking_date, booking_status, total_amount)
VALUES
(501, 101, 201, '2026-11-18 10:00:00', 'Confirmed', 10000),
(502, 102, 202, '2026-11-18 11:00:00', 'Confirmed', 4000),
(503, 103, 203, '2026-11-18 12:00:00', 'Pending', 4500);

INSERT INTO BOOKING_SEAT
(booking_seat_id, booking_id, flight_seat_id)
VALUES
(601, 501, 301),
(602, 501, 302),
(603, 502, 304),
(604, 503, 306);

INSERT INTO PAYMENT
(payment_id, booking_id, user_subscription_id, amount,
 payment_date, payment_status, payment_method)
VALUES
(701, 501, NULL, 10000, '2026-11-18 10:05:00', 'Success', 'UPI'),
(702, 502, NULL, 4000, '2026-11-18 11:05:00', 'Success', 'Card'),
(703, 503, NULL, 4500, '2026-11-18 12:05:00', 'Pending', 'Net Banking'),
(704, NULL, 1001, 399, '2026-11-01 09:00:00', 'Success', 'UPI'),
(705, NULL, 1002, 199, '2026-11-05 09:00:00', 'Success', 'Card');

-- 1. Display all users
SELECT * FROM USER;

-- 2. Display all subscription plans
SELECT * FROM SUBSCRIPTION;

-- 3. Display all airlines
SELECT * FROM AIRLINE;

-- 4. Display all airports
SELECT * FROM AIRPORT;

-- 5. Display all flights
SELECT * FROM FLIGHT;

-- 6. Display all flight seats
SELECT * FROM FLIGHT_SEAT;

-- 7. Display all bookings
SELECT * FROM BOOKING;

-- 8. Display all payments
SELECT * FROM PAYMENT;

-- 9. Display all booking seats
SELECT * FROM BOOKING_SEAT;

-- 10. Display all last-minute offers
SELECT * FROM LAST_MINUTE_OFFER;

-- 11. Display all user subscriptions
SELECT * FROM USER_SUBSCRIPTION;

-- Display user details along with booking details

SELECT
    USER.user_id,
    USER.name,
    BOOKING.booking_id,
    BOOKING.flight_id,
    BOOKING.total_amount
FROM USER
INNER JOIN BOOKING
ON USER.user_id = BOOKING.user_id;

-- Display complete flight booking details

SELECT
    U.name,
    B.booking_id,
    F.flight_number,
    A.airline_name,
    AP1.city AS departure_city,
    AP2.city AS arrival_city,
    B.total_amount
FROM USER U
INNER JOIN BOOKING B
    ON U.user_id = B.user_id
INNER JOIN FLIGHT F
    ON B.flight_id = F.flight_id
INNER JOIN AIRLINE A
    ON F.airline_id = A.airline_id
INNER JOIN AIRPORT AP1
    ON F.departure_airport_id = AP1.airport_id
INNER JOIN AIRPORT AP2
    ON F.arrival_airport_id = AP2.airport_id;

-- Display booking details with seat numbers

SELECT
    B.booking_id,
    B.user_id,
    F.flight_number,
    FS.seat_number,
    FS.class,
    FS.price
FROM BOOKING B
INNER JOIN BOOKING_SEAT BS
    ON B.booking_id = BS.booking_id
INNER JOIN FLIGHT_SEAT FS
    ON BS.flight_seat_id = FS.flight_seat_id
INNER JOIN FLIGHT F
    ON FS.flight_id = F.flight_id;

-- Display user subscription details

SELECT
    U.name,
    S.plan_name,
    S.amount,
    US.start_date,
    US.end_date,
    US.status
FROM USER U
INNER JOIN USER_SUBSCRIPTION US
    ON U.user_id = US.user_id
INNER JOIN SUBSCRIPTION S
    ON US.subscription_id = S.subscription_id;

-- Display Last Minute Flight Offers

SELECT
    F.flight_number,
    F.departure_time,
    F.arrival_time,
    L.offer_price,
    L.available_seats,
    L.valid_until
FROM FLIGHT F
INNER JOIN LAST_MINUTE_OFFER L
    ON F.flight_id = L.flight_id;

-- Display Booking and Payment Details

SELECT
    B.booking_id,
    B.booking_date,
    B.total_amount,
    P.payment_id,
    P.payment_method,
    P.payment_status
FROM BOOKING B
INNER JOIN PAYMENT P
    ON B.booking_id = P.booking_id;

-- Count Total Users

SELECT COUNT(*) AS total_users
FROM USER;

-- Calculate Total Booking Amount

SELECT SUM(total_amount) AS total_booking_amount
FROM BOOKING;

-- Calculate Average Booking Amount

SELECT AVG(total_amount) AS average_booking_amount
FROM BOOKING;

-- Find Highest Booking Amount

SELECT MAX(total_amount) AS highest_booking_amount
FROM BOOKING;

-- Find Lowest Booking Amount

SELECT MIN(total_amount) AS lowest_booking_amount
FROM BOOKING;

-- Count Bookings for Each User

SELECT
    user_id,
    COUNT(*) AS total_bookings
FROM BOOKING
GROUP BY user_id;

-- Display Users Having More Than One Booking

SELECT
    user_id,
    COUNT(*) AS total_bookings
FROM BOOKING
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Calculate Total Booking Amount for Each User

SELECT
    user_id,
    SUM(total_amount) AS total_amount
FROM BOOKING
GROUP BY user_id;

-- Count Payments Based on Payment Status

SELECT
    payment_status,
    COUNT(*) AS total_payments
FROM PAYMENT
GROUP BY payment_status;

-- Display User Booking Amounts in Descending Order

SELECT
    user_id,
    SUM(total_amount) AS total_amount
FROM BOOKING
GROUP BY user_id
ORDER BY total_amount DESC;

-- Display Successful Payments

SELECT *
FROM PAYMENT
WHERE payment_status = 'Success';

-- Display Users Whose Names Start With A

SELECT *
FROM USER
WHERE name LIKE 'A%';

-- Display Unique Payment Methods

SELECT DISTINCT payment_method
FROM PAYMENT;

-- Display Success and Pending Payments

SELECT *
FROM PAYMENT
WHERE payment_status IN ('Success', 'Pending');

-- Display Bookings Within Amount Range

SELECT *
FROM BOOKING
WHERE total_amount BETWEEN 2000 AND 5000;



-- Display Users Who Have Made Bookings

SELECT name
FROM USER
WHERE user_id IN (
    SELECT user_id
    FROM BOOKING
);

-- Categorize Bookings Based on Amount

SELECT
    booking_id,
    total_amount,
    CASE
        WHEN total_amount >= 10000 THEN 'High'
        WHEN total_amount >= 5000 THEN 'Medium'
        ELSE 'Low'
    END AS booking_category
FROM BOOKING;

-- Create View for Booking and Payment Details

CREATE VIEW Booking_Payment_View AS
SELECT
    B.booking_id,
    B.booking_date,
    B.total_amount,
    P.payment_method,
    P.payment_status
FROM BOOKING B
INNER JOIN PAYMENT P
    ON B.booking_id = P.booking_id;

-- Display View

SELECT * FROM Booking_Payment_View;

-- Create Index on Booking Table

CREATE INDEX idx_booking_user
ON BOOKING(user_id);
-- LEFT JOIN: Display all users and their bookings

SELECT
    U.user_id,
    U.name,
    B.booking_id,
    B.booking_status
FROM USER U
LEFT JOIN BOOKING B
ON U.user_id = B.user_id;

-- Display active subscribers and the last-minute offers they qualify for

SELECT
    U.name,
    S.plan_name,
    F.flight_number,
    L.offer_price,
    L.valid_until
FROM USER U
INNER JOIN USER_SUBSCRIPTION US
    ON U.user_id = US.user_id AND US.status = 'Active'
INNER JOIN SUBSCRIPTION S
    ON US.subscription_id = S.subscription_id
INNER JOIN LAST_MINUTE_OFFER L
    ON L.subscription_id = S.subscription_id
INNER JOIN FLIGHT F
    ON L.flight_id = F.flight_id;


-- Display number of available seats for each flight

SELECT
    F.flight_number,
    COUNT(*) AS available_seats
FROM FLIGHT F
INNER JOIN FLIGHT_SEAT FS
    ON F.flight_id = FS.flight_id
WHERE FS.status = 'Available'
GROUP BY F.flight_number;

-- Update Subscription Status

UPDATE USER_SUBSCRIPTION
SET status = 'Expired'
WHERE user_subscription_id = 1001;
-- Delete a Payment Record

DELETE FROM PAYMENT
WHERE payment_id = 705;


USE Flight_Booking_DB;
SHOW TABLES;