// ============================================
// ISS Location Dashboard - Skeleton
// Ready for Kafka + Flink integration
// ============================================

/**
 * Format timestamp for display
 * @param {string} timestamp - Timestamp string
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp) {
    return timestamp;
}

/**
 * Create DOM element for ISS location
 * @param {Object} location - ISS location object with timestamp, latitude, longitude, eventTime
 * @returns {HTMLElement} Location DOM element
 */
function createLocationElement(location) {
    const locationDiv = document.createElement('div');
    locationDiv.className = 'alert-item';
    
    locationDiv.innerHTML = `
        <div class="alert-header">
            <span class="callsign">ISS Location</span>
            <span class="timestamp">${formatTimestamp(location.eventTime)}</span>
        </div>
        <div class="alert-details">
            <span class="detail-label">Latitude:</span>
            <span class="detail-value">${parseFloat(location.latitude).toFixed(4)}°</span>
            <span class="detail-label">Longitude:</span>
            <span class="detail-value reason">${parseFloat(location.longitude).toFixed(4)}°</span>
        </div>
    `;
    
    return locationDiv;
}

/**
 * Add a new ISS location to the dashboard
 * Call this function when receiving data from Kafka/Flink
 * @param {Object} location - ISS location object with timestamp, latitude, longitude, eventTime
 */
function addLocation(location) {
    const container = document.getElementById('alertsContainer');
    
    // Remove empty state if present
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    // Create new location element
    const locationElement = createLocationElement(location);
    
    // Insert at the top
    container.insertBefore(locationElement, container.firstChild);
    
    // Keep only latest 10 locations
    const locations = container.querySelectorAll('.alert-item');
    if (locations.length > 10) {
        locations[locations.length - 1].remove();
    }
}

// ============================================
// Integration Points for Kafka + Flink
// ============================================

/**
 * OPTION 1: WebSocket Connection
 * Uncomment and configure when your Kafka/Flink service exposes WebSocket
 */
/*
let ws = null;

function connectWebSocket(url) {
    ws = new WebSocket(url);
    
    ws.onopen = () => {
        console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
        const location = JSON.parse(event.data);
        addLocation(location);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
    };
}

// Connect to your Kafka/Flink WebSocket endpoint
// connectWebSocket('ws://localhost:8080/alerts');
*/

/**
 * OPTION 2: REST API Polling
 * Uncomment and configure when your Kafka/Flink service exposes REST API
 */
/*
let pollingInterval = null;

function startPolling(apiUrl, intervalMs = 3000) {
    pollingInterval = setInterval(async () => {
        try {
            const response = await fetch(apiUrl);
            const locations = await response.json();
            
            // If API returns array, add each location
            if (Array.isArray(locations)) {
                locations.forEach(location => addLocation(location));
            } else {
                // If API returns single location
                addLocation(locations);
            }
        } catch (error) {
            console.error('Error fetching assets:', error);
        }
    }, intervalMs);
}

// Start polling your Kafka/Flink REST endpoint
// startPolling('http://localhost:8080/api/assets', 3000);
*/

/**
 * OPTION 3: Server-Sent Events (SSE)
 * Uncomment and configure when your Kafka/Flink service exposes SSE
 */
/*
let eventSource = null;

function connectSSE(url) {
    eventSource = new EventSource(url);
    
    eventSource.onmessage = (event) => {
        const location = JSON.parse(event.data);
        addLocation(location);
    };
    
    eventSource.onerror = (error) => {
        console.error('SSE error:', error);
    };
}

// Connect to your Kafka/Flink SSE endpoint
// connectSSE('http://localhost:8080/events/alerts');
*/

// ============================================
// Example: Call addLocation() directly when you receive data
// ============================================
// addLocation({
//     timestamp: 1705332000,
//     latitude: 48.8566,
//     longitude: 2.3522,
//     eventTime: "2026-01-15T22:40:00.000Z"
// });
