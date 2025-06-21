<script lang="ts">
  import { onMount } from 'svelte';
  import { getDates, getConsolidatedAvailability, createEvents, updateRehearsalStatus } from '$lib/services/database';
  import type { Event, ConsolidatedAvailability } from '$lib/types/index';
  
  // Function to get next occurrence of a specific day of week (0 = Sunday, 1 = Monday, etc.)
  function getNextDayOfWeek(date: Date, dayOfWeek: number): Date {
    const result = new Date(date);
    result.setDate(date.getDate() + ((dayOfWeek + 7 - date.getDay()) % 7) || 7);
    return result;
  }
  
  // Function to generate events for the next 4 weeks
  async function generateFutureEvents() {
    try {
      // Get the latest date from existing events
      const allEvents = await getDates();
      if (allEvents.length === 0) return;
      
      // Sort events by date to find the latest one
      const sortedEvents = [...allEvents].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const latestDate = new Date(sortedEvents[0].date);
      
      // Calculate next 4 weeks of events
      const newEvents: Omit<Event, 'id' | 'created_at'>[] = [];
      let currentDate = new Date(latestDate);
      
      // Start from the day after the latest date
      currentDate.setDate(currentDate.getDate() + 1);
      
      // Find the next 4 weeks of Wednesdays, Saturdays, and Sundays
      for (let week = 0; week < 4; week++) {
        // Add Wednesday rehearsal
        const nextWed = getNextDayOfWeek(currentDate, 3); // 3 = Wednesday
        newEvents.push({
          date: nextWed.toISOString().split('T')[0],
          event_type: 'rehearsal' as const,
          rehearsal_status: 'unconfirmed',
          notes: null
        });
        
        // Add weekend gig availability (Saturday)
        const nextSat = getNextDayOfWeek(currentDate, 6); // 6 = Saturday
        newEvents.push({
          date: nextSat.toISOString().split('T')[0],
          event_type: 'gig-available' as const,
          notes: 'Potential gig date'
        });
        
        // Add weekend gig availability (Sunday)
        const nextSun = getNextDayOfWeek(currentDate, 0); // 0 = Sunday
        newEvents.push({
          date: nextSun.toISOString().split('T')[0],
          event_type: 'gig-available' as const,
          notes: 'Potential gig date'
        });
        
        // Move to next week
        currentDate = new Date(nextWed);
        currentDate.setDate(currentDate.getDate() + 7);
      }
      
      // Create events in the database
      const success = await createEvents(newEvents);
      if (success) {
        // Reload the events
        await loadData();
      } else {
        alert('Failed to add future events');
      }
    } catch (error) {
      console.error('Error generating future events:', error);
      alert('An error occurred while generating events');
    }
  }

  let events: Event[] = [];
  let consolidatedData: Map<number, ConsolidatedAvailability> = new Map();
  let loading = true;
  let error: string | null = null;
  
  // Get current date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  async function handleRehearsalStatusChange(eventId: number, status: string) {
    if (!['unconfirmed', 'confirmed', 'cancelled'].includes(status)) return;
    
    const success = await updateRehearsalStatus(
      eventId, 
      status as 'unconfirmed' | 'confirmed' | 'cancelled'
    );
    
    if (success) {
      // Update the local state
      events = events.map(event => 
        event.id === eventId 
          ? { ...event, rehearsal_status: status as 'unconfirmed' | 'confirmed' | 'cancelled' } 
          : event
      );
    } else {
      alert('Failed to update rehearsal status');
    }
  }

  async function loadData() {
    try {
      loading = true;
      const allEvents = await getDates();
      events = allEvents;
      
      // Get consolidated availability for each event
      for (const event of events) {
        const consolidated = await getConsolidatedAvailability(event.id);
        if (consolidated) {
          consolidatedData.set(event.id, consolidated);
        }
      }
      
      consolidatedData = new Map(consolidatedData); // trigger reactivity
      loading = false;
    } catch (err: unknown) {
      console.error('Error loading data:', err);
      if (err instanceof Error) {
        error = err.message;
      } else {
        error = 'An error occurred';
      }
      loading = false;
    }
  }
  
  // Load data when component mounts
  onMount(() => {
    loadData();
  });

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  }

  function getEventClass(eventType: string): string {
    switch (eventType) {
      case 'rehearsal': return 'event-rehearsal';
      case 'gig-confirmed': return 'event-gig-confirmed';
      case 'gig-unconfirmed': return 'event-gig-unconfirmed';
      case 'gig-available': return 'event-gig-available';
      default: return '';
    }
  }
  
  function getEventTypeDisplay(eventType: string): string {
    switch (eventType) {
      case 'rehearsal': return 'Rehearsal';
      case 'gig-confirmed': return 'Confirmed gig';
      case 'gig-unconfirmed': return 'Possible gig (unconfirmed)';
      case 'gig-available': return 'Potential gig date';
      default: return eventType;
    }
  }
