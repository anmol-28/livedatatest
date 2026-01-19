# How It Works: Live ISS Location Data Pipeline

## Overview

This document explains how the Live ISS Location Data Pipeline works - from fetching data to displaying it on the dashboard.

---

## System Flow

```
1. Producer fetches ISS location from API
   ↓
2. Producer publishes to Kafka
   ↓
3. Kafka delivers to multiple consumers:
   ├──→ Flink (Stream Processing)
   │     - Processes data in real-time
   │     - Performs transformations/analytics
   │
   └──→ Dashboard Backend (Visualization)
         ↓
4. Dashboard sends to browser via WebSocket
   ↓
5. Browser displays in table
```

---

## Step-by-Step: How It Works

### Step 1: Data Ingestion (Producer)

**File:** `producer/iss-producer.js`

**What happens:**
1. Every 60 seconds, the producer makes an HTTP GET request to:
   ```
   http://api.open-notify.org/iss-now.json
   ```

2. The API returns ISS location data:
   ```json
   {
     "message": "success",
     "timestamp": 1705332000,
     "iss_position": {
       "latitude": "48.8566",
       "longitude": "2.3522"
     }
   }
   ```

3. The producer transforms this data into a flat JSON format:
   ```json
   {
     "timestamp": 1705332000,
     "latitude": 48.8566,
     "longitude": 2.3522,
     "eventTime": "2026-01-17T22:40:00.000Z"
   }
   ```

4. The producer publishes this message to Kafka topic `iss-location`

**Key Features:**
- Only one API request runs at a time (prevents overlapping requests)
- Automatically fetches data every 60 seconds

---

### Step 2: Message Storage (Kafka)

**What happens:**
1. Kafka receives the message from the producer
2. Stores it in the `iss-location` topic
3. Message is available for any consumer to read
4. Kafka keeps messages until they expire (based on retention settings)

**Why Kafka?**
- Decouples producer from consumers
- Multiple consumers can read the same data
- Messages are persisted (not lost if consumer is down)
- Handles high throughput

---

### Step 3: Stream Processing (Flink)

**What happens:**
1. Flink connects to Kafka as a consumer
2. Subscribes to the `iss-location` topic
3. Creates a Flink SQL table to read from Kafka:
   ```sql
   CREATE TABLE iss_location (
       ts BIGINT,
       latitude DOUBLE,
       longitude DOUBLE,
       eventTime AS TO_TIMESTAMP_LTZ(ts, 3)
   ) WITH (
       'connector' = 'kafka',
       'topic' = 'iss-location',
       'properties.bootstrap.servers' = 'host.docker.internal:9092',
       'format' = 'json'
   );
   ```

4. When a new message arrives:
   - Flink processes the data in real-time
   - Can perform transformations, aggregations, windowing
   - Can write to another Kafka topic or sink
   - Enables real-time analytics and stream processing

**Key Features:**
- Runs in Docker containers (JobManager + TaskManager)
- Processes data in parallel with dashboard consumer
- Enables complex stream processing operations
- Can perform real-time analytics on ISS location data

**Why Flink?**
- Real-time stream processing
- Complex event processing
- Window operations (time-based aggregations)
- Stateful processing
- Can join multiple data streams

---

### Step 4: Data Consumption (Dashboard Backend)

**File:** `dashboard/app.js`

**What happens:**
1. Dashboard backend connects to Kafka as a consumer
2. Subscribes to the `iss-location` topic
3. When a new message arrives:
   - Parses the JSON message
   - Formats the data
   - Broadcasts it to all connected WebSocket clients

**Key Features:**
- Runs an HTTP server on port 3000
- Serves the HTML dashboard page
- Maintains WebSocket connections with browsers
- Automatically consumes new messages as they arrive

---

### Step 5: Real-Time Delivery (WebSocket)

**What happens:**
1. Browser connects to WebSocket at `ws://localhost:3000/ws`
2. When dashboard backend receives a Kafka message:
   - It immediately sends it to all connected browsers
   - No polling needed - data is pushed instantly

**Why WebSocket?**
- Real-time bidirectional communication
- Lower latency than HTTP polling
- Server can push data to client immediately

---

### Step 6: Display (Browser)

**File:** `dashboard/index.html`

**What happens:**
1. Browser loads the HTML page
2. JavaScript connects to WebSocket
3. When a message arrives:
   - Parses the JSON data
   - Creates a new table row
   - Inserts it at the top of the table
   - Removes old rows (keeps latest 100)

**User sees:**
- Connection status (connected/disconnected)
- Table with columns: Timestamp, Latitude, Longitude
- New rows appear automatically at the top
- Smooth animations when new data arrives

---

## Complete Data Flow Example

Let's trace a single ISS location update:

```
Time: 10:00:00
├─ Producer: Fetches from API
│  └─ API Response: { latitude: "48.8566", longitude: "2.3522", timestamp: 1705332000 }
│
├─ Producer: Transforms data
│  └─ Creates: { timestamp: 1705332000, latitude: 48.8566, longitude: 2.3522, eventTime: "2026-01-17T10:00:00.000Z" }
│
├─ Producer: Publishes to Kafka
│  └─ Topic: "iss-location"
│  └─ Message stored in Kafka
│
├─ Kafka: Message available to consumers
│  │
│  ├─ Flink: Consumes from Kafka
│  │  └─ Processes in real-time
│  │  └─ Can perform transformations/analytics
│  │
│  └─ Dashboard Backend: Consumes from Kafka
│     └─ Receives message from Kafka
│     └─ Parses JSON
│
├─ Dashboard Backend: Broadcasts via WebSocket
│  └─ Sends to all connected browsers
│
└─ Browser: Receives WebSocket message
   └─ Updates table
   └─ User sees new row at top of table
```

