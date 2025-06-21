<script lang="ts">
  import { onMount } from 'svelte';
  import { getDates, getMemberAvailability, updateAvailability } from '$lib/services/database';
  import { preferences } from '$lib/stores/member';
  import type { Event, Availability } from '$lib/types/index';

  export let memberId: number;

  let dates: Event[] = [];
  let availabilityMap: Map<number, string> = new Map();
  let loading = true;
  let error: string | null = null;
  let updating: Set<number> = new Set();
  
  // Get current date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  onMount(async () => {
    await loadData();
  });

  $: if (memberId) {
    loadData();
  }

  async function loadData() {
    try {
      loading = true;
      
      // Get dates from today onwards
      dates = await getDates(today);
      
      // Get member's availability
      const availability = await getMemberAvailability(memberId);
      
      // Create a map for quick lookup
      availabilityMap = new Map();
      availability.forEach(a => {
        availabilityMap.set(a.event_id, a.status);
      });
      
      loading = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load data';
      loading = false;
    }
  }

  async function handleStatusChange(dateId: number, status: 'unknown' | 'available' | 'unavailable') {
    try {
      updating.add(dateId);
      updating = updating; // Trigger reactivity
      
      const success = await updateAvailability(memberId, dateId, status);
      
      if (success) {
        availabilityMap.set(dateId, status);
        availabilityMap = new Map(availabilityMap); // Trigger reactivity
      } else {
        throw new Error('Failed to update availability');
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to update availability';
    } finally {
      updating.delete(dateId);
      updating = new Set(updating); // Trigger reactivity
    }
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

<div class="my-view">
  <h2>My Availability</h2>
  <div class="member-name">{$preferences.memberName}</div>
  
  {#if loading}
    <div class="loading">Loading your availability...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else if dates.length === 0}
    <div class="empty-state">No upcoming dates found</div>
  {:else}
    <div class="dates-list">
      {#each dates as date}
        {@const status = availabilityMap.get(date.id) || 'unknown'}
        {@const isUpdating = updating.has(date.id)}
        
        <div class="date-card {getEventClass(date.event_type)}">
          <div class="date-header">
            <div class="date-info">
              <div class="date-day">
                {formatDate(date.date)}
                <span class="event-type">{getEventTypeDisplay(date.event_type)}</span>
              </div>
            </div>
          </div>
          
          {#if date.event_type !== 'gig-confirmed'}
            <div class="availability-toggle">
              <div class="toggle-label">My availability:</div>
              <div class="toggle-buttons">
                <button 
                  class="toggle-button {status === 'available' ? 'active' : ''}"
                  on:click={() => handleStatusChange(date.id, 'available')}
                  disabled={isUpdating}
                >
                  Available
                </button>
                
                <button 
                  class="toggle-button {status === 'unavailable' ? 'active' : ''}"
                  on:click={() => handleStatusChange(date.id, 'unavailable')}
                  disabled={isUpdating}
                >
                  Unavailable
                </button>
                
                <button 
                  class="toggle-button {status === 'unknown' ? 'active' : ''}"
                  on:click={() => handleStatusChange(date.id, 'unknown')}
                  disabled={isUpdating}
                >
                  Not sure
                </button>
              </div>
              
              {#if isUpdating}
                <div class="updating-indicator">Updating...</div>
              {/if}
            </div>
          {/if}
          
          {#if date.notes}
            <div class="date-notes">{date.notes}</div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .my-view {
    padding: 1rem;
    max-width: 800px;
    margin: 0 auto;
  }
  
  h2 {
    margin-bottom: 0.5rem;
    text-align: center;
    color: #1f2937;
  }
  
  .member-name {
    text-align: center;
    margin-bottom: 1.5rem;
    font-size: 1.125rem;
    color: #4b5563;
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
  
  .availability-toggle {
    margin-bottom: 0.75rem;
  }
  
  .toggle-label {
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #4b5563;
  }
  
  .toggle-buttons {
    display: flex;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #d1d5db;
  }
  
  .toggle-button {
    flex: 1;
    padding: 0.75rem 0.5rem;
    border: none;
    background-color: white;
    cursor: pointer;
    font-size: 0.875rem;
    min-height: 44px;
    transition: background-color 0.2s;
  }
  
  .toggle-button:not(:last-child) {
    border-right: 1px solid #d1d5db;
  }
  
  .toggle-button.active {
    font-weight: 600;
  }
  
  .toggle-button.active:nth-child(1) {
    background-color: #d1fae5;
    color: #047857;
  }
  
  .toggle-button.active:nth-child(2) {
    background-color: #fee2e2;
    color: #b91c1c;
  }
  
  .toggle-button.active:nth-child(3) {
    background-color: #f3f4f6;
    color: #6b7280;
  }
  
  .toggle-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .updating-indicator {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.25rem;
    text-align: center;
  }
  
  .date-notes {
    font-size: 0.875rem;
    color: #6b7280;
    padding-top: 0.5rem;
    border-top: 1px solid #f3f4f6;
  }
  
  @media (max-width: 480px) {
    .toggle-buttons {
      flex-direction: column;
    }
    
    .toggle-button:not(:last-child) {
      border-right: none;
      border-bottom: 1px solid #d1d5db;
    }
  }
</style>