</script>

<div class="band-view">
  <div class="header-row">
    <h2>Events</h2>
  </div>
  
  {#if loading}
    <div class="loading">Loading events...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if events.length === 0}
    <div class="empty-state">No upcoming events found</div>
  {:else}
    <div class="dates-list">
      {#each events as event}
        {@const consolidated = consolidatedData.get(event.id)}
        {#if consolidated}
          <div 
            class="date-card {getEventClass(event.event_type)} {event.event_type === 'rehearsal' ? event.rehearsal_status || 'unconfirmed' : ''}" 
            data-date-id={event.id}
          >
            <div class="date-header">
              <div class="date-info">
                <div class="date-day">
                  {formatDate(event.date)}
                  <span class="event-type">{getEventTypeDisplay(event.event_type)}</span>
                </div>
              </div>
            </div>
            
            {#if event.event_type !== 'gig-confirmed'}
              <div class="availability-summary">
                {#if consolidated?.allAvailable}
                  <div class="all-available-message">Everyone is available! 🎉</div>
                {:else}
                  <div class="status-details">
                    {#if consolidated}
                      {#if consolidated.available.length > 0}
                        <div class="availability-line available">
                          <span class="count">{consolidated.available.length} available:</span>
                          <span class="member-names">
                            {consolidated.available.map(m => m.name).join(', ')}
                          </span>
                        </div>
                      {/if}
                      
                      {#if consolidated.unavailable.length > 0}
                        <div class="availability-line unavailable">
                          <span class="count">{consolidated.unavailable.length} unavailable:</span>
                          <span class="member-names">
                            {consolidated.unavailable.map(m => m.name).join(', ')}
                          </span>
                        </div>
                      {/if}
                      
                      {#if consolidated.unknown.length > 0}
                        <div class="availability-line unknown">
                          <span class="count">{consolidated.unknown.length} not responded:</span>
                          <span class="member-names">
                            {consolidated.unknown.map(m => m.name).join(', ')}
                          </span>
                        </div>
                      {/if}
                    {:else}
                      <div class="loading-status">Loading...</div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}
            
            {#if event.event_type === 'rehearsal'}
              <div class="rehearsal-status">
                <label for={`rehearsal-status-${event.id}`}>Status:</label>
                <select 
                  id={`rehearsal-status-${event.id}`}
                  value={event.rehearsal_status || 'unconfirmed'}
                  on:change={(e) => {
                    const target = e.target as HTMLSelectElement;
                    handleRehearsalStatusChange(event.id, target.value);
                  }}
                  class="status-select {event.rehearsal_status || 'unconfirmed'}"
                >
                  <option value="unconfirmed">Unconfirmed</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            {/if}
            
            {#if event.notes}
              <div class="date-notes">{event.notes}</div>
            {/if}
          </div>
        {/if}
      {/each}
      <div class="add-events-container">
        <button class="add-events-btn" on:click={generateFutureEvents}>
          Add events for next 4 weeks
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .band-view {
    padding: 1rem;
    max-width: 800px;
    margin: 0 auto;
  }
  
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    margin-bottom: 1.0rem;
  }
  
  .add-events-container {
    display: flex;
    justify-content: center;
    margin: 1.5rem 0;
    width: 100%;
  }

  .add-events-btn {
    padding: 0.75rem 1.5rem;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    
    &:hover {
      background-color: #45a049;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    
    &:active {
      transform: translateY(0);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
  }
  
  h2 {
    font-size: 1.5rem;    
    text-align: center;
    color: #1f2937;
  }
  
  .loading, .error, .empty-state {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }
  
  .error {
    color: #ef4444;
  }
  
  .dates-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .date-card {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    border-left: 4px solid #e5e7eb;
    position: relative;
  }
  
  .event-rehearsal {
    border-left-color: #3b82f6; /* blue-500 */
  }
  
  .event-rehearsal.confirmed {
    border-left-color: #10b981; /* emerald-500 */
  }
  
  .event-rehearsal.cancelled {
    border-left-color: #ef4444; /* red-500 */
    opacity: 0.8;
  }
  
  .rehearsal-status {
    margin: 1rem 0 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .rehearsal-status label {
    font-weight: 600;
    font-size: 0.9em;
    color: #4b5563;
  }
  
  .availability-line {
    display: flex;
    align-items: flex-start;
    margin: 0.25rem 0;
    font-size: 0.9em;
    line-height: 1.4;
  }
  
  .availability-line .count {
    font-weight: 600;
    margin-right: 0.25rem;
    white-space: nowrap;
  }
  
  .availability-line.available .count {
    color: #10b981; /* emerald-600 */
  }
  
  .availability-line.unavailable .count {
    color: #ef4444; /* red-600 */
  }
  
  .availability-line.unknown .count {
    color: #6b7280; /* gray-500 */
  }
  
  .availability-line .member-names {
    color: #4b5563; /* gray-600 */
  }
  
  .status-select {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid #d1d5db; /* gray-300 */
    font-size: 0.875rem;
    line-height: 1.25rem;
    appearance: none;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.5rem center;
    background-repeat: no-repeat;
    background-size: 1.5em 1.5em;
    padding-right: 2.5rem;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  .status-select:focus {
    outline: none;
    border-color: #3b82f6; /* blue-500 */
    box-shadow: 0 0 0 1px #3b82f6; /* blue-500 */
  }
  
  .status-select.confirmed {
    background-color: #f0fdf4; /* emerald-50 */
    border-color: #10b981; /* emerald-500 */
    color: #065f46; /* emerald-800 */
  }
  
  .status-select.cancelled {
    background-color: #fef2f2; /* red-50 */
    border-color: #ef4444; /* red-500 */
    color: #991b1b; /* red-800 */
    text-decoration: line-through;
  }
  
  .event-gig-confirmed {
    background-color: #f0fdf4; /* Light green background */
    border-left-color: #10b981; /* emerald */
  }
  
  .event-gig-unconfirmed {
    border-left-color: #f59e0b; /* amber */
  }
  
  .event-gig-available {
    background-color: #f3f4f6; /* Slightly darker gray background */
    border-left: 3px solid #9ca3af; /* Medium gray border */
    border-style: solid;
    border-top: 1px solid #e5e7eb; /* Subtle top border */
    border-right: 1px solid #e5e7eb; /* Subtle right border */
    border-bottom: 1px solid #e5e7eb; /* Subtle bottom border */
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); /* Subtle shadow for depth */
  }
  
  .event-gig-available .event-type {
    color: #4b5563; /* Darker gray for better readability */
  }
  
  .date-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .date-info {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }
  
  .date-day {
    font-weight: 600;
    font-size: 1.125rem;
    color: #1f2937;
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    line-height: 1;
  }
  
  .event-type {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: normal;
  }
  
  .status-indicator {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 700;
  }
  
  .availability-details {
    margin-bottom: 0.75rem;
  }
  
  .all-available-message {
    color: #047857;
    font-weight: 500;
  }
  
  .available-count, .unavailable-members, .unknown-count {
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
  }
  
  .available-count {
    color: #047857;
  }
  
  .unavailable-members {
    color: #b91c1c;
  }
  
  .unknown-count {
    color: #6b7280;
  }
  
  .count {
    font-weight: 600;
  }
  
  .members-list {
    font-style: italic;
  }
  
  .date-notes {
    font-size: 0.875rem;
    color: #6b7280;
    padding-top: 0.5rem;
    border-top: 1px solid #f3f4f6;
  }
</style>
