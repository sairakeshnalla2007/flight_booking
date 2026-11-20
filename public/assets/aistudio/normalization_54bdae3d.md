
# Database Normalization

## Subscription-Based Last-Minute Flight Booking System

### 1. Introduction

Normalization is the process of organizing data into tables to reduce data redundancy and avoid insertion, deletion, and update anomalies.

In this project, the database is normalized up to Third Normal Form (3NF).

### 2. Objectives of Normalization

1. To reduce data redundancy.
2. To avoid data anomalies.
3. To maintain data consistency.
4. To organize data efficiently.
5. To establish proper relationships between tables.

### 3. Normal Forms

- First Normal Form (1NF)
- Second Normal Form (2NF)
- Third Normal Form (3NF)

## 4. Unnormalized Form (UNF)

Unnormalized Form is the initial stage of a database where data may contain repeated values and multiple values in a single column.

### Example: FLIGHT_BOOKING_UNF

| Booking_ID | User_Name | Flight_Number | Seat_Numbers | Payment_Amount |
|---|---|---|---|---|
| 501 | Ravi | AI101 | 12A, 12B | 10000 |
| 502 | Priya | 6E202 | 15A | 4000 |

### Problems in UNF

1. Seat_Numbers contains multiple values in a single column.
2. Data is not properly organized.
3. Repeated values may cause data redundancy.
4. Updating data becomes difficult.

Therefore, we convert UNF into First Normal Form (1NF).

## 5. First Normal Form (1NF)

First Normal Form (1NF) states that every column must contain atomic (single) values. Each row must be unique.

### Conversion of UNF into 1NF

In the UNF table, the Seat_Numbers column contains multiple values in a single cell.

To convert it into 1NF, each seat number is stored in a separate row.

| Booking_ID | User_Name | Flight_Number | Seat_Number | Payment_Amount |
|---|---|---|---|---|
| 501 | Ravi | AI101 | 12A | 10000 |
| 501 | Ravi | AI101 | 12B | 10000 |
| 502 | Priya | 6E202 | 15A | 4000 |

### Advantages of 1NF

1. Each column contains atomic values.
2. Multiple values in a single cell are eliminated.
3. Data is organized into rows and columns.

Therefore, the table satisfies First Normal Form (1NF).

## 6. Second Normal Form (2NF)

Second Normal Form (2NF) states that:

1. The table must be in First Normal Form (1NF).
2. There must be no partial dependency.

### Partial Dependency

Partial dependency occurs when a non-key attribute depends on only a part of a composite primary key.

In our 1NF table, the composite key is (Booking_ID, Seat_Number).

User_Name, Flight_Number and Payment_Amount depend only on Booking_ID.

Therefore, partial dependency exists.

### Conversion into 2NF

To remove partial dependency, the table is divided into two tables.

**Table 1: BOOKING_2NF**

| Booking_ID (PK) | User_Name | Flight_Number | Payment_Amount |
|---|---|---|---|
| 501 | Ravi | AI101 | 10000 |
| 502 | Priya | 6E202 | 4000 |

**Table 2: BOOKING_SEAT_2NF**

| Booking_ID (PK, FK) | Seat_Number (PK) |
|---|---|
| 501 | 12A |
| 501 | 12B |
| 502 | 15A |

### Advantages of 2NF

1. Partial dependency is eliminated.
2. Data redundancy is reduced.
3. Data is organized into separate tables.

Therefore, the tables satisfy Second Normal Form (2NF).

## 7. Third Normal Form (3NF)

Third Normal Form (3NF) states that:

1. The table must be in Second Normal Form (2NF).
2. There must be no transitive dependency.

### Transitive Dependency

Transitive dependency occurs when a non-key attribute depends on another non-key attribute instead of depending directly on the primary key.

In our example:

FLIGHT(flight_id, flight_number, airline_id, airline_name, airline_code)

flight_id -> airline_id
airline_id -> airline_name, airline_code

Therefore, airline_name and airline_code depend on flight_id only indirectly, through airline_id. This is a transitive dependency.

### Conversion into 3NF

To remove the transitive dependency, airline details are moved into a separate table.

**Table 1: AIRLINE**

| airline_id (PK) | airline_name | airline_code |
|---|---|---|
| 1 | Air India | AI |
| 2 | IndiGo | 6E |
| 3 | SpiceJet | SG |

**Table 2: FLIGHT**

| flight_id (PK) | airline_id (FK) | flight_number |
|---|---|---|
| 201 | 1 | AI101 |
| 202 | 2 | 6E202 |
| 203 | 3 | SG303 |

### Advantages of 3NF

1. Transitive dependency is eliminated.
2. Data redundancy is reduced.
3. Data consistency is improved.
4. Database structure becomes more efficient.

Therefore, the tables satisfy Third Normal Form (3NF).
In the 3NF stage, transitive dependencies are removed. A transitive dependency occurs when a non-key attribute depends on another non-key attribute instead of depending directly on the primary key.
For example:

Booking_ID → Flight_Number
Flight_Number → Airline_Name

Here, Airline_Name indirectly depends on Booking_ID through Flight_Number.
To remove this dependency, the information is separated into two tables:

BOOKING: Booking_ID (Primary Key), Flight_Number (Foreign Key)
FLIGHT: Flight_Number (Primary Key), Airline_Name

In the actual database, airline details are stored separately in the AIRLINE table, and the FLIGHT table refers to it using airline_id. This avoids storing airline details repeatedly in the FLIGHT table.


## 8. Normalization of the Proposed Database Tables

The Subscription-Based Last-Minute Flight Booking System contains 11 tables.

### 8.1 First Normal Form (1NF)

All 11 tables satisfy 1NF because:

1. Each column contains atomic values.
2. Each record is uniquely identifiable.
3. No column contains multiple values in a single cell.

### 8.2 Second Normal Form (2NF)

All 11 tables are designed to satisfy 2NF because:

1. They satisfy 1NF.
2. Each table uses a single-column primary key.
3. There are no partial dependencies on a composite primary key.

### 8.3 Third Normal Form (3NF)

The database is designed to satisfy 3NF because:

It satisfies 2NF.
Non-key attributes depend on the key, the whole key, and nothing but the key.
Transitive dependencies are avoided by storing separate entities in separate tables.

For example:

Airline details are stored in AIRLINE.
Airport details are stored in AIRPORT.
Flight details are stored in FLIGHT.
User subscription details are stored in USER_SUBSCRIPTION.

A transitive dependency occurs when a non-key attribute depends on another non-key attribute instead of depending directly on the primary key.
For example:

Booking_ID → Flight_Number
Flight_Number → Airline_Name

To remove this transitive dependency, flight and airline information are stored separately. In the actual database, FLIGHT refers to AIRLINE using airline_id as a foreign key.
**Design note:** `FLIGHT_SEAT.price` is stored per seat because seat prices can differ and change over time. `BOOKING.total_amount` is stored to keep the amount charged at the time of booking, even if seat prices change later.

### 8.4 Final Tables

1. USER
2. SUBSCRIPTION
3. USER_SUBSCRIPTION
4. AIRLINE
5. AIRPORT
6. FLIGHT
7. FLIGHT_SEAT
8. LAST_MINUTE_OFFER
9. BOOKING
10. BOOKING_SEAT
11. PAYMENT

Therefore, the database is designed up to Third Normal Form (3NF).
