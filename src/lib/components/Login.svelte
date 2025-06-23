<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  const dispatch = createEventDispatcher();

  let password = '';
  let error = '';
  let inputEl: HTMLInputElement;

  function submit() {
    if (password === 'freddiesdead') {
      localStorage.setItem('auth', 'true');
      dispatch('authed');
    } else {
      error = 'Incorrect password. You are not funky.';
    }
  }

  function handleInput() {
    // Clear error message as soon as user starts typing
    if (error) error = '';
  }

  onMount(() => {
    // Automatically focus the password field when component mounts
    inputEl?.focus();
  });
</script>

<div class="login-wrapper">
  <p class="prompt">Identify yourself, keeper of the groove!</p>

  <label for="password-input" class="label">Password:</label>
  <input
    id="password-input"
    class="password-input mb-4"
    type="password"
    bind:value={password}
    bind:this={inputEl}
    autocomplete="current-password"
    on:input={handleInput}
    on:keydown={(e) => e.key === 'Enter' && submit()}
  />

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <button class="login-btn" on:click={submit}>Login</button>
</div>

<style>
  .login-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 70vh;    
    text-align: center;
  }

  .prompt {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
  }

  .label {
    font-weight: 500;
    font-size: 0.875rem; /* slightly smaller */
    width: 14rem;
    text-align: left;
    margin-bottom: 0.0625rem; /* ~1px */
  }

  .password-input {
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    width: 14rem;
  }

  .password-input:focus {
    outline: none;
    border-color: #4f46e5; /* indigo-600 */
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
  }

  .error {
    color: #dc2626; /* red-600 */
    font-size: 0.875rem;
  }

  .login-btn {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    background-color: #4f46e5; /* indigo-600 */
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    width: 14rem; /* match input width */
  }

  .login-btn:hover {
    background-color: #4338ca; /* indigo-700 */
  }

  .login-btn:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
  }
</style>
