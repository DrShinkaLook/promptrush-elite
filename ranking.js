/* PromptRush Elite — word scoring and sort modes */

(function (global) {

  const RARE_CHARS = new Set(['q', 'x', 'z', 'j', 'k']);



  function wordStatus(word, acceptedSet, rejectedSet) {

    if (acceptedSet.has(word)) return 'accepted';

    if (rejectedSet.has(word)) return 'rejected';

    return 'unknown';

  }



  function computeScore(word, ctx) {

    const {

      usedSet,

      acceptedSet,

      rejectedSet,

      recentUsed,

      eliteMode,

      settings,

    } = ctx;

    const status = wordStatus(word.raw, acceptedSet, rejectedSet);

    if (status === 'rejected' && settings.hideRejected) return -Infinity;



    let score = word.length * 10;



    if (!usedSet.has(word.raw)) score += 40;

    else score -= 60;



    if (status === 'accepted') score += 80;

    if (settings.acceptedFirst && status === 'accepted') score += 50;

    if (status === 'rejected') score -= 200;



    score += word.rareLetterScore * 18;



    if (word.hasHyphen) {

      score += 12;

      if (word.length >= 12) score += 25;

    }

    if (word.hasApostrophe) score += 6;



    score -= word.typingDifficulty * (eliteMode ? 2.5 : 1.5);



    if (recentUsed && recentUsed.has(word.raw)) score -= 35;



    if (eliteMode) {

      if (!usedSet.has(word.raw)) score += 25;

      if (status === 'accepted') score += 30;

      if (word.length >= 14) score += 15;

      if (word.hasHyphen && word.length >= 10) score += 20;

    }



    return score;

  }



  const SORT_MODES = {

    best: (a, b) => b._score - a._score || b.length - a.length,

    longest: (a, b) => b.length - a.length || b._score - a._score,

    shortest: (a, b) => a.length - b.length || b._score - a._score,

    rare: (a, b) =>

      b.rareLetterScore - a.rareLetterScore ||

      b._score - a._score ||

      b.length - a.length,

    hyphen: (a, b) => {

      const ah = a.hasHyphen ? 1 : 0;

      const bh = b.hasHyphen ? 1 : 0;

      return bh - ah || b.length - a.length || b._score - a._score;

    },

    easy: (a, b) =>

      a.typingDifficulty - b.typingDifficulty ||

      b._score - a._score,

    accepted: (a, b) => {

      const rank = (w) => {

        if (w._status === 'accepted') return 2;

        if (w._status === 'unknown') return 1;

        return 0;

      };

      return rank(b) - rank(a) || b._score - a._score;

    },

  };



  function rankWords(words, ctx) {

    const limit = ctx.eliteMode ? 50 : 100;

    const cmp = SORT_MODES[ctx.settings.sortMode] || SORT_MODES.best;



    const scored = [];

    for (let i = 0; i < words.length; i++) {

      const w = words[i];

      const status = wordStatus(w.raw, ctx.acceptedSet, ctx.rejectedSet);

      w._status = status;

      w._score = computeScore(w, ctx);

      if (w._score === -Infinity) continue;

      scored.push(w);

    }



    scored.sort(cmp);

    return scored.slice(0, limit);

  }



  function highlightWord(word, syllable) {

    const q = (syllable || '').toLowerCase().replace(/[^a-z]/g, '');

    if (!q) return escapeHtml(word);



    const raw = word;

    const key = raw.replace(/[-']/g, '');

    const idx = key.indexOf(q);

    if (idx === -1) return escapeHtml(raw);



    let keyPos = 0;

    let start = -1;

    let end = -1;

    for (let i = 0; i < raw.length; i++) {

      const c = raw[i];

      if (c === '-' || c === "'") continue;

      if (keyPos === idx) start = i;

      if (keyPos === idx + q.length - 1) {

        end = i + 1;

        break;

      }

      keyPos++;

    }

    if (start === -1) return escapeHtml(raw);

    if (end === -1) end = raw.length;



    return (

      escapeHtml(raw.slice(0, start)) +

      '<mark class="syllable-hit">' +

      escapeHtml(raw.slice(start, end)) +

      '</mark>' +

      escapeHtml(raw.slice(end))

    );

  }



  function escapeHtml(s) {

    return s

      .replace(/&/g, '&amp;')

      .replace(/</g, '&lt;')

      .replace(/>/g, '&gt;')

      .replace(/"/g, '&quot;');

  }



  function rareBadge(word) {

    if (!word.rareLetterScore) return '';

    return `<span class="badge badge-rare" title="Rare letters">R${word.rareLetterScore}</span>`;

  }



  function statusBadge(status) {

    const map = {

      accepted: ['badge-accepted', 'Accepted'],

      rejected: ['badge-rejected', 'Rejected'],

      unknown: ['badge-unknown', 'Unknown'],

    };

    const [cls, label] = map[status] || map.unknown;

    return `<span class="badge ${cls}">${label}</span>`;

  }



  global.PromptRanking = {

    computeScore,

    rankWords,

    wordStatus,

    highlightWord,

    rareBadge,

    statusBadge,

    escapeHtml,

    SORT_MODES,

  };

})(window);


