<script lang="ts">
  import { onMount } from 'svelte';
  import { getDates, getConsolidatedAvailability, createEvents } from '$lib/services/database';
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
          notes: 'Weekly rehearsal'
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
        alert('Successfully added future events!');
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

  function getStatusClass(consolidated: ConsolidatedAvailability | undefined): string {
    if (!consolidated) return 'status-unknown';
    
    if (consolidated.allAvailable) return 'status-all-available';
    if (consolidated.anyUnavailable) return 'status-some-unavailable';
    return 'status-some-available';
  }

  function getStatusIcon(consolidated: ConsolidatedAvailability | undefined): string {
    if (!consolidated) return '❓';
    if (consolidated.allAvailable) return '✓';
    if (consolidated.anyUnavailable) return '✗';
    return '?';
  }

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
      case 'gig-confirmed': return 'Gig (confirmed)';
      case 'gig-unconfirmed': return 'Gig (unconfirmed)';
      case 'gig-available': return 'Gig (availability)';
      default: return eventType;
    }
  }
</script>

<div class="band-view">
  <div class="header-row">
    <h2>Band Availability</h2>
  </div>
  
  {#if loading}
    <div class="loading">Loading availability data...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if events.length === 0}
    <div class="empty-state">No upcoming events found</div>
  {:else}
    <div class="dates-list">
      {#each events as event}
        {@const consolidated = consolidatedData.get(event.id)}
        {#if consolidated}
          <div class="date-card {getEventClass(event.event_type)}" data-date-id={event.id}>
            <div class="date-header">
              <div class="date-info">
                <div class="date-day">
                  {formatDate(event.date)}
                  <span class="event-type">{getEventTypeDisplay(event.event_type)}</span>
                </div>
              </div>
              <div class="status-indicator {getStatusClass(consolidated)}">
                {getStatusIcon(consolidated)}
              </div>
            </div>
            
            {#if event.event_type !== 'gig-confirmed'}
              <div class="availability-summary">
                {#if consolidated?.allAvailable}
                  <div class="all-available-message">Everyone is available! 🎉</div>
                {:else}
                  <div class="status-details">
                    {#if consolidated}
                      <div class="available-count">
                        <span class="count">{consolidated.available.length}</span> available
                        {#if consolidated.available.length > 0}
                          <div class="member-names">
                            {consolidated.available.map(m => m.name).join(', ')}
                          </div>
                        {/if}
                      </div>
                      
                      {#if consolidated.unavailable.length > 0}
                        <div class="unavailable-count">
                          <span class="count">{consolidated.unavailable.length}</span> unavailable
                          <div class="member-names">
                            {consolidated.unavailable.map(m => m.name).join(', ')}
                          </div>
                        </div>
                      {/if}
                      
                      {#if consolidated.unknown.length > 0}
                        <div class="unknown-count">
                          <span class="count">{consolidated.unknown.length}</span> not responded
                          <div class="member-names">
                            {consolidated.unknown.map(m => m.name).join(', ')}
                          </div>
                        </div>
                      {/if}
                    {:else}
                      <div class="loading-status">Loading...</div>
                    {/if}
                  </div>
                {/if}
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
    margin-bottom: 1.5rem;
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
    margin-bottom: 1.5rem;
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
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1rem;
    border-left: 4px solid #d1d5db;
    transition: background-color 0.2s ease; /* Smooth transition for background color */
  }
  
  .event-rehearsal {
    border-left-color: #60a5fa; /* blue */
  }
  
  .event-gig-confirmed {
    background-color: #f0fdf4; /* Light green background */
    border-left-color: #10b981; /* emerald */
  }
  
  .event-gig-unconfirmed {
    border-left-color: #f59e0b; /* amber */
  }
  
  .event-gig-available {
    background-color: #f9fafb; /* Light gray background */
    border-left-color: #d1d5db; /* Light gray border */
    opacity: 0.8;
    border-style: dashed;
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
  
  .all-available {
    background-color: #d1fae5;
    color: #047857;
  }
  
  .some-unavailable {
    background-color: #fee2e2;
    color: #b91c1c;
  }
  
  .some-unknown {
    background-color: #f3f4f6;
    color: #6b7280;
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
