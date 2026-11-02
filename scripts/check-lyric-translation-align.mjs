// Guards the cross-source translation transplant that fills missing
// translations on word-timed lyrics from a bilingual companion list.
import {
  alignTranslations,
  fillMissingTranslations,
  normalizeLyricText,
  textSimilarity
} from '../src/utils/lyrics/translationAlign.js';

let failures = 0;
const assert = (condition, message) => {
  if (condition) return;
  failures += 1;
  console.error(`x ${message}`);
};

const source = (entries) => entries.map(([time, text, translation]) => ({ time, text, translation }));

// 1. Same timeline: every line picks up its translation.
{
  const target = [
    { time: 0, text: '夜を越えて', words: [{ text: '夜', startSec: 0, endSec: 1 }] },
    { time: 4, text: '君を想う' },
    { time: 8, text: 'また会えるかな' }
  ];
  const companion = source([
    [0.1, '夜を越えて', '越过黑夜'],
    [4.2, '君を想う', '想着你'],
    [8.05, 'また会えるかな', '还能再见面吗']
  ]);
  const merged = alignTranslations(target, companion);
  assert(merged[0].translation === '越过黑夜', 'exact-time match should fill line 1');
  assert(merged[1].translation === '想着你', 'exact-time match should fill line 2');
  assert(merged[2].translation === '还能再见面吗', 'exact-time match should fill line 3');
  assert(merged[0].words.length === 1, 'word timing must survive the merge');
}

// 2. Whole-song drift: the companion clock runs 1.2s late.
{
  const target = [
    { time: 0, text: 'aaa' },
    { time: 5, text: 'bbb' },
    { time: 10, text: 'ccc' },
    { time: 15, text: 'ddd' }
  ];
  const companion = source([
    [1.2, 'aaa', 'A'],
    [6.2, 'bbb', 'B'],
    [11.2, 'ccc', 'C'],
    [16.2, 'ddd', 'D']
  ]);
  const merged = alignTranslations(target, companion);
  assert(merged.every((line) => line.translation), 'global drift should still align every line');
  assert(merged[2].translation === 'C', 'global drift should keep the right pairing');
}

// 3. Text fallback when timings disagree wildly.
{
  const target = [
    { time: 0, text: '空は青い' },
    { time: 3, text: '風が吹く' },
    { time: 6, text: '海へ行こう' }
  ];
  const companion = source([
    [40, '空は青い', '天空湛蓝'],
    [43, '風が吹く', '风吹过'],
    [46, '海へ行こう', '去海边吧']
  ]);
  const merged = alignTranslations(target, companion);
  assert(merged[0]?.translation === '天空湛蓝', 'text similarity should recover far-off timings');
  assert(merged[2]?.translation === '去海边吧', 'text similarity should recover the last line');
}

// 4. Never overwrite an existing translation.
{
  const target = [{ time: 0, text: 'hello', translation: '你好（手改）' }];
  const companion = source([[0, 'hello', '你好（来源）']]);
  const merged = alignTranslations(target, companion);
  assert(merged[0].translation === '你好（手改）', 'existing translations must win');
}

// 5. Weak overlap is discarded instead of half-applied.
{
  const target = [
    { time: 0, text: 'alpha' },
    { time: 2, text: 'beta' },
    { time: 4, text: 'gamma' },
    { time: 6, text: 'delta' }
  ];
  const companion = source([[0, '完全不同的歌词', 'X']]);
  const merged = alignTranslations(target, companion);
  assert(merged === target, 'low coverage must return the original array');
  assert(!merged.some((line) => line.translation), 'low coverage must not attach anything');
}

// 6. Placeholder / interlude lines are left alone.
{
  const target = [
    { time: 0, text: '......', isInterlude: true },
    { time: 2, text: '本文です' }
  ];
  const companion = source([[0, '......', '间奏'], [2, '本文です', '正文']]);
  const merged = alignTranslations(target, companion);
  assert(!merged[0].translation, 'interlude lines must not receive a translation');
  assert(merged[1].translation === '正文', 'text lines should still be filled');
}

// 7. fillMissingTranslations is a no-op once translations exist.
{
  const target = [{ time: 0, text: 'a', translation: 'A' }];
  const merged = fillMissingTranslations(target, source([[0, 'a', 'AA']]));
  assert(merged === target, 'already-translated lyrics must be returned untouched');
}

// 8. Normalisation folds width/case/punctuation.
{
  assert(normalizeLyricText('ＡＢＣ！') === 'abc', 'full-width forms and punctuation must fold');
  assert(textSimilarity(normalizeLyricText('夜を越えて'), normalizeLyricText('夜を越えて。')) === 1,
    'punctuation-only differences must score 1');
}

if (failures > 0) {
  console.error(`[translation-align] FAILED (${failures})`);
  process.exit(1);
}
console.log('[translation-align] OK: 8 alignment invariants');
