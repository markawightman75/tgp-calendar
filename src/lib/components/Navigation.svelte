<script lang="ts">
  import { onMount } from 'svelte';
  import { preferences, currentView, currentMember, setView, resetMember } from '$lib/stores/member';
  import { getMembers, getMemberById } from '$lib/services/database';
  import type { Member } from '$lib/types/index';

  let members: Member[] = [];
  let menuOpen = false;
  let loading = false;
  let currentMemberId: number | null = null;
  let currentMemberName: string | null = null;
  
  // Subscribe to preferences store
  $: {
    currentMemberId = $preferences.memberId;
    currentMemberName = $preferences.memberName;
  }

  onMount(async () => {
    loading = true;
    members = await getMembers();
    loading = false;
  });

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function switchView(view: 'personal' | 'consolidated') {
    setView(view);
    menuOpen = false;
  }

  async function switchMember(memberId: number) {
    if (memberId === currentMemberId) {
      menuOpen = false;
      return;
    }

    const member = members.find(m => m.id === memberId) || await getMemberById(memberId);
    if (member) {
      // Update both stores to ensure reactivity
      currentMember.set(member.id);
      preferences.update(prefs => ({
        ...prefs,
        memberId: member.id,
        memberName: member.name
      }));
      
      // If switching to a member view, ensure we're in personal view
      if ($currentView !== 'personal') {
        setView('personal');
      }
    }
    
    menuOpen = false;
  }

  function handleResetIdentity() {
    resetMember();
    menuOpen = false;
  }
</script>

<nav class="navigation">
  <div class="nav-container">
    <div class="nav-title">TGP Calendar</div>
    
    <div class="nav-buttons">
      <button 
        class="nav-button {$currentView === 'personal' ? 'active' : ''}"
        on:click={() => switchView('personal')}
        disabled={!currentMemberId && $currentView === 'consolidated'}
      >
        My View
      </button>
      
      <button 
        class="nav-button {$currentView === 'consolidated' ? 'active' : ''}"
        on:click={() => switchView('consolidated')}
      >
        Band View
      </button>
      
      <button class="menu-button" on:click={toggleMenu} aria-label="Menu">
        ⋮
      </button>
    </div>
  </div>
  
  {#if menuOpen}
    <div 
      class="menu-overlay" 
      on:click={() => menuOpen = false} 
      on:keydown={(e) => e.key === 'Escape' && (menuOpen = false)}
      role="button"
      tabindex="0"
      aria-label="Close menu"
    ></div>
    <div class="menu-dropdown">
      <div class="menu-header">View as:</div>
      
      <div class="member-list">
        {#each members as member}
          <button 
            class="member-item {member.id === currentMemberId ? 'current' : ''}"
            on:click={() => switchMember(member.id)}
          >
            {member.name} {member.instrument ? `(${member.instrument})` : ''}
            {#if member.id === currentMemberId}
              <span class="current-indicator">Current</span>
            {/if}
          </button>
        {/each}
      </div>
      
      <div class="menu-footer">
        <button class="reset-button" on:click={handleResetIdentity}>
          Reset my identity
        </button>
      </div>
    </div>
  {/if}
</nav>

<style>
  .navigation {
    position: relative;
    background-color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .nav-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .nav-title {
    font-weight: 700;
    font-size: 1.25rem;
    color: #1f2937;
  }
  
  .nav-buttons {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .nav-button {
    background-color: transparent;
    border: none;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    min-height: 44px;
    color: #4b5563;
  }
  
  .nav-button.active {
    background-color: #f3f4f6;
    color: #1f2937;
    font-weight: 500;
  }
  
  .nav-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .menu-button {
    background-color: transparent;
    border: none;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    cursor: pointer;
    color: #4b5563;
  }
  
  .menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.3);
    z-index: 50;
  }
  
  .menu-dropdown {
    position: absolute;
    top: 100%;
    right: 1rem;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    width: 280px;
    z-index: 100;
    overflow: hidden;
  }
  
  .menu-header {
    padding: 1rem;
    font-weight: 500;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .member-list {
    max-height: 500px;
    overflow-y: auto;
  }
  
  .member-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0.75rem 1rem;
    text-align: left;
    background-color: transparent;
    border: none;
    border-bottom: 1px solid #f3f4f6;
    cursor: pointer;
  }
  
  .member-item:hover {
    background-color: #f9fafb;
  }
  
  .member-item.current {
    background-color: #f3f4f6;
  }
  
  .current-indicator {
    font-size: 0.75rem;
    color: #6b7280;
  }
  
  .menu-footer {
    padding: 1rem;
    border-top: 1px solid #e5e7eb;
  }
  
  .reset-button {
    width: 100%;
    padding: 0.75rem;
    background-color: #f3f4f6;
    color: #1f2937;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    min-height: 44px;
  }
  
  .reset-button:hover {
    background-color: #e5e7eb;
  }
  
  @media (max-width: 640px) {
    .nav-container {
      padding: 0.75rem;
    }
    
    .nav-title {
      font-size: 1.125rem;
    }
    
    .nav-button {
      padding: 0.5rem;
    }
  }
</style>
