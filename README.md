# Live ISS Location Data Pipeline

A real-time data pipeline that fetches International Space Station (ISS) location data from the Open Notify API, streams it through Apache Kafka, and displays it on a live web dashboard. This project demonstrates a complete end-to-end streaming data architecture using Kafka, Flink, and Node.js.

## 🚀 Features

- **Real-time ISS Location Tracking**: Fetches current ISS position every 60 seconds
- **Kafka Integration**: Publishes location data to Kafka topic for stream processing
- **Live Web Dashboard**: Real-time visualization of ISS location data via WebSocket
- **Flink Compatible**: Designed to work with Apache Flink for stream processing
- **Error Handling**: Robust retry logic and error handling for production reliability

## 📋 Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Kafka Message Schema](#kafka-message-schema)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)
- [Technologies Used](#technologies-used)

## 🏗️ Architecture

```
┌─────────────────┐
│  Open Notify    │
│  ISS API        │
└────────┬────────┘
         │
         │ HTTP GET (every 60s)
         ▼
┌─────────────────┐
│  ISS Producer   │
│  (Node.js)      │
└────────┬────────┘
         │
         │ Publish JSON messages
         ▼
┌─────────────────┐
│  Apache Kafka   │
│  Topic:         │
│  iss-location   │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌──────────────┐   ┌──────────────┐
│  Flink Job  │   │  Dashboard   │
│  (Consumer) │   │  (Consumer)  │
└──────────────┘   └──────┬───────┘
                          │
                          │ WebSocket
                          ▼
                   ┌──────────────┐
                   │   Browser    │
                   │  Dashboard   │
                   └──────────────┘
```

## 📦 Prerequisites

Before running this project, ensure you should have:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **Apache Kafka** (running and accessible)
  - Default broker: `localhost:9092` (for producer)
  - Docker broker: `host.docker.internal:9092` (for dashboard)
- **npm** (comes with Node.js)
- **Apache Flink** (optional, for stream processing)

## 🔧 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/anmol-28/kafkatest.git
   cd kafkatest
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Ensure Kafka is running:**
   - Kafka should be accessible at `localhost:9092` (for producer)
   - For Docker-based Kafka, use `host.docker.internal:9092` (for dashboard)

## ⚙️ Configuration

### Kafka Configuration

The project uses two different Kafka broker addresses:

- **Producer** (`producer/iss-producer.js`): `localhost:9092`
- **Dashboard** (`dashboard/app.js`): `host.docker.internal:9092`

To change these, edit the respective files:

**Producer:**
```javascript
const kafka = new Kafka({
    clientId: 'iss-producer',
    brokers: ['localhost:9092']  // Change here
});
```

**Dashboard:**
```javascript
const KAFKA_BROKER = 'host.docker.internal:9092';  // Change here
```

### Polling Interval

The producer fetches ISS location every 60 seconds. To change this, edit `producer/iss-producer.js`:

```javascript
setInterval(async () => {
    await fetchAndPublish();
}, 60000);  // Change interval in milliseconds
```

### Dashboard Port

The dashboard runs on port 3000 by default. To change this, edit `dashboard/app.js`:

```javascript
const PORT = 3000;  // Change here
```

## 🚀 Usage

### 1. Start the Kafka Producer

This will start fetching ISS location data and publishing to Kafka:

```bash
npm run producer
```

**Expected output:**
```
Kafka producer connected
[2026-01-17T...] Fetching ISS location...
✓ Sent ISS location to Kafka (lat: 48.8566, lon: 2.3522)
```

The producer will:
- Connect to Kafka
- Fetch ISS location every 60 seconds
- Publish messages to the `iss-location` topic
- Handle errors gracefully without crashing

### 2. Start the Dashboard Server

In a **separate terminal**, start the dashboard:

```bash
npm run dashboard
```

**Expected output:**
```
HTTP server running on http://localhost:3000
WebSocket server ready on ws://localhost:3000/ws
Kafka consumer connected
Subscribed to topic: iss-location
```

### 3. View the Dashboard

Open your browser and navigate to:

```
http://localhost:3000
```

You should see:
- Connection status indicator
- Live table showing ISS location data
- Automatic updates as new data arrives from Kafka

## 📁 Project Structure

```
livedatatest/
├── producer/
│   └── iss-producer.js      # Kafka producer - fetches ISS data
├── dashboard/
│   ├── app.js               # Backend server - Kafka consumer + WebSocket
│   └── index.html           # Frontend - live dashboard UI
├── package.json             # Project dependencies and scripts
├── package-lock.json        # Dependency lock file
└── README.md                # This file
```

## 📊 Kafka Message Schema

Each message published to the `iss-location` topic follows this JSON schema:

```json
{
  "timestamp": 1705332000,
  "latitude": 48.8566,
  "longitude": 2.3522,
  "eventTime": "2026-01-17T22:40:00.000Z"
}
```

**Field Descriptions:**
- `timestamp`: Unix timestamp from ISS API (number)
- `latitude`: ISS latitude in degrees (number)
- `longitude`: ISS longitude in degrees (number)
- `eventTime`: ISO 8601 timestamp when message was created (string)

## 🔌 API Endpoints

### HTTP Endpoints

- **GET /** - Serves the dashboard HTML page
- **GET /index.html** - Serves the dashboard HTML page

### WebSocket Endpoints

- **ws://localhost:3000/ws** - WebSocket connection for real-time data streaming

**WebSocket Message Format:**
```json
{
  "timestamp": 1705332000,
  "latitude": 48.8566,
  "longitude": 2.3522,
  "eventTime": "2026-01-17T22:40:00.000Z"
}
```

## 🐛 Troubleshooting

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Kafka Connection Failed

**Error:** `Kafka consumer error: Connection timeout`

**Solutions:**
1. Ensure Kafka is running and accessible
2. Check broker address in `dashboard/app.js`
3. Verify network connectivity to Kafka broker
4. For Docker Kafka, ensure `host.docker.internal` resolves correctly

### No Data Appearing in Dashboard

**Checklist:**
1. ✅ Producer is running and publishing messages
2. ✅ Dashboard server is running
3. ✅ Kafka topic `iss-location` exists
4. ✅ WebSocket connection is established (check browser console)
5. ✅ Consumer group `dashboard-consumer` is working

### WebSocket Connection Failed

**Error:** `WebSocket error` in browser console

**Solutions:**
1. Ensure dashboard server is running
2. Check browser console for detailed error messages
3. Verify firewall isn't blocking port 3000
4. Try refreshing the page

## 🛠️ Technologies Used

- **Node.js** - Runtime environment
- **KafkaJS** - Kafka client library for Node.js
- **Axios** - HTTP client for API requests
- **WebSocket (ws)** - WebSocket server implementation
- **Apache Kafka** - Distributed streaming platform
- **Apache Flink** - Stream processing framework (optional)

## 📝 Scripts

Available npm scripts:

- `npm run producer` - Start the ISS location producer
- `npm run dashboard` - Start the dashboard server

## 🔒 Error Handling

The producer includes robust error handling:

- **API Failures**: Logs error and retries on next interval (doesn't crash)
- **Kafka Failures**: Logs error and continues operation
- **Network Issues**: Handles timeouts and connection errors gracefully
- **Single Request**: Ensures only one API request is in-flight at a time

## 📄 License

ISC

## 👤 Author

Anmol

## 🔗 Related Links

- [Open Notify API Documentation](http://open-notify.org/Open-Notify-API/ISS-Location-Now/)
- [KafkaJS Documentation](https://kafka.js.org/)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)

---

**Note:** This project is designed for demonstration purposes. For production use, consider adding authentication, rate limiting, and additional error handling.
