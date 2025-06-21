<script lang="ts">
  import { onMount } from 'svelte';
  import { setMember, setView } from '$lib/stores/member';
  import { getMembers } from '$lib/services/database';
  import type { Member } from '$lib/types';

  export let onComplete: () => void;

  let members: Member[] = [];
  let selectedMemberId: number | null = null;
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    try {
      members = await getMembers();
      loading = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load members';
      loading = false;
    }
  });

  function handleContinue() {
    if (selectedMemberId) {
      const member = members.find(m => m.id === selectedMemberId);
      if (member) {
        setMember(member.id, member.name);
        setView('personal');
        onComplete();
      }
    }
  }

  function handleSkip() {
    setView('consolidated');
    onComplete();
  }
</script>

<div class="onboarding-modal">
  <div class="onboarding-content">
    <h2>Welcome to TGP Calendar</h2>
    
    {#if loading}
      <p>Loading members...</p>
    {:else if error}
      <p class="error">Error: {error}</p>
    {:else}
      <div class="form-group">
        <label for="member-select">Who are you?</label>
        <select 
          id="member-select" 
          bind:value={selectedMemberId}
          class="member-select"
        >
          <option value={null}>Select your name</option>
          {#each members as member}
            <option value={member.id}>
              {member.name} {member.instrument ? `(${member.instrument})` : ''}
            </option>
          {/each}
        </select>
      </div>
      
      <div class="button-group">
        <button 
          class="primary-button" 
          on:click={handleContinue} 
          disabled={!selectedMemberId}
        >
          Continue
        </button>
        
        <button class="secondary-button" on:click={handleSkip}>
          Just show band availability
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .onboarding-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .onboarding-content {
    background-color: white;
    border-radius: 8px;
    padding: 2rem;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  h2 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    text-align: center;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  .member-select {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background-color: white;
  }
  
  .button-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .primary-button, .secondary-button {
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    width: 100%;
    min-height: 44px;
  }
  
  .primary-button {
    background-color: #4f46e5;
    color: white;
  }
  
  .primary-button:disabled {
    background-color: #a5b4fc;
    cursor: not-allowed;
  }
  
  .secondary-button {
    background-color: #f3f4f6;
    color: #1f2937;
  }
  
  .error {
    color: #ef4444;
  }
  
  @media (min-width: 640px) {
    .button-group {
      flex-direction: row;
    }
  }
</style>
