/* PromptRush Elite — persistence */
(function (global) {
  const PREFIX = 'promptrush.';
  const KEYS = {
    used: PREFIX + 'usedWords',
    accepted: PREFIX + 'acceptedWords',
    rejected: PREFIX + 'rejectedWords',
    settings: PREFIX + 'settings',
    dictMeta: PREFIX + 'dictMeta',
    definitions: PREFIX + 'definitions',
    practice: PREFIX + 'practice',
    recentSyllables: PREFIX + 'recentSyllables',
  };

  const DEFAULT_SETTINGS = {
    eliteMode: true,
    ignorePunctuationInMatch: true,
    strictRawMatch: false,
    hideUsed: true,
    hideRejected: true,
    autoCopyBest: false,
    markCopiedAsUsed: true,
    sortMode: 'best',
    acceptedFirst: false,
    acceptedOnly: false,
  };

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage write failed', key, e);
    }
  }

  function migrateSettings(raw) {
    const merged = { ...DEFAULT_SETTINGS, ...raw };
    return merged;
  }

  global.PromptStorage = {
    KEYS,
    getSettings() {
      return migrateSettings(readJSON(KEYS.settings, {}));
    },
    saveSettings(settings) {
      writeJSON(KEYS.settings, settings);
    },
    getUsedSet() {
      return new Set(readJSON(KEYS.used, []));
    },
    saveUsedSet(set) {
      writeJSON(KEYS.used, [...set]);
    },
    getAcceptedSet() {
      return new Set(readJSON(KEYS.accepted, []));
    },
    saveAcceptedSet(set) {
      writeJSON(KEYS.accepted, [...set]);
    },
    getRejectedSet() {
      return new Set(readJSON(KEYS.rejected, []));
    },
    saveRejectedSet(set) {
      writeJSON(KEYS.rejected, [...set]);
    },
    getDictMeta() {
      return readJSON(KEYS.dictMeta, null);
    },
    saveDictMeta(meta) {
      writeJSON(KEYS.dictMeta, meta);
    },
    getDefinition(word) {
      const cache = readJSON(KEYS.definitions, {});
      return cache[word] ?? null;
    },
    saveDefinition(word, text) {
      const cache = readJSON(KEYS.definitions, {});
      cache[word] = text;
      writeJSON(KEYS.definitions, cache);
    },
    getPractice() {
      return readJSON(KEYS.practice, {
        streak: 0,
        times: [],
        weak: {},
        missed: [],
      });
    },
    savePractice(data) {
      writeJSON(KEYS.practice, data);
    },
    getRecentSyllables() {
      return readJSON(KEYS.recentSyllables, []);
    },
    pushRecentSyllable(syllable, max = 30) {
      const list = readJSON(KEYS.recentSyllables, []).filter((s) => s !== syllable);
      list.unshift(syllable);
      writeJSON(KEYS.recentSyllables, list.slice(0, max));
    },
  };
})(window);
