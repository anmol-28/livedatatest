const axios = require('axios');
const { Kafka } = require('kafkajs');

// Kafka configuration
const kafka = new Kafka({
    clientId: 'iss-producer',
    brokers: ['localhost:9092']
});

const producer = kafka.producer({
    maxInFlightRequests: 1,
    idempotent: false,
    transactionTimeout: 30000
});

// ISS Location API endpoint
const ISS_API_URL = 'http://api.open-notify.org/iss-now.json';

// Kafka topic name (hardcoded)
const KAFKA_TOPIC = 'iss-location';

// Flag to ensure only one request is in-flight at a time
let isRequestInFlight = false;

/**
 * Normalize ISS position data into flat JSON event
 * @param {Object} issData - ISS position data from Open Notify API
 * @returns {Object} Normalized ISS location event
 */
function normalizeIssLocation(issData) {
    return {
        timestamp: issData.timestamp,
        latitude: parseFloat(issData.iss_position.latitude),
        longitude: parseFloat(issData.iss_position.longitude),
        eventTime: new Date().toISOString()
    };
}

/**
 * Fetch ISS location from API and publish to Kafka
 * Retry handling: If API call fails, log error and retry on next interval (does not crash process)
 */
async function fetchAndPublish() {
    // Ensure only one request is in-flight at a time
    if (isRequestInFlight) {
        console.log('Previous request still in progress, skipping...');
        return;
    }

    isRequestInFlight = true;
    try {
        console.log(`[${new Date().toISOString()}] Fetching ISS location...`);
        
        // Fetch ISS location from API
        const response = await axios.get(ISS_API_URL, {
            timeout: 10000
        });

        if (!response.data || response.data.message !== 'success') {
            console.log('Invalid ISS API response');
            return;
        }

        // Normalize ISS location data
        const locationEvent = normalizeIssLocation(response.data);

        // Create Kafka message
        const message = {
            value: JSON.stringify(locationEvent)
        };

        // Send message to Kafka
        await producer.send({
            topic: KAFKA_TOPIC,
            messages: [message]
        });

        console.log(`✓ Sent ISS location to Kafka (lat: ${locationEvent.latitude}, lon: ${locationEvent.longitude})`);

    } catch (error) {
        // Retry handling: Log error but do not crash - will retry on next interval
        if (error.response) {
            // API error
            console.error(`✗ ISS API error: ${error.response.status} - ${error.response.statusText} (will retry on next interval)`);
        } else if (error.request) {
            // Network error
            console.error('Network error: Could not reach ISS API (will retry on next interval)');
        } else {
            // Kafka or other error
            console.error(`Error: ${error.message} (will retry on next interval)`);
        }
    } finally {
        // Always reset the flag, even if request fails
        isRequestInFlight = false;
    }
}

/**
 * Main function
 */
async function main() {
    try {
        // Connect Kafka producer
        await producer.connect();
        console.log('Kafka producer connected');

        // Initial fetch
        await fetchAndPublish();

        // Fetch and publish every 60 seconds
        setInterval(async () => {
            await fetchAndPublish();
        }, 30000);

    } catch (error) {
        console.error('Failed to start producer:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await producer.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nShutting down...');
    await producer.disconnect();
    process.exit(0);
});

// Start the producer
main();
