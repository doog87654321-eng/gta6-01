// Save and continue: progress, cash and settings in localStorage. Nothing
// leaves the browser; a missing or corrupt save just starts a new game.

import { SAVE_KEY } from './config.js';

const EMPTY_SAVE = {
  missionsDone: 0,
  cash: 0,
  stashes: [],
  bestScore: 0,
  muted: false,
  completedAt: null,
};

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...EMPTY_SAVE, stashes: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY_SAVE, stashes: [] };
    return {
      ...EMPTY_SAVE,
      ...parsed,
      stashes: Array.isArray(parsed.stashes) ? parsed.stashes : [],
    };
  } catch {
    return { ...EMPTY_SAVE, stashes: [] };
  }
}

export function writeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: the save then lasts this visit only.
  }
}