**Total time:** ~200-500ms from API fetch to display

---

## Component Interactions

### Producer Component

**Runs:** Continuously (every 60 seconds)
**Does:**
- Fetches ISS location
- Publishes to Kafka
- Handles errors gracefully

**Does NOT:**
- Wait for consumers
- Know about dashboard
- Store data locally

### Kafka Component

**Runs:** Continuously (separate service)
**Does:**
- Stores messages
- Delivers to consumers
- Manages topics and partitions

**Does NOT:**
- Transform data
- Know about producers/consumers
- Display data

### Flink Component

**Runs:** Continuously (Docker containers)
**Does:**
- Consumes from Kafka
- Processes data in real-time
- Performs stream transformations
- Enables analytics and aggregations

**Does NOT:**
- Fetch data from API
- Display data in browser
- Know about dashboard

### Dashboard Backend Component

**Runs:** Continuously (HTTP server)
**Does:**
- Consumes from Kafka
- Serves HTML page
- Manages WebSocket connections
- Broadcasts messages to browsers

**Does NOT:**
- Fetch data from API
- Store data
- Know about producer or Flink

### Browser Component

**Runs:** When user opens page
**Does:**
- Connects to WebSocket
- Displays data in table
- Updates automatically

**Does NOT:**
- Connect to Kafka directly
- Fetch data from API
- Store data

---

## Key Concepts

### 1. Decoupling

Each component is independent:
- Producer doesn't know about dashboard
- Dashboard doesn't know about producer
- They only communicate through Kafka

**Benefit:** Can update/restart components independently

### 2. Real-Time Updates

Data flows automatically:
- No manual refresh needed
- No polling from browser
- Updates appear instantly

**How:** WebSocket pushes data immediately

### 3. Automatic Updates

Data flows continuously:
- Producer fetches every 60 seconds
- Kafka delivers messages immediately
- Browser updates automatically

**Benefit:** Real-time data without manual intervention

### 4. Single Source of Truth

Kafka is the central hub:
- Producer writes to Kafka
- Flink reads from Kafka (stream processing)
- Dashboard reads from Kafka (visualization)
- All data flows through Kafka

**Benefit:** Multiple consumers can process the same data independently

---

## Timing Diagram

```
Producer          Kafka          Flink            Dashboard         Browser
   │                │                │                │                │
   │─── API GET ────│                │                │                │
   │                │                │                │                │
   │─── Publish ───>│                │                │                │
   │                │                │                │                │
   │                │<── Consume ────│                │                │
   │                │                │                │                │
   │                │<── Consume ────┼────────────────│                │
   │                │                │                │                │
   │                │                │                │─── WebSocket ─>│
   │                │                │                │                │
   │                │                │                │                │─── Display ──> User
```

**Timeline:**
- 0ms: Producer starts API request
- 150ms: API responds
- 175ms: Producer publishes to Kafka
- 190ms: Flink consumes from Kafka (parallel)
- 190ms: Dashboard consumes from Kafka (parallel)
- 191ms: Dashboard sends via WebSocket
- 200ms: Browser displays in table

---

## How to Run

### 1. Start Producer
```bash
npm run producer
```
**What it does:** Starts fetching ISS data and publishing to Kafka

### 2. Start Dashboard
```bash
npm run dashboard
```
**What it does:** Starts HTTP server, connects to Kafka, ready for browsers

### 3. Open Browser
```
http://localhost:3000
```
**What it does:** Loads dashboard, connects to WebSocket, displays data

---

## Summary

**In simple terms:**

1. **Producer** = Fetches ISS location every 60 seconds → Sends to Kafka
2. **Kafka** = Stores messages → Delivers to multiple consumers
3. **Flink** = Reads from Kafka → Processes data in real-time → Enables analytics
4. **Dashboard Backend** = Reads from Kafka → Sends to browsers
5. **Browser** = Receives data → Shows in table

**The magic:** All happens automatically in real-time, no manual refresh needed! Flink and Dashboard consume in parallel from the same Kafka topic.

---

## Questions & Answers

**Q: Can multiple browsers connect?**
A: Yes! All connected browsers receive updates simultaneously.

**Q: How fast is it?**
A: From API fetch to browser display: ~200-500ms

**Q: What happens to old data?**
A: Browser keeps latest 100 rows. Kafka keeps messages based on retention settings.

**Q: How often is data updated?**
A: Producer fetches new ISS location every 60 seconds

**Q: Do I need to refresh the page?**
A: No! The dashboard updates automatically via WebSocket

**Q: How does Flink fit in?**
A: Flink consumes from the same Kafka topic in parallel with the dashboard. It processes the stream in real-time for analytics and transformations.

**Q: Can Flink and Dashboard both read the same data?**
A: Yes! Kafka allows multiple consumers to read from the same topic independently. Each maintains its own offset.

---

**That's how it works!** 🚀
