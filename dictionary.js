/* PromptRush Elite — dictionary load, validation, substring index */
(function (global) {
  const FORMAT_RE = /^[a-z'-]{2,30}$/;
  const RARE_RE = /[qxzjk]/g;
  const HARD_RE = /[qxzjkvbpg]/g;

  function normalizeLine(line) {
    return line.trim().toLowerCase();
  }

  function rejectionReason(word) {
    if (!word) return 'empty';
    if (word.length < 2) return 'too short';
    if (word.length > 30) return 'too long';
    if (/\s/.test(word)) return 'contains space';
    if (/[0-9]/.test(word)) return 'contains number';
    if (/[\/\\()]/.test(word)) return 'invalid symbol';
    if (/[_]/.test(word)) return 'underscore';
    if (/[^\x00-\x7F]/.test(word)) return 'non-ascii';
    if (/[^a-z'-]/.test(word)) return 'invalid characters';
    return 'format-valid';
  }

  function rareLetterScore(word) {
    const m = word.match(RARE_RE);
    return m ? m.length : 0;
  }

  function typingDifficulty(word) {
    let score = Math.max(0, word.length - 8) * 1.2;
    const hard = word.match(HARD_RE);
    if (hard) score += hard.length * 1.5;
    if (word.includes('-')) score += 2;
    if (word.includes("'")) score += 1;
    return score;
  }

  function processRawLines(text) {
    const lines = text.split(/\r?\n/);
    const seen = new Set();
    const validWords = [];
    const invalidWords = [];
    let rawCount = 0;
    let hyphenCount = 0;
    let apostropheCount = 0;

    for (const line of lines) {
      const w = normalizeLine(line);
      if (!w) continue;
      rawCount++;
      if (seen.has(w)) continue;
      seen.add(w);

      if (!FORMAT_RE.test(w)) {
        invalidWords.push({ word: w, reason: rejectionReason(w) });
        continue;
      }

      const entry = {
        raw: w,
        searchKey: w.replace(/[-']/g, ''),
        length: w.length,
        hasHyphen: w.includes('-'),
        hasApostrophe: w.includes("'"),
        rareLetterScore: rareLetterScore(w),
        typingDifficulty: typingDifficulty(w),
      };
      validWords.push(entry);
      if (entry.hasHyphen) hyphenCount++;
      if (entry.hasApostrophe) apostropheCount++;
    }

    return {
      rawCount,
      validWords,
      invalidWords,
      stats: {
        totalRaw: rawCount,
        valid: validWords.length,
        invalid: invalidWords.length,
        hyphenCount,
        apostropheCount,
        deduped: seen.size,
      },
    };
  }

  function buildSubstringIndex(validWords) {
    const index = Object.create(null);
    const maxLen = 5;

    for (let i = 0; i < validWords.length; i++) {
      const key = validWords[i].searchKey;
      const n = key.length;
      const seen = new Set();
      for (let len = 1; len <= maxLen && len <= n; len++) {
        for (let start = 0; start <= n - len; start++) {
          const sub = key.substring(start, start + len);
          if (seen.has(sub)) continue;
          seen.add(sub);
          let bucket = index[sub];
          if (!bucket) {
            bucket = [];
            index[sub] = bucket;
          }
          bucket.push(i);
        }
      }
    }
    return index;
  }

  function buildPracticeSyllables(index, sampleSize = 800) {
    const keys = Object.keys(index).filter((k) => k.length >= 2 && k.length <= 5);
    if (keys.length <= sampleSize) return keys;
    const out = [];
    const step = Math.floor(keys.length / sampleSize);
    for (let i = 0; i < keys.length && out.length < sampleSize; i += Math.max(1, step)) {
      out.push(keys[i]);
    }
    return out;
  }

  global.PromptDictionary = {
    FORMAT_RE,
    processRawLines,
    buildSubstringIndex,
    buildPracticeSyllables,
    sanitizeSyllable(input) {
      return (input || '').toLowerCase().replace(/[^a-z]/g, '');
    },
    search(syllable, state) {
      const {
        validWords,
        substringIndex,
        settings,
        usedSet,
        acceptedSet,
        rejectedSet,
      } = state;

      const q = global.PromptDictionary.sanitizeSyllable(syllable);
      if (!q) return [];

      let indices;
      indices = substringIndex[q];
      if (!indices) return [];

      const out = [];
      for (let i = 0; i < indices.length; i++) {
        const w = validWords[indices[i]];
        if (settings.strictRawMatch) {
          if (!w.raw.includes(q)) continue;
        } else if (settings.ignorePunctuationInMatch) {
          if (!w.searchKey.includes(q)) continue;
        } else if (!w.raw.includes(q)) continue;

        if (settings.hideUsed && usedSet.has(w.raw)) continue;
        if (settings.hideRejected && rejectedSet.has(w.raw)) continue;
        if (settings.acceptedOnly && !acceptedSet.has(w.raw)) continue;

        out.push(w);
      }
      return out;
    },
  };
})(window);
