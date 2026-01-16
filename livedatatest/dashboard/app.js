const http = require('http');
const fs = require('fs');
const path = require('path');
const { Kafka } = require('kafkajs');
const WebSocket = require('ws');

// HTTP Server Configuration
const PORT = 3000;
const KAFKA_TOPIC = 'iss-location';
const KAFKA_BROKER = 'host.docker.internal:9092';

// Kafka Consumer Configuration
const kafka = new Kafka({
    clientId: 'dashboard-consumer',
    brokers: [KAFKA_BROKER]
});

const consumer = kafka.consumer({
    groupId: 'dashboard-consumer'
});

// WebSocket Server
let wss = null;

/**
 * Create HTTP server and serve index.html
 */
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        const filePath = path.join(__dirname, 'index.html');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

/**
 * Initialize WebSocket server
 */
function initWebSocketServer() {
    wss = new WebSocket.Server({ 
        server,
        path: '/ws'
    });

    wss.on('connection', (ws, req) => {
        console.log('WebSocket client connected from', req.socket.remoteAddress);
        
        ws.on('close', () => {
            console.log('WebSocket client disconnected');
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });

    console.log('WebSocket server ready on ws://localhost:3000/ws');
}

/**
 * Broadcast message to all connected WebSocket clients
 */
function broadcastToClients(data) {
    if (wss) {
        const message = JSON.stringify(data);
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
}

/**
 * Start Kafka consumer and process messages
 */
async function startKafkaConsumer() {
    try {
        await consumer.connect();
        console.log('Kafka consumer connected');

        await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });
        console.log(`Subscribed to topic: ${KAFKA_TOPIC}`);

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    // Parse Kafka message as JSON
                    const data = JSON.parse(message.value.toString());
                    
                    // Extract and format data for frontend
                    const locationData = {
                        timestamp: data.timestamp || data.eventTime,
                        latitude: parseFloat(data.latitude),
                        longitude: parseFloat(data.longitude),
                        eventTime: data.eventTime || new Date().toISOString()
                    };

                    console.log(`Received ISS location: lat=${locationData.latitude}, lon=${locationData.longitude}`);
                    
                    // Broadcast to all connected WebSocket clients
                    broadcastToClients(locationData);
                } catch (error) {
                    console.error('Error processing Kafka message:', error);
                }
            }
        });
    } catch (error) {
        console.error('Kafka consumer error:', error);
        process.exit(1);
    }
}

/**
 * Main function
 */
async function main() {
    try {
        // Initialize WebSocket server
        initWebSocketServer();

        // Start HTTP server
        server.listen(PORT, () => {
            console.log(`HTTP server running on http://localhost:${PORT}`);
        });

        // Start Kafka consumer
        await startKafkaConsumer();
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    if (wss) {
        wss.close();
    }
    await consumer.disconnect();
    server.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nShutting down...');
    if (wss) {
        wss.close();
    }
    await consumer.disconnect();
    server.close();
    process.exit(0);
});

// Start the server
main();
