<script lang="ts">
  import { onMount } from 'svelte';
  import { getDates, getConsolidatedAvailability } from '$lib/services/database';
  import type { Event, ConsolidatedAvailability } from '$lib/types/index';

  let events: Event[] = [];
  let consolidatedData: Map<number, ConsolidatedAvailability> = new Map();
  let loading = true;
  let error: string | null = null;
  
  // Get current date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  onMount(async () => {
    try {
      loading = true;
      events = await getDates();
      
      // Get consolidated availability for each event
      for (const event of events) {
        const consolidated = await getConsolidatedAvailability(event.id);
        if (consolidated) {
          consolidatedData.set(event.id, consolidated);
        }
      }
      
      consolidatedData = consolidatedData; // trigger reactivity
      loading = false;
    } catch (error: unknown) {
      console.error('Error loading data:', error);
      if (error instanceof Error) {
        error = error.message;
      } else {
        error = 'An error occurred';
      }
      loading = false;
    }
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
  <h2>Band Availability</h2>
  
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
    </div>
  {/if}
</div>

<style>
  .band-view {
    padding: 1rem;
    max-width: 800px;
    margin: 0 auto;
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
