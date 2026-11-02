import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const assert = (condition, message) => {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exitCode = 1;
  }
};

const primitives = [
  'src/components/ui/Select.jsx',
  'src/components/ui/Checkbox.jsx',
  'src/components/ui/Progress.jsx',
  'src/components/ui/AlertDialog.jsx',
  'src/components/ui/Tabs.jsx',
  'src/components/ui/Toast.jsx'
];
primitives.forEach((file) => assert(exists(file), `missing primitive ${file}`));
assert(exists('src/components/CommandPalette.jsx'), 'missing command palette');
assert(read('src/App.jsx').includes('CommandPalette'), 'App.jsx does not mount CommandPalette');

const uiIndex = read('src/components/ui/index.js');
['Select', 'Checkbox', 'Progress', 'AlertDialog', 'Tabs', 'Toaster', 'ContextMenu'].forEach((name) => {
  assert(uiIndex.includes(name), `ui/index.js does not export ${name}`);
});

const tokens = read('src/styles/02-tokens.css');
['--font-display', '--font-body', '--font-mono', '--focus-ring', '--type-body-size'].forEach((token) => {
  assert(tokens.includes(token), `tokens missing ${token}`);
});

const html = read('index.html');
assert(!html.includes('fonts.googleapis.com'), 'index.html still loads Google Fonts');

const context = read('src/context/AppContext.jsx');
assert(context.includes('PlaybackProgressContext'), 'progress context missing');
assert(context.includes('usePlaybackProgress'), 'usePlaybackProgress hook missing');

const sourceFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(jsx?|mjs)$/.test(entry.name)) sourceFiles.push(full);
  }
};
walk(path.join(root, 'src'));

const alertHits = sourceFiles.filter((file) => /\balert\s*\(/.test(fs.readFileSync(file, 'utf8')));
assert(alertHits.length === 0, `native alert() still used in: ${alertHits.map((f) => path.relative(root, f)).join(', ')}`);

const selectAllowlist = ['LocalMusic.jsx', 'ListeningHeatmap.jsx', 'LyricExportModal.jsx', 'Settings.jsx', 'App.jsx'];
const selectHits = sourceFiles.filter((file) => {
  if (!/<select\b/.test(fs.readFileSync(file, 'utf8'))) return false;
  return !selectAllowlist.some((name) => file.endsWith(name));
});
assert(selectHits.length === 0, `unmigrated native <select> in: ${selectHits.map((f) => path.relative(root, f)).join(', ')}`);

// The export modal fetches lyrics in an effect. Keying that effect on the
// `lyrics` prop (default `[]`) refetched on every render and saturated the
// main process with furigana batches, so the default must be a module-level
// constant and the deps must stay primitive.
const exportModal = read('src/components/LyricExportModal.jsx');
assert(exportModal.includes('lyrics = EMPTY_LYRICS'), 'LyricExportModal must default lyrics to the stable EMPTY_LYRICS');
assert(exportModal.includes('[isOpen, hasExternalLyrics, songId]'), 'LyricExportModal lyric fetch must key on primitive deps');

// ModalContent renders a Radix Dialog.Content that the primitive centers with
// `position: fixed`. An inline `position: relative` on the style prop moves the
// dialog into normal flow at the end of <body> and it lands off-screen.
sourceFiles.forEach((file) => {
  const source = fs.readFileSync(file, 'utf8');
  const openingTag = source.match(/<ModalContent\b[\s\S]*?style=\{\{([\s\S]*?)\}\}/);
  if (!openingTag) return;
  assert(
    !/position:\s*['"]relative['"]/.test(openingTag[1]),
    `ModalContent in ${path.relative(root, file)} overrides position; the dialog will render off-screen`
  );
});

if (process.exitCode) {
  console.error('[ui-migration] FAILED');
} else {
  console.log('[ui-migration] OK: primitives, tokens, fonts, progress context, no alert(), no stray select');
}
