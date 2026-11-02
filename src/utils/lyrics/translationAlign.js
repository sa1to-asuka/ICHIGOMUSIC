// Cross-source translation transplant.
//
// A song often has two usable lyric sources: one with word-level timing but no
// translation, and another that is line-timed but bilingual. This module maps
// the translations of the second onto the lines of the first.
//
// Everything here is conservative on purpose: an unmatched line is far better
// than a translated line attached to the wrong lyric, so a weak global match is
// discarded instead of partially applied.

const FULLWIDTH_START = 0xff01;
const FULLWIDTH_END = 0xff5e;
// ASCII punctuation plus the CJK punctuation block (、。〈〉「」…); full-width
// ASCII forms are folded to ASCII before this runs.
const PUNCTUATION_RE = /[\s　-〿!-/:-@[-`{-~]/g;

/** Strip punctuation/whitespace and fold full-width forms, for comparison only. */
export function normalizeLyricText(text) {
  if (!text || typeof text !== 'string') return '';
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0);
    out += code >= FULLWIDTH_START && code <= FULLWIDTH_END
      ? String.fromCharCode(code - 0xfee0)
      : ch;
  }
  return out.replace(PUNCTUATION_RE, '').toLowerCase();
}

function bigrams(text) {
  const grams = new Set();
  for (let i = 0; i < text.length - 1; i += 1) grams.add(text.slice(i, i + 2));
  if (grams.size === 0 && text) grams.add(text);
  return grams;
}

/** Sørensen–Dice coefficient over character bigrams (0..1). */
export function textSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const left = bigrams(a);
  const right = bigrams(b);
  let shared = 0;
  left.forEach((gram) => {
    if (right.has(gram)) shared += 1;
  });
  return (2 * shared) / (left.size + right.size);
}

function isFilledLine(line) {
  const text = (line?.text || '').trim();
  if (!text) return false;
  if (line?.isInterlude) return false;
  return !/^\.+$/.test(text);
}

export function hasAnyTranslation(lines) {
  return Array.isArray(lines) && lines.some((line) => Boolean((line?.translation || '').trim()));
}

function buildCompanion(lines) {
  return (lines || [])
    .filter((line) => isFilledLine(line) && Boolean((line?.translation || '').trim()))
    .map((line) => ({
      time: Number(line.time) || 0,
      text: line.text,
      translation: String(line.translation).trim(),
      normalized: normalizeLyricText(line.text)
    }))
    .sort((a, b) => a.time - b.time);
}

// Nearest companion per target, one companion used at most once. `offset` is
// added to the companion's clock so a whole-song drift can be compensated.
function assignByTime(targetIndexes, targetLines, companions, offset, toleranceSec) {
  const used = new Set();
  const assigned = new Map();
  const deltas = [];

  for (const index of targetIndexes) {
    const targetTime = Number(targetLines[index].time) || 0;
    let best = -1;
    let bestDelta = Infinity;
    for (let j = 0; j < companions.length; j += 1) {
      if (used.has(j)) continue;
      const delta = Math.abs(companions[j].time + offset - targetTime);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = j;
      }
    }
    if (best >= 0 && bestDelta <= toleranceSec) {
      used.add(best);
      assigned.set(index, best);
      deltas.push(companions[best].time + offset - targetTime);
    }
  }

  return { assigned, deltas };
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Copies `translation` from `sourceLines` onto `targetLines`.
 * Existing translations are never overwritten and placeholder lines are skipped.
 * Returns the original array reference when nothing trustworthy matched.
 */
export function alignTranslations(targetLines, sourceLines, options = {}) {
  const {
    toleranceSec = 0.6,
    minSimilarity = 0.55,
    minCoverage = 0.5
  } = options;

  if (!Array.isArray(targetLines) || targetLines.length === 0) return targetLines;

  const companions = buildCompanion(sourceLines);
  if (companions.length === 0) return targetLines;

  const candidates = [];
  targetLines.forEach((line, index) => {
    if (!isFilledLine(line)) return;
    if ((line.translation || '').trim()) return;
    candidates.push(index);
  });
  if (candidates.length === 0) return targetLines;

  let { assigned, deltas } = assignByTime(candidates, targetLines, companions, 0, toleranceSec);

  // Lyric providers timestamp the same recording differently; retry with the
  // median drift once enough pairs agree on a direction.
  if (deltas.length >= 3) {
    const drift = median(deltas);
    if (Math.abs(drift) > 0.15 && Math.abs(drift) <= 5) {
      const retried = assignByTime(candidates, targetLines, companions, drift, toleranceSec);
      if (retried.assigned.size >= assigned.size) assigned = retried.assigned;
    }
  }

  const usedCompanions = new Set(assigned.values());

  // Text similarity for lines whose timing drifted too far to trust.
  for (const index of candidates) {
    if (assigned.has(index)) continue;
    const targetNorm = normalizeLyricText(targetLines[index].text);
    if (!targetNorm) continue;

    let best = -1;
    let bestScore = 0;
    let secondScore = 0;
    for (let j = 0; j < companions.length; j += 1) {
      if (usedCompanions.has(j)) continue;
      const score = textSimilarity(targetNorm, companions[j].normalized);
      if (score > bestScore) {
        secondScore = bestScore;
        bestScore = score;
        best = j;
      } else if (score > secondScore) {
        secondScore = score;
      }
    }
    if (best >= 0 && bestScore >= minSimilarity && bestScore - secondScore >= 0.05) {
      assigned.set(index, best);
      usedCompanions.add(best);
    }
  }

  // A line split across two word rows keeps the same text in both sources, so
  // containment catches those without a full similarity score.
  for (const index of candidates) {
    if (assigned.has(index)) continue;
    const targetNorm = normalizeLyricText(targetLines[index].text);
    if (targetNorm.length < 2) continue;

    let unique = -1;
    let hits = 0;
    for (let j = 0; j < companions.length; j += 1) {
      if (usedCompanions.has(j)) continue;
      const companionNorm = companions[j].normalized;
      if (companionNorm.length < 2) continue;
      if (companionNorm.includes(targetNorm) || targetNorm.includes(companionNorm)) {
        unique = j;
        hits += 1;
      }
    }
    if (hits === 1) {
      assigned.set(index, unique);
      usedCompanions.add(unique);
    }
  }

  // A partial fill usually means the two lists disagree about the song; keep
  // the untouched lyrics rather than mixing half-right translations in.
  if (assigned.size / candidates.length < minCoverage) return targetLines;

  return targetLines.map((line, index) => {
    const companionIndex = assigned.get(index);
    if (companionIndex === undefined) return line;
    return { ...line, translation: companions[companionIndex].translation };
  });
}

/**
 * Fills missing translations on `targetLines` from a bilingual companion list.
 * Returns `targetLines` untouched when it already carries translations.
 */
export function fillMissingTranslations(targetLines, companionLines, options) {
  if (!Array.isArray(targetLines) || targetLines.length === 0) return targetLines;
  if (hasAnyTranslation(targetLines)) return targetLines;
  return alignTranslations(targetLines, companionLines, options);
}
