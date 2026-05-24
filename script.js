/* PromptRush Elite — main UI */
(function () {
  const $ = (id) => document.getElementById(id);

  const els = {
    syllableInput: $('syllableInput'),
    statusSyllable: $('statusSyllable'),
    statRaw: $('statRaw'),
    statValid: $('statValid'),
    statInvalid: $('statInvalid'),
    statUsed: $('statUsed'),
    statHyphen: $('statHyphen'),
    statApostrophe: $('statApostrophe'),
    statMatchCount: $('statMatchCount'),
    eliteStatusPill: $('eliteStatusPill'),
    toastArea: $('toastArea'),
    dictLoadState: $('dictLoadState'),
    nextWordDisplay: $('nextWordDisplay'),
    nextWordLength: $('nextWordLength'),
    nextWordScore: $('nextWordScore'),
    nextWordBadges: $('nextWordBadges'),
    resultsBody: $('resultsBody'),
    resultsCount: $('resultsCount'),
    recentUsedPills: $('recentUsedPills'),
    countAccepted: $('countAccepted'),
    countRejected: $('countRejected'),
    practiceStreak: $('practiceStreak'),
    practiceAvg: $('practiceAvg'),
    practiceTimer: $('practiceTimer'),
    practiceWeak: $('practiceWeak'),
    heroDefinition: $('heroDefinition'),
    manualCopyFallback: $('manualCopyFallback'),
    manualCopyInput: $('manualCopyInput'),
    acceptedOnlyNote: $('acceptedOnlyNote'),
  };

  const state = {
    validWords: [],
    invalidWords: [],
    substringIndex: null,
    practiceSyllables: [],
    stats: {},
    settings: PromptStorage.getSettings(),
    usedSet: PromptStorage.getUsedSet(),
    acceptedSet: PromptStorage.getAcceptedSet(),
    rejectedSet: PromptStorage.getRejectedSet(),
    ranked: [],
    selectedIndex: 0,
    recentUsedOrder: [],
    undoStack: [],
    practice: PromptStorage.getPractice(),
    practiceStart: null,
    dictReady: false,
    heroDefineTimer: null,
    heroDefineWord: null,
  };

  const HERO_DEFINE_DELAY_MS = 900;
  const NO_DEFINITION = 'No short definition found.';
  const DEFINE_LOADING = 'Looking up definition...';

  function focusPromptInput() {
    if (document.activeElement === els.manualCopyInput) return;
    requestAnimationFrame(() => {
      els.syllableInput.focus();
      const len = els.syllableInput.value.length;
      els.syllableInput.setSelectionRange(len, len);
    });
  }

  function toast(msg, type) {
    els.toastArea.textContent = msg;
    els.toastArea.className = 'status-msg' + (type ? ' ' + type : '');
    if (msg) {
      clearTimeout(toast._t);
      toast._t = setTimeout(() => {
        if (els.toastArea.textContent === msg) els.toastArea.textContent = '';
      }, 2800);
    }
  }

  function saveAllSets() {
    PromptStorage.saveUsedSet(state.usedSet);
    PromptStorage.saveAcceptedSet(state.acceptedSet);
    PromptStorage.saveRejectedSet(state.rejectedSet);
    PromptStorage.saveSettings(state.settings);
    PromptStorage.savePractice(state.practice);
  }

  function rankContext() {
    const recentUsed = new Set(state.recentUsedOrder.slice(0, 12));
    return {
      settings: state.settings,
      usedSet: state.usedSet,
      acceptedSet: state.acceptedSet,
      rejectedSet: state.rejectedSet,
      recentUsed,
      eliteMode: state.settings.eliteMode,
    };
  }

  function runSearch() {
    if (!state.dictReady) return;
    const syllable = els.syllableInput.value;
    const display = PromptDictionary.sanitizeSyllable(syllable) || '—';
    els.statusSyllable.textContent = display;

    const matches = PromptDictionary.search(syllable, {
      validWords: state.validWords,
      substringIndex: state.substringIndex,
      settings: state.settings,
      usedSet: state.usedSet,
      acceptedSet: state.acceptedSet,
      rejectedSet: state.rejectedSet,
    });

    state.ranked = PromptRanking.rankWords(matches, rankContext());
    state.selectedIndex = 0;
    els.statMatchCount.textContent = String(matches.length);
    renderResults();
    renderHero();
  }

  function flagsHtml(w) {
    let h = '';
    if (w.hasHyphen) h += '<span class="badge badge-hyphen">-</span>';
    if (w.hasApostrophe) h += '<span class="badge badge-apo">\'</span>';
    return h;
  }

  function heroBadges(w) {
    if (!w) return '';
    let h = PromptRanking.statusBadge(w._status);
    h += '<span class="badge badge-valid">Format Valid</span>';
    h += PromptRanking.rareBadge(w);
    h += flagsHtml(w);
    if (state.usedSet.has(w.raw)) h += '<span class="badge badge-used">Used</span>';
    return h;
  }

  function cancelHeroDefinition() {
    if (state.heroDefineTimer) {
      clearTimeout(state.heroDefineTimer);
      state.heroDefineTimer = null;
    }
    state.heroDefineWord = null;
  }

  function setDefinitionDisplay(text, loading) {
    els.heroDefinition.textContent = text || '';
    els.heroDefinition.classList.toggle('is-loading', Boolean(loading));
  }

  function scheduleHeroDefinition(word) {
    cancelHeroDefinition();
    if (!word) return;

    const cached = PromptStorage.getDefinition(word);
    if (cached !== null) {
      setDefinitionDisplay(cached, false);
      return;
    }

    state.heroDefineWord = word;
    state.heroDefineTimer = setTimeout(() => {
      if (state.heroDefineWord === word) {
        showDefinition(word, els.heroDefinition, { silent: true });
      }
    }, HERO_DEFINE_DELAY_MS);
  }

  function renderHero() {
    const w = state.ranked[state.selectedIndex];
    const syllable = els.syllableInput.value;
    if (!w) {
      cancelHeroDefinition();
      els.nextWordDisplay.textContent = '—';
      els.nextWordLength.textContent = '0 letters';
      els.nextWordScore.textContent = 'score 0';
      els.nextWordBadges.innerHTML = '';
      setDefinitionDisplay('', false);
      return;
    }
    els.nextWordDisplay.innerHTML = PromptRanking.highlightWord(w.raw, syllable);
    els.nextWordLength.textContent = w.length + ' letters';
    els.nextWordScore.textContent = 'score ' + Math.round(w._score);
    els.nextWordBadges.innerHTML = heroBadges(w);
    scheduleHeroDefinition(w.raw);
  }

  function renderResults() {
    const syllable = els.syllableInput.value;
    const tbody = els.resultsBody;
    const frag = document.createDocumentFragment();
    const list = state.ranked;

    for (let i = 0; i < list.length; i++) {
      const w = list[i];
      const tr = document.createElement('tr');
      const rowClass = [];
      if (i < 5) rowClass.push('row-top');
      if (i === state.selectedIndex) rowClass.push('row-active');
      if (rowClass.length) tr.className = rowClass.join(' ');
      tr.dataset.index = String(i);

      tr.innerHTML =
        '<td class="col-word">' +
        PromptRanking.highlightWord(w.raw, syllable) +
        '</td>' +
        '<td>' +
        w.length +
        '</td>' +
        '<td>' +
        Math.round(w._score) +
        '</td>' +
        '<td>' +
        PromptRanking.statusBadge(w._status) +
        '</td>' +
        '<td>' +
        (w.rareLetterScore || '—') +
        '</td>' +
        '<td>' +
        flagsHtml(w) +
        '</td>' +
        '<td>' +
        (state.usedSet.has(w.raw) ? '✓' : '') +
        '</td>' +
        '<td class="row-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="copy" data-i="' +
        i +
        '">Copy</button>' +
        '<button type="button" class="btn btn-accepted btn-sm" data-action="accept" data-word="' +
        w.raw +
        '">✓</button>' +
        '<button type="button" class="btn btn-rejected btn-sm" data-action="reject" data-word="' +
        w.raw +
        '">✗</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-action="reset" data-word="' +
        w.raw +
        '">?</button>' +
        '<button type="button" class="btn btn-info btn-sm" data-action="define" data-word="' +
        w.raw +
        '">Define</button>' +
        '</td>';

      frag.appendChild(tr);
    }

    tbody.replaceChildren(frag);
    els.resultsCount.textContent = list.length + ' shown';
  }

  function getWordAt(index) {
    return state.ranked[index] || null;
  }

  async function copyWord(word, opts) {
    if (!word) {
      toast('No word to copy', 'warn');
      return;
    }
    try {
      await navigator.clipboard.writeText(word);
      els.manualCopyFallback.classList.add('hidden');
      toast('Copied: ' + word);
    } catch {
      els.manualCopyFallback.classList.remove('hidden');
      els.manualCopyInput.value = word;
      els.manualCopyInput.select();
      toast('Clipboard blocked — use manual field', 'error');
    }

    if (opts && opts.markUsed !== false && state.settings.markCopiedAsUsed) {
      markUsed(word);
    }

    if (state.practiceStart) {
      const ms = Date.now() - state.practiceStart;
      state.practice.times.push(ms);
      if (state.practice.times.length > 200) state.practice.times.shift();
      state.practice.streak += 1;
      state.practiceStart = null;
      updatePracticeUI();
      saveAllSets();
    }

    PromptStorage.pushRecentSyllable(PromptDictionary.sanitizeSyllable(els.syllableInput.value));
    focusPromptInput();
  }

  function markUsed(word) {
    if (!state.usedSet.has(word)) {
      state.undoStack.push(word);
      state.usedSet.add(word);
      state.recentUsedOrder.unshift(word);
      if (state.recentUsedOrder.length > 80) state.recentUsedOrder.pop();
      updateUsedUI();
      saveAllSets();
      runSearch();
    }
  }

  function undoUsed() {
    const word = state.undoStack.pop();
    if (!word) {
      const last = state.recentUsedOrder[0];
      if (last) {
        state.usedSet.delete(last);
        state.recentUsedOrder.shift();
        updateUsedUI();
        saveAllSets();
        runSearch();
        toast('Undid: ' + last);
      }
      return;
    }
    state.usedSet.delete(word);
    state.recentUsedOrder = state.recentUsedOrder.filter((w) => w !== word);
    updateUsedUI();
    saveAllSets();
    runSearch();
    toast('Undid: ' + word);
  }

  function setWordLabel(word, label) {
    if (label === 'accepted') {
      state.acceptedSet.add(word);
      state.rejectedSet.delete(word);
    } else if (label === 'rejected') {
      state.rejectedSet.add(word);
      state.acceptedSet.delete(word);
    } else {
      state.acceptedSet.delete(word);
      state.rejectedSet.delete(word);
    }
    updateLearningUI();
    saveAllSets();
    runSearch();
  }

  function updateStatsUI() {
    const s = state.stats;
    els.statRaw.textContent = String(s.totalRaw || 0);
    els.statValid.textContent = String(s.valid || 0);
    els.statInvalid.textContent = String(s.invalid || 0);
    els.statHyphen.textContent = String(s.hyphenCount || 0);
    els.statApostrophe.textContent = String(s.apostropheCount || 0);
  }

  function updateUsedUI() {
    els.statUsed.textContent = String(state.usedSet.size);
    els.recentUsedPills.replaceChildren();
    const frag = document.createDocumentFragment();
    const list = state.recentUsedOrder.slice(0, 40);
    for (const w of list) {
      const span = document.createElement('span');
      span.className = 'pill';
      span.textContent = w;
      frag.appendChild(span);
    }
    els.recentUsedPills.appendChild(frag);
  }

  function updateLearningUI() {
    els.countAccepted.textContent = String(state.acceptedSet.size);
    els.countRejected.textContent = String(state.rejectedSet.size);
  }

  function updateElitePill() {
    const on = state.settings.eliteMode;
    els.eliteStatusPill.textContent = 'Elite Mode: ' + (on ? 'ON' : 'OFF');
    els.eliteStatusPill.classList.toggle('on', on);
  }

  function updatePracticeUI() {
    const p = state.practice;
    els.practiceStreak.textContent = String(p.streak || 0);
    if (p.times && p.times.length) {
      const avg = p.times.reduce((a, b) => a + b, 0) / p.times.length;
      els.practiceAvg.textContent = (avg / 1000).toFixed(2) + 's';
    } else {
      els.practiceAvg.textContent = '—';
    }
    const weakKeys = Object.entries(p.weak || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);
    els.practiceWeak.textContent = weakKeys.length ? weakKeys.join(', ') : '—';
  }

  function bindSettingsFromUI() {
    state.settings.eliteMode = $('eliteMode').checked;
    state.settings.ignorePunctuationInMatch = $('ignorePunctuationInMatch').checked;
    state.settings.strictRawMatch = $('strictRawMatch').checked;
    state.settings.hideUsed = $('hideUsed').checked;
    state.settings.hideRejected = $('hideRejected').checked;
    state.settings.acceptedFirst = $('acceptedFirst').checked;
    state.settings.acceptedOnly = $('acceptedOnly').checked;
    state.settings.autoCopyBest = $('autoCopyBest').checked;
    state.settings.markCopiedAsUsed = $('markCopiedAsUsed').checked;
    state.settings.sortMode = $('sortMode').value;
    els.acceptedOnlyNote.hidden = !state.settings.acceptedOnly;
    updateElitePill();
    saveAllSets();
    runSearch();
  }

  function applySettingsToUI() {
    const s = state.settings;
    $('eliteMode').checked = s.eliteMode;
    $('ignorePunctuationInMatch').checked = s.ignorePunctuationInMatch;
    $('strictRawMatch').checked = s.strictRawMatch;
    $('hideUsed').checked = s.hideUsed;
    $('hideRejected').checked = s.hideRejected;
    $('acceptedFirst').checked = s.acceptedFirst;
    $('acceptedOnly').checked = s.acceptedOnly;
    $('autoCopyBest').checked = s.autoCopyBest;
    $('markCopiedAsUsed').checked = s.markCopiedAsUsed;
    $('sortMode').value = s.sortMode || 'best';
    els.acceptedOnlyNote.hidden = !s.acceptedOnly;
    updateElitePill();
  }

  async function loadDictionaryFromText(text, sourceName) {
    els.dictLoadState.textContent = 'Processing dictionary…';
    els.dictLoadState.className = 'dict-state';

    await new Promise((r) => setTimeout(r, 0));

    const processed = PromptDictionary.processRawLines(text);
    state.validWords = processed.validWords;
    state.invalidWords = processed.invalidWords;
    state.stats = processed.stats;

    els.dictLoadState.textContent = 'Building search index…';
    await new Promise((r) => setTimeout(r, 0));

    state.substringIndex = PromptDictionary.buildSubstringIndex(state.validWords);
    state.practiceSyllables = PromptDictionary.buildPracticeSyllables(state.substringIndex);

    state.dictReady = true;
    els.dictLoadState.textContent =
      'Loaded ' + sourceName + ' (' + state.stats.valid.toLocaleString() + ' format-valid words)';
    els.dictLoadState.className = 'dict-state ok';

    PromptStorage.saveDictMeta({
      source: sourceName,
      loadedAt: Date.now(),
      stats: state.stats,
    });

    updateStatsUI();
    updateUsedUI();
    updateLearningUI();
    runSearch();
    toast('Dictionary ready');
  }

  async function loadDefaultDictionary() {
    const sources = ['words.txt', 'sample-words.txt'];
    const errors = [];

    for (const source of sources) {
      try {
        const res = await fetch(source, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        await loadDictionaryFromText(text, source);
        return;
      } catch (e) {
        errors.push(`${source}: ${e.message}`);
      }
    }

    els.dictLoadState.textContent =
      'No dictionary found — add your own words.txt or upload a custom .txt file. (' +
      errors.join(' | ') +
      ')';
    els.dictLoadState.className = 'dict-state error';
    toast('Dictionary load failed', 'error');
  }

  function cleanWordForLookup(word) {
    return word.replace(/[-']/g, '');
  }

  function extractShortDefinition(data) {
    if (!Array.isArray(data) || !data[0] || !data[0].meanings) return '';
    for (let m = 0; m < data[0].meanings.length; m++) {
      const meaning = data[0].meanings[m];
      if (!meaning.definitions || !meaning.definitions.length) continue;
      const def = meaning.definitions[0].definition || '';
      if (def.trim()) return def.trim();
    }
    return '';
  }

  function shortenDefinition(sentence) {
    if (!sentence) return NO_DEFINITION;
    let text = sentence.replace(/\s+/g, ' ').trim();
    const dot = text.indexOf('. ');
    if (dot > 0 && dot < 140) text = text.slice(0, dot + 1);
    else if (text.length > 140) text = text.slice(0, 137) + '…';
    return text;
  }

  async function fetchDefinitionFromApi(lookupWord) {
    const res = await fetch(
      'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(lookupWord),
    );
    if (!res.ok) return NO_DEFINITION;
    const data = await res.json();
    const raw = extractShortDefinition(data);
    return shortenDefinition(raw);
  }

  async function fetchDefinition(word) {
    const cached = PromptStorage.getDefinition(word);
    if (cached !== null) return cached;

    try {
      let sentence = await fetchDefinitionFromApi(word);

      if (sentence === NO_DEFINITION && /[-']/.test(word)) {
        const cleaned = cleanWordForLookup(word);
        if (cleaned && cleaned !== word) {
          const cachedClean = PromptStorage.getDefinition(cleaned);
          if (cachedClean !== null) {
            sentence = cachedClean;
          } else {
            sentence = await fetchDefinitionFromApi(cleaned);
            if (sentence !== NO_DEFINITION) {
              PromptStorage.saveDefinition(cleaned, sentence);
            }
          }
        }
      }

      PromptStorage.saveDefinition(word, sentence);
      return sentence;
    } catch {
      PromptStorage.saveDefinition(word, NO_DEFINITION);
      return NO_DEFINITION;
    }
  }

  async function showDefinition(word, targetEl, opts) {
    const silent = opts && opts.silent;
    const cached = PromptStorage.getDefinition(word);
    if (cached !== null) {
      setDefinitionDisplay(cached, false);
      return;
    }
    setDefinitionDisplay(DEFINE_LOADING, true);
    const def = await fetchDefinition(word);
    if (targetEl === els.heroDefinition && state.ranked[state.selectedIndex]?.raw !== word) {
      return;
    }
    setDefinitionDisplay(def, false);
    if (!silent) toast(def === NO_DEFINITION ? 'No definition' : 'Definition loaded');
  }

  function randomSyllable() {
    const list = state.practiceSyllables;
    if (!list || !list.length) {
      toast('Index not ready', 'warn');
      return;
    }
    const s = list[(Math.random() * list.length) | 0];
    els.syllableInput.value = s;
    state.practiceStart = Date.now();
    els.practiceTimer.textContent = 'running…';
    runSearch();
    focusPromptInput();
    if (state.settings.autoCopyBest) {
      const w = getWordAt(0);
      if (w) copyWord(w.raw, { markUsed: false });
    }
  }

  function retryMissed() {
    const missed = state.practice.missed || [];
    if (!missed.length) {
      toast('No missed syllables', 'warn');
      return;
    }
    const s = missed.pop();
    els.syllableInput.value = s;
    state.practiceStart = Date.now();
    saveAllSets();
    runSearch();
  }

  function roundReset() {
    state.usedSet.clear();
    state.recentUsedOrder = [];
    state.undoStack = [];
    saveAllSets();
    updateUsedUI();
    runSearch();
    toast('Round reset — used words cleared');
  }

  function copyBest() {
    const w = getWordAt(state.selectedIndex);
    if (w) copyWord(w.raw);
    else {
      const syll = PromptDictionary.sanitizeSyllable(els.syllableInput.value);
      if (syll && state.practice.weak) {
        state.practice.weak[syll] = (state.practice.weak[syll] || 0) + 1;
        state.practice.missed = state.practice.missed || [];
        if (!state.practice.missed.includes(syll)) state.practice.missed.push(syll);
        state.practice.streak = 0;
        saveAllSets();
        updatePracticeUI();
      }
      toast('No match to copy', 'warn');
    }
  }

  function copyNextBest() {
    if (state.ranked.length < 2) {
      copyBest();
      return;
    }
    const next = (state.selectedIndex + 1) % state.ranked.length;
    const w = getWordAt(next);
    if (w) copyWord(w.raw);
  }

  function cycleSelection() {
    if (!state.ranked.length) return;
    state.selectedIndex = (state.selectedIndex + 1) % state.ranked.length;
    renderHero();
    renderResults();
    const active = els.resultsBody.querySelector('tr.row-active');
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function onResultsClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'copy') {
      const i = parseInt(btn.dataset.i, 10);
      const w = getWordAt(i);
      if (w) copyWord(w.raw);
      return;
    }
    const word = btn.dataset.word;
    if (!word) return;
    if (action === 'accept') setWordLabel(word, 'accepted');
    else if (action === 'reject') setWordLabel(word, 'rejected');
    else if (action === 'reset') setWordLabel(word, 'unknown');
    else if (action === 'define') showDefinition(word, els.heroDefinition);
  }

  function initEvents() {
    els.syllableInput.addEventListener('input', () => {
      runSearch();
      if (state.settings.autoCopyBest) {
        const w = getWordAt(0);
        if (w) copyWord(w.raw, { markUsed: false });
      }
    });

    [
      'eliteMode',
      'ignorePunctuationInMatch',
      'strictRawMatch',
      'hideUsed',
      'hideRejected',
      'acceptedFirst',
      'acceptedOnly',
      'autoCopyBest',
      'markCopiedAsUsed',
      'sortMode',
    ].forEach((id) => {
      $(id).addEventListener('change', bindSettingsFromUI);
    });

    $('copyBestBtn').addEventListener('click', copyBest);
    $('copyNextBtn').addEventListener('click', copyNextBest);
    $('cycleNextBtn').addEventListener('click', cycleSelection);
    $('markAcceptedHero').addEventListener('click', () => {
      const w = getWordAt(state.selectedIndex);
      if (w) setWordLabel(w.raw, 'accepted');
    });
    $('markRejectedHero').addEventListener('click', () => {
      const w = getWordAt(state.selectedIndex);
      if (w) setWordLabel(w.raw, 'rejected');
    });
    $('defineHero').addEventListener('click', () => {
      const w = getWordAt(state.selectedIndex);
      if (w) showDefinition(w.raw, els.heroDefinition);
    });

    $('undoUsedBtn').addEventListener('click', undoUsed);
    $('clearUsedBtn').addEventListener('click', () => {
      state.usedSet.clear();
      state.recentUsedOrder = [];
      state.undoStack = [];
      saveAllSets();
      updateUsedUI();
      runSearch();
      toast('Used words cleared');
    });
    $('roundResetBtn').addEventListener('click', roundReset);
    $('randomSyllableBtn').addEventListener('click', randomSyllable);
    $('retryMissedBtn').addEventListener('click', retryMissed);

    $('dictUpload').addEventListener('change', async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      const text = await file.text();
      await loadDictionaryFromText(text, file.name);
      ev.target.value = '';
    });

    els.resultsBody.addEventListener('click', onResultsClick);

    document.addEventListener('keydown', (e) => {
      if (e.target === els.manualCopyInput) return;
      if (document.activeElement === els.manualCopyInput) return;

      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        copyNextBest();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        copyBest();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        cycleSelection();
      } else if (e.key === 'Escape') {
        els.syllableInput.value = '';
        setDefinitionDisplay('', false);
        cancelHeroDefinition();
        runSearch();
        els.syllableInput.focus();
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undoUsed();
      }
    });
  }

  function init() {
    applySettingsToUI();
    updateUsedUI();
    updateLearningUI();
    updatePracticeUI();
    initEvents();
    loadDefaultDictionary();
    focusPromptInput();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
