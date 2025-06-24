<script lang="ts">
  import { onMount } from 'svelte';
  import App from '$lib/components/App.svelte';
  import Login from '$lib/components/Login.svelte';
  import { browser } from '$app/environment';

  // null = auth status unknown (avoids login flash during SSR)
  let authed: boolean | null = browser ? (localStorage.getItem('auth') === 'true') : null;

  // When component hydrates in the browser and auth state hasn't been determined, read it.
  onMount(() => {
    if (authed === null) {
      authed = localStorage.getItem('auth') === 'true';
    }
  });

  function handleAuthed() {
    authed = true;
  }
</script>

{#if authed === null}
  <!-- Optionally show a loader; rendering nothing avoids flash -->
{:else if authed}
  <App />
{:else}
  <Login on:authed={handleAuthed} />
{/if}

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
</style>
