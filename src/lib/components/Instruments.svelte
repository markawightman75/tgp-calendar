<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase_client';
  import type { Instrument } from '$lib/types';

  let instruments: Instrument[] = [];
  let loading = true;
  let error: string | null = null;

  async function fetchInstruments() {
    try {
      loading = true;
      const { data, error: supabaseError } = await supabase
        .from('instruments')
        .select('*');
      
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

  onMount(() => {
    fetchInstruments();
  });
</script>

<div class="instruments-container">
  <h2>Instruments</h2>
  
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
          {instrument.name}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .instruments-container {
    margin: 2rem 0;
  }
  
  .instruments-list {
    list-style: none;
    padding: 0;
  }
  
  .instrument-item {
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    background-color: #f9f9f9;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .error {
    color: #e53e3e;
  }
</style>
