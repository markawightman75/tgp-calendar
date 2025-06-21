<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase_client';
  import type { Instrument } from '$lib/types';

  let instruments: Instrument[] = [];
  let loading = true;
  let error: string | null = null;
  let addingInstrument = false;
  let updatingInstrument = false;

  async function fetchInstruments() {
    try {
      loading = true;
      const { data, error: supabaseError } = await supabase
        .from('instruments')
        .select('*')
        .order('id', { ascending: true });
      
      if (supabaseError) {
        throw supabaseError;
      }
      
      instruments = data as Instrument[];
    } catch (e) {
      error = e instanceof Error ? e.message : 'An unknown error occurred';
      console.error('Error fetching instruments:', e);
    } finally {
      loading = false;
    }
  }

  async function addRandomInstrument() {
    try {
      addingInstrument = true;
      error = null;
      
      // Generate a random instrument name
      const randomName = `Instrument ${Math.floor(Math.random() * 1000)} - ${new Date().toISOString().slice(11, 19)}`;
      
      const { error: insertError } = await supabase
        .from('instruments')
        .insert({ name: randomName });
      
      if (insertError) {
        // Check if this is an RLS policy error
        if (insertError.code === '42501') {
          throw new Error(
            'Row-Level Security policy prevents insertion. You need to enable public inserts in your Supabase dashboard: ' +
            'Go to Authentication > Policies > instruments table > Add a policy allowing inserts for anon/public role.'
          );
        }
        throw insertError;
      }
      
      // Refresh the instruments list
      await fetchInstruments();
    } catch (e) {
      error = e instanceof Error ? e.message : 'An unknown error occurred';
      console.error('Error adding instrument:', e);
    } finally {
      addingInstrument = false;
    }
  }

  async function updateFirstInstrument() {
    try {
      if (instruments.length === 0) {
        throw new Error('No instruments available to update');
      }

      updatingInstrument = true;
      error = null;
      
      const firstInstrument = instruments[0];
      const randomName = `Updated ${Math.floor(Math.random() * 1000)} - ${new Date().toISOString().slice(11, 19)}`;
      
      const { error: updateError } = await supabase
        .from('instruments')
        .update({ name: randomName })
        .eq('id', firstInstrument.id);
      
      if (updateError) {
        // Check if this is an RLS policy error
        if (updateError.code === '42501') {
          throw new Error(
            'Row-Level Security policy prevents updates. You need to enable public updates in your Supabase dashboard: ' +
            'Go to Authentication > Policies > instruments table > Add a policy allowing updates for anon/public role.'
          );
        }
        throw updateError;
      }
      
      // Refresh the instruments list
      await fetchInstruments();
    } catch (e) {
      error = e instanceof Error ? e.message : 'An unknown error occurred';
      console.error('Error updating instrument:', e);
    } finally {
      updatingInstrument = false;
    }
  }

  onMount(() => {
    fetchInstruments();
  });
</script>

<div class="instruments-container">
  <div class="header">
    <h2>Instruments</h2>
    <div class="button-group">
      <button 
        class="action-button" 
        on:click={updateFirstInstrument} 
        disabled={updatingInstrument || loading || instruments.length === 0}
      >
        {#if updatingInstrument}
          Updating...
        {:else}
          Update First Instrument
        {/if}
      </button>
      <button 
        class="action-button add-button" 
        on:click={addRandomInstrument} 
        disabled={addingInstrument || loading}
      >
        {#if addingInstrument}
          Adding...
        {:else}
          Add Random Instrument
        {/if}
      </button>
    </div>
  </div>
  
  {#if loading}
    <p>Loading instruments...</p>
  {:else if error}
    <p class="error">Error: {error}</p>
  {:else if instruments.length === 0}
    <p>No instruments found.</p>
  {:else}
    <ul class="instruments-list">
      {#each instruments as instrument (instrument.id)}
        <li class="instrument-item">
          <span class="instrument-id">#{instrument.id}</span>
          <span class="instrument-name">{instrument.name}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .instruments-container {
    margin: 2rem 0;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .button-group {
    display: flex;
    gap: 0.75rem;
  }
  
  .action-button {
    background-color: #6b7280;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .action-button:hover {
    background-color: #4b5563;
  }
  
  .action-button:disabled {
    background-color: #d1d5db;
    cursor: not-allowed;
  }
  
  .add-button {
    background-color: #4f46e5;
  }
  
  .add-button:hover {
    background-color: #4338ca;
  }
  
  .instruments-list {
    list-style: none;
    padding: 0;
  }
  
  .instrument-item {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    background-color: #f9f9f9;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .instrument-id {
    font-size: 0.875rem;
    color: #6b7280;
    margin-right: 0.75rem;
    min-width: 2rem;
  }
  
  .instrument-name {
    font-weight: 500;
  }
  
  .error {
    color: #e53e3e;
  }
</style>
