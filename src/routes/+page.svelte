<script>
  import { onMount } from 'svelte';
  import App from '$lib/components/App.svelte';
  import Login from '$lib/components/Login.svelte';

  let authed = false;

  onMount(() => {
    authed = localStorage.getItem('auth') === 'true';
  });

  function handleAuthed() {
    authed = true;
  }
</script>

{#if authed}
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
