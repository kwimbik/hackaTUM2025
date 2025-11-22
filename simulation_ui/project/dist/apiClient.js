// API client for receiving events from external programs
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const API_BASE_URL = 'http://localhost:3000/api';
const POLL_INTERVAL = 1000; // Poll every 1 second
let polling = false;
let pollIntervalId = null;
// Start polling for new events
export function startPolling(onEventReceived) {
    if (polling)
        return;
    polling = true;
    console.log('🔄 Started polling for external events...');
    pollIntervalId = window.setInterval(() => __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${API_BASE_URL}/events`);
            if (!response.ok) {
                console.warn('Failed to fetch events:', response.statusText);
                return;
            }
            const { events } = yield response.json();
            if (events && events.length > 0) {
                console.log(`📥 Received ${events.length} event(s) from API`);
                events.forEach((event) => {
                    onEventReceived(event);
                });
            }
        }
        catch (error) {
            // Silently fail if server is not running
            // Don't spam console
        }
    }), POLL_INTERVAL);
}
// Stop polling
export function stopPolling() {
    if (pollIntervalId !== null) {
        window.clearInterval(pollIntervalId);
        pollIntervalId = null;
    }
    polling = false;
    console.log('⏸️ Stopped polling for external events');
}
// Map family_status from API to our internal format
export function mapFamilyStatus(status) {
    const statusMap = {
        'single': 'Single',
        'married': 'Married',
        'divorced': 'Divorced',
        'widowed': 'Widowed'
    };
    return statusMap[status.toLowerCase()] || 'Single';
}
