import { writable } from 'svelte/store';
import type { UserPreferences } from '$lib/types';

const STORAGE_KEY = 'tgp-calendar';

// Initialize from localStorage if available
const getStoredPreferences = (): UserPreferences => {
  if (typeof localStorage === 'undefined') {
    return { memberId: null, memberName: null, lastView: 'consolidated' };
  }
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { memberId: null, memberName: null, lastView: 'consolidated' };
  }
  
  try {
    return JSON.parse(stored) as UserPreferences;
  } catch (e) {
    console.error('Error parsing stored preferences', e);
    return { memberId: null, memberName: null, lastView: 'consolidated' };
  }
};

// Create stores
export const preferences = writable<UserPreferences>(getStoredPreferences());
export const currentMember = writable<number | null>(getStoredPreferences().memberId);
export const currentView = writable<'personal' | 'consolidated'>(getStoredPreferences().lastView);

// Subscribe to changes and update localStorage
preferences.subscribe(value => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }
});

// Helper functions to update stores
export function setMember(id: number, name: string): void {
  currentMember.set(id);
  preferences.update(prefs => ({ ...prefs, memberId: id, memberName: name }));
}

export function setView(view: 'personal' | 'consolidated'): void {
  currentView.set(view);
  preferences.update(prefs => ({ ...prefs, lastView: view }));
}

export function resetMember(): void {
  currentMember.set(null);
  preferences.update(prefs => ({ ...prefs, memberId: null, memberName: null }));
}
