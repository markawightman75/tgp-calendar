<script lang="ts">
  import { onMount } from 'svelte';
  import { getDates, getConsolidatedAvailability } from '$lib/services/database';
  import type { DateEntry, ConsolidatedAvailability } from '$lib/types/index';

  let dates: DateEntry[] = [];
  let consolidatedData: Map<number, ConsolidatedAvailability> = new Map();
  let loading = true;
  let error: string | null = null;
  
  // Get current date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  onMount(async () => {
    try {
      // Get dates from today onwards
      dates = await getDates(today);
      
      // Get consolidated availability for each date
      for (const date of dates) {
        const consolidated = await getConsolidatedAvailability(date.id);
        if (consolidated) {
          consolidatedData.set(date.id, consolidated);
        }
      }
      
      loading = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load data';
      loading = false;
    }
  });

  function getStatusClass(consolidated: ConsolidatedAvailability): string {
    if (consolidated.allAvailable) return 'all-available';
    if (consolidated.anyUnavailable) return 'some-unavailable';
    return 'some-unknown';
  }

  function getStatusIcon(consolidated: ConsolidatedAvailability): string {
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

  function getDayClass(dayType: string): string {
    switch (dayType) {
      case 'wednesday': return 'day-wednesday';
      case 'friday': return 'day-friday';
      case 'saturday': return 'day-saturday';
      default: return '';
    }
  }
</script>

<div class="band-view">
  <h2>Band Availability</h2>
  
  {#if loading}
    <div class="loading">Loading availability data...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if dates.length === 0}
    <div class="empty-state">No upcoming dates found</div>
  {:else}
    <div class="dates-list">
      {#each dates as date}
        {@const consolidated = consolidatedData.get(date.id)}
        {#if consolidated}
          <div class="date-card {getDayClass(date.day_type)}">
            <div class="date-header">
              <div class="date-info">
                <div class="date-day">{formatDate(date.date)}</div>
                <div class="event-type">{date.event_type}</div>
              </div>
              <div class="status-indicator {getStatusClass(consolidated)}">
                {getStatusIcon(consolidated)}
              </div>
            </div>
            
            <div class="availability-details">
              {#if consolidated.allAvailable}
                <div class="all-available-message">Everyone is available! 🎉</div>
              {:else}
                {#if consolidated.available.length > 0}
                  <div class="available-count">
                    <span class="count">{consolidated.available.length}</span> available:
                    <span class="members-list">
                      {consolidated.available.map((m) => m.name).join(', ')}
                    </span>
                  </div>
                {/if}
                
                {#if consolidated.unavailable.length > 0}
                  <div class="unavailable-members">
                    <span class="count">{consolidated.unavailable.length}</span> unavailable:
                    <span class="members-list">
                      {consolidated.unavailable.map((m) => m.name).join(', ')}
                    </span>
                  </div>
                {/if}
                
                {#if consolidated.unknown.length > 0}
                  <div class="unknown-count">
                    <span class="count">{consolidated.unknown.length}</span> not responded:
                    <span class="members-list">
                      {consolidated.unknown.map((m) => m.name).join(', ')}
                    </span>
                  </div>
                {/if}
              {/if}
            </div>
            
            {#if date.notes}
              <div class="date-notes">{date.notes}</div>
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
  }
  
  .day-wednesday {
    border-left-color: #60a5fa; /* blue */
  }
  
  .day-friday {
    border-left-color: #34d399; /* green */
  }
  
  .day-saturday {
    border-left-color: #f59e0b; /* amber */
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
  }
  
  .date-day {
    font-weight: 600;
    font-size: 1.125rem;
    color: #1f2937;
  }
  
  .event-type {
    font-size: 0.875rem;
    color: #6b7280;
    text-transform: capitalize;
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
