<script lang="ts">
  import { onMount } from 'svelte';
  import { preferences, currentView, currentMember } from '$lib/stores/member';
  import Onboarding from './Onboarding.svelte';
  import Navigation from './Navigation.svelte';
  import BandView from './calendar/BandView.svelte';
  import MyView from './calendar/MyView.svelte';

  let showOnboarding = false;
  
  onMount(() => {
    // Check if user needs onboarding
    showOnboarding = $preferences.memberId === null;
  });

  function handleOnboardingComplete() {
    showOnboarding = false;
  }
</script>

<div class="app">
  {#if showOnboarding}
    <Onboarding onComplete={handleOnboardingComplete} />
  {:else}
    <Navigation />
    
    <main class="main-content">
      {#if $currentView === 'personal' && $currentMember !== null}
        <MyView memberId={$currentMember} />
      {:else}
        <BandView />
      {/if}
    </main>
  {/if}
</div>

<style>
  .app {
    min-height: 100vh;
    background-color: #f9fafb;
  }
  
  .main-content {
    padding-bottom: 2rem;
  }
  
  /* Mobile-friendly styles */
  @media (max-width: 640px) {
    .main-content {
      padding-bottom: 4rem; /* Extra space for potential bottom navigation */
    }
  }
</style>
