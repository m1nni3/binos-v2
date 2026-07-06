import { apiClient } from './utils.js';

const cache = new Map();
const inflight = new Map();
const STALE_MS = 60000;
const FALLBACK_MS = 3000;

let state = { dashboard: null, properties: [], listeners: new Set() };

export async function fetchWithCache(key, fetcher) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < STALE_MS) return entry.data;

  if (inflight.has(key)) return inflight.get(key);

  const p = fetcher()
    .then(data => {
      cache.set(key, { data, ts: Date.now() });
      inflight.delete(key);
      return data;
    })
    .catch(err => {
      inflight.delete(key);
      if (entry && Date.now() - entry.ts < FALLBACK_MS) return entry.data;
      throw err;
    });

  inflight.set(key, p);
  return p;
}

export function initCache() {
  return Promise.allSettled([refreshDashboard(), refreshProperties()]);
}

export function getState() {
  return state;
}

export function subscribe(fn) {
  state.listeners.add(fn);
  return () => state.listeners.delete(fn);
}

function notify() {
  for (const fn of state.listeners) fn(state);
}

export async function refreshDashboard() {
  try {
    state.dashboard = await fetchWithCache('dashboard', () => apiClient.get('/dashboard'));
    notify();
  } catch (e) {
    console.error('Failed to load dashboard:', e);
  }
}

export async function refreshProperties() {
  try {
    state.properties = await fetchWithCache('properties', () => apiClient.get('/properties'));
    notify();
  } catch (e) {
    console.error('Failed to load properties:', e);
  }
}
