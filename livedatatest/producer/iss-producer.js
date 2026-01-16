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
 */
async function fetchAndPublish() {
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
        if (error.response) {
            // API error
            console.error(`✗ ISS API error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
            // Network error
            console.error('Network error: Could not reach ISS API');
        } else {
            // Kafka or other error
            console.error('Error:', error.message);
        }
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

        // Fetch and publish every 1 second
        setInterval(async () => {
            await fetchAndPublish();
        }, 1000);

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
