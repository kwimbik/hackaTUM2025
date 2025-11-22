// API client for receiving events from external programs

export interface ExternalEventData {
  name?: string;
  current_income: number;
  current_loan?: number;
  family_status: string;
  children: number;
  recent_event: string;
  year: number;
  month: number;
  branchId?: number; // Optional: which branch to apply event to (defaults to 0)
}

export interface ExternalEvent {
  text: string;
  data: ExternalEventData;
  timestamp: number;
}

const API_BASE_URL = 'http://localhost:3000/api';
const POLL_INTERVAL = 1000; // Poll every 1 second

let polling = false;
let pollIntervalId: number | null = null;

// Start polling for new events
export function startPolling(onEventReceived: (event: ExternalEvent) => void) {
  if (polling) return;
  
  polling = true;
  console.log('🔄 Started polling for external events...');
  
  pollIntervalId = window.setInterval(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/events`);
      if (!response.ok) {
        console.warn('Failed to fetch events:', response.statusText);
        return;
      }
      
      const { events } = await response.json();
      
      if (events && events.length > 0) {
        console.log(`📥 Received ${events.length} event(s) from API`);
        events.forEach((event: ExternalEvent) => {
          onEventReceived(event);
        });
      }
    } catch (error) {
      // Silently fail if server is not running
      // Don't spam console
    }
  }, POLL_INTERVAL);
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
export function mapFamilyStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    'single': 'Single',
    'married': 'Married',
    'divorced': 'Divorced',
    'widowed': 'Widowed'
  };
  return statusMap[status.toLowerCase()] || 'Single';
}