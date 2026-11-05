import { buildSemanticAnimationTokens } from '../../components/lyrics/foliaRows';

// "商籁" (Sonnet) compiles lyrics into a deterministic PV timeline: paragraphs
// are split on time gaps, grouped into shots, and each shot gets a fixed camera
// path plus a typography layout. Everything is a pure function of song time so
// seeking lands on exactly the same frame as continuous playback.

export const SONNET_SHOT_KINDS = [
  'editorial-column',
  'type-impact',
  'fragment-collage',
  'tracking-ribbon',
  'mask-reveal',
  'poster-blocks',
  'quiet-tableau'
];

export const SONNET_TRANSITION_KINDS = ['fast-blur', 'mono-glitch', 'camera-pull'];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const clamp01 = (value) => clamp(value, 0, 1);

const hashString = (value) => {
  const text = String(value);
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const createRandom = (seed) => {
  let state = hashString(seed) || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const median = (values) => {
  if (!values.length) return 0.5;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? sorted[middle]) + sorted[middle]) / 2
    : sorted[middle];
};

const lineStart = (line) => {
  const value = Number(line?.time ?? line?.startTime ?? line?.startSec ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const lineDuration = (line) => {
  const value = Number(line?.duration ?? line?.durationSec ?? 0);
  if (Number.isFinite(value) && value > 0) return value;
  const end = Number(line?.endTime ?? line?.endSec ?? 0);
  if (Number.isFinite(end) && end > lineStart(line)) return end - lineStart(line);
  return Math.max(0.6, Math.min(8, String(line?.text || '').length * 0.35));
};

const isWordLike = (text) => /[\p{L}\p{N}]/u.test(text);

const segmentHtml = (token, text) => {
  if (Array.isArray(token?.sourceTokens) && token.sourceTokens.length) {
    return token.sourceTokens.map((item) => item.rubyHtml || item.text || '').join('');
  }
  return token?.rubyHtml || text;
};

const withFallbackTiming = (segments, start, duration) => {
  const end = start + Math.max(0.4, duration);
  const timed = segments.filter((segment) => Number.isFinite(segment.startTime) && segment.startTime >= 0);
  if (!segments.length) return [];
  if (!timed.length) {
    const totalLength = segments.reduce((sum, segment) => sum + Math.max(1, segment.text.length), 0);
    let cursor = start;
    return segments.map((segment) => {
      const span = (end - start) * (Math.max(1, segment.text.length) / totalLength);
      const next = { ...segment, startTime: cursor, endTime: cursor + span, timed: true };
      cursor += span;
      return next;
    });
  }

  const average = (end - start) / Math.max(1, segments.length);
  let lastEnd = start;
  return segments.map((segment) => {
    if (Number.isFinite(segment.startTime) && segment.startTime >= 0) {
      lastEnd = Math.max(lastEnd, Number(segment.endTime) || segment.startTime + average);
      return { ...segment, timed: true };
    }
    const nextStart = lastEnd;
    const nextEnd = nextStart + average;
    lastEnd = nextEnd;
    return { ...segment, startTime: nextStart, endTime: nextEnd, timed: true };
  });
};

const buildLineSegments = (line, start, duration) => {
  const groups = buildSemanticAnimationTokens(line);
  const segments = (Array.isArray(groups) ? groups : [])
    .map((token) => {
      const text = String(token?.text || '');
      return {
        text,
        html: segmentHtml(token, text),
        startTime: Number(token?.startTime),
        endTime: Number(token?.endTime),
        timed: token?.timed !== false,
        wordLike: isWordLike(text)
      };
    })
    .filter((segment) => segment.text.trim().length > 0);
  return withFallbackTiming(segments, start, duration);
};

const resolveGapThreshold = (lines) => {
  const gaps = lines
    .slice(1)
    .map((line, index) => line.startTime - lines[index].renderEndTime)
    .filter((gap) => gap > 0);
  return clamp(median(gaps) * 2.5, 1.25, 3.5);
};

const metadataChanged = (previous, next) => (
  (previous.blockIndex !== undefined && next.blockIndex !== undefined && previous.blockIndex !== next.blockIndex)
  || (previous.songPart !== undefined && next.songPart !== undefined && previous.songPart !== next.songPart)
);

const splitOversizedParagraph = (draft) => {
  const output = [];
  let remaining = draft.lines;
  let boundary = draft.boundary;
  let guard = 0;
  const duration = () => remaining[remaining.length - 1].renderEndTime - remaining[0].startTime;

  while (remaining.length > 6 || (remaining.length > 1 && duration() > 18)) {
    if (guard++ > 64) break;
    const candidates = remaining.slice(2, -1).map((line, offset) => ({
      index: offset + 2,
      gap: line.startTime - remaining[offset + 1].renderEndTime
    }));
    const best = candidates
      .filter((candidate) => !Number.isNaN(candidate.gap))
      .sort((a, b) => b.gap - a.gap)[0];
    const splitIndex = clamp(best?.index ?? Math.floor(remaining.length / 2), 1, remaining.length - 1);
    const head = remaining.slice(0, splitIndex);
    output.push({ lines: head, boundary });
    remaining = remaining.slice(splitIndex);
    boundary = head.length >= 6 ? 'line-cap' : 'duration-cap';
  }
  output.push({ lines: remaining, boundary });
  return output;
};

const classifyParagraph = (lines, index, total) => {
  if (lines.some((item) => item.isChorus || /chorus|副歌/i.test(item.songPart ?? ''))) return 'chorus';
  if (lines.some((item) => /bridge|break|間奏|ブリッジ/i.test(item.songPart ?? ''))) return 'break';
  if (index === total - 1) return 'outro';
  const duration = lines[lines.length - 1].renderEndTime - lines[0].startTime;
  const segmentCount = lines.reduce(
    (sum, line) => sum + line.segments.filter((segment) => segment.wordLike).length,
    0
  );
  const punctuationCount = lines.reduce(
    (sum, line) => sum + (String(line.line.fullText ?? line.line.text ?? '').match(/[!?！？…]/g)?.length ?? 0),
    0
  );
  if (duration <= 3.5 || segmentCount <= 3) return 'breath';
  if (punctuationCount >= 2 || segmentCount / Math.max(duration, 1) > 2.5) return 'lift';
  return 'verse';
};

const groupShotLines = (lines) => {
  const groups = [];
  let current = [];
  let groupStart = 0;
  lines.forEach((line) => {
    if (!current.length) {
      current.push(line);
      groupStart = line.startTime;
      return;
    }
    const duration = line.renderEndTime - groupStart;
    if (current.length < 4 && duration <= 6) {
      current.push(line);
    } else {
      groups.push(current);
      current = [line];
      groupStart = line.startTime;
    }
  });
  if (current.length) groups.push(current);
  return groups;
};

const chooseWithoutRepeat = (choices, seed, previous) => {
  const start = hashString(seed) % choices.length;
  for (let offset = 0; offset < choices.length; offset += 1) {
    const candidate = choices[(start + offset) % choices.length];
    if (candidate !== previous) return candidate;
  }
  return choices[start];
};

const shotZoomRange = (kind) => {
  if (kind === 'poster-blocks') return { base: 1.02, span: 0.16 };
  if (kind === 'quiet-tableau') return { base: 1.12, span: 0.2 };
  return { base: 1.22, span: 0.26 };
};

const buildShot = (group, kind, paragraphIndex, shotIndex, seed, previousKind, previousTransition, transitionIn) => {
  const signature = group.map((item) => item.line.fullText ?? item.line.text ?? '').join('|');
  let shotKind = chooseWithoutRepeat(
    SONNET_SHOT_KINDS,
    `${seed}:${paragraphIndex}:${shotIndex}:${signature}`,
    previousKind
  );
  const wordCount = group.reduce(
    (sum, item) => sum + item.segments.filter((segment) => segment.wordLike).length,
    0
  );
  if (kind === 'breath' && shotIndex === 0 && wordCount <= 2) shotKind = 'quiet-tableau';
  if (kind === 'chorus' && shotKind === 'quiet-tableau') shotKind = 'type-impact';

  const random = createRandom(`${seed}:${paragraphIndex}:${shotIndex}:camera`);
  const zoom = shotZoomRange(shotKind);
  const segments = group.flatMap((item) => item.segments.map((segment) => ({
    ...segment,
    lineIndex: item.sourceIndex
  })));

  return {
    id: `sonnet-p${paragraphIndex}-s${shotIndex}`,
    kind: shotKind,
    paragraphKind: kind,
    startTime: group[0].startTime,
    endTime: Math.max(group[group.length - 1].renderEndTime, group[0].startTime + 0.4),
    lineIndices: group.map((item) => item.sourceIndex),
    lines: group.map((item) => item.line),
    segments,
    seed: hashString(`${seed}:${paragraphIndex}:${shotIndex}:typo`),
    camera: {
      x: (random() - 0.5) * 0.12,
      y: (random() - 0.5) * 0.1,
      zoom: zoom.base + random() * zoom.span,
      rotation: (random() - 0.5) * 0.08,
      phase: random() * Math.PI * 2
    },
    transitionIn,
    transitionOut: null
  };
};

export function compileSonnetProgram(lyrics, seed = 'sonnet') {
  const resolvedSeed = String(seed);
  const rawLines = (Array.isArray(lyrics) ? lyrics : []).filter((line) => line && String(line.text || '').trim());
  if (!rawLines.length) {
    return { seed: resolvedSeed, lines: [], paragraphs: [], shots: [], gapThreshold: 2 };
  }

  const lines = rawLines.map((line, sourceIndex) => {
    const startTime = lineStart(line);
    const duration = lineDuration(line);
    const segments = buildLineSegments(line, startTime, duration);
    const endTime = Math.max(startTime + duration, ...segments.map((segment) => segment.endTime));
    return {
      sourceIndex,
      line,
      startTime,
      endTime,
      renderEndTime: endTime,
      segments,
      blockIndex: line.blockIndex,
      songPart: line.songPart,
      isChorus: line.isChorus
    };
  });

  lines.forEach((line, index) => {
    const next = lines[index + 1];
    if (next) line.renderEndTime = Math.max(line.startTime, Math.min(line.endTime, next.startTime));
  });

  const gapThreshold = resolveGapThreshold(lines);
  const drafts = [];
  let current = { lines: [], boundary: 'song-start' };
  lines.forEach((line, index) => {
    const previous = lines[index - 1];
    const gap = previous ? line.startTime - previous.renderEndTime : 0;
    const boundary = previous && metadataChanged(previous, line)
      ? 'metadata'
      : previous && gap >= gapThreshold
        ? 'time-gap'
        : null;
    if (boundary && current.lines.length) {
      drafts.push(...splitOversizedParagraph(current));
      current = { lines: [], boundary };
    }
    current.lines.push(line);
  });
  if (current.lines.length) drafts.push(...splitOversizedParagraph(current));

  let previousShot = null;
  let previousTransition = null;
  const paragraphs = [];
  const shots = [];

  drafts.forEach((draft, paragraphIndex) => {
    if (!draft.lines.length) return;
    const kind = classifyParagraph(draft.lines, paragraphIndex, drafts.length);
    const groups = groupShotLines(draft.lines);
    const paragraphShots = [];

    groups.forEach((group, shotIndex) => {
      const transitionIn = shotIndex === 0 && paragraphIndex > 0 && previousTransition
        ? previousTransition
        : null;
      const shot = buildShot(
        group,
        kind,
        paragraphIndex,
        shotIndex,
        resolvedSeed,
        previousShot,
        previousTransition,
        transitionIn
      );
      paragraphShots.push(shot);
      shots.push(shot);
      previousShot = shot.kind;
    });

    // The transition leaving this paragraph runs on the first shot of the next
    // paragraph, which is the frame that actually replaces this one on screen.
    if (paragraphIndex < drafts.length - 1) {
      previousTransition = chooseWithoutRepeat(
        SONNET_TRANSITION_KINDS,
        `${resolvedSeed}:${paragraphIndex}:transition`,
        previousTransition
      );
      if (paragraphShots.length) paragraphShots[paragraphShots.length - 1].transitionOut = previousTransition;
    }

    paragraphs.push({
      id: `sonnet-para-${paragraphIndex}`,
      kind,
      boundary: draft.boundary,
      startTime: draft.lines[0].startTime,
      endTime: draft.lines[draft.lines.length - 1].renderEndTime,
      shots: paragraphShots
    });
  });

  return { seed: resolvedSeed, lines, paragraphs, shots, gapThreshold };
}

export function findSonnetShotIndex(program, time) {
  const shots = program?.shots || [];
  if (!shots.length) return -1;
  if (time <= shots[0].startTime) return 0;
  for (let index = shots.length - 1; index >= 0; index -= 1) {
    if (time >= shots[index].startTime) return index;
  }
  return 0;
}

export function findSonnetShot(program, time) {
  const index = findSonnetShotIndex(program, time);
  return index < 0 ? null : { index, shot: program.shots[index] };
}

// ---------------------------------------------------------------------------
// Camera: each shot gets a deliberate, seek-safe path. Frames are defined for
// every shot kind rather than derived from audio, so a paused seek and playback
// agree on the composition.
// ---------------------------------------------------------------------------

const cubicCoordinate = (point1, point2, time) => {
  const inverse = 1 - time;
  return 3 * inverse * inverse * time * point1
    + 3 * inverse * time * time * point2
    + time * time * time;
};

export const resolveCubicBezier = (x1, y1, x2, y2, value) => {
  const target = clamp01(value);
  if (target === 0 || target === 1) return target;
  let low = 0;
  let high = 1;
  let parameter = target;
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const x = cubicCoordinate(x1, x2, parameter);
    if (x < target) low = parameter;
    else high = parameter;
    parameter = (low + high) / 2;
  }
  return cubicCoordinate(y1, y2, parameter);
};

export const easeSonnetInOut = (value) => resolveCubicBezier(0.65, 0, 0.35, 1, value);
export const easeSonnetExpoOut = (value) => (value >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp01(value)));

export const resolveShotPathProgress = (kind, progress) => {
  const linear = clamp01(progress);
  if (kind === 'tracking-ribbon' || kind === 'fragment-collage' || kind === 'quiet-tableau' || kind === 'poster-blocks') {
    return linear * 0.55 + easeSonnetInOut(linear) * 0.45;
  }
  if (linear < 0.18) return easeSonnetExpoOut(linear / 0.18) * 0.22;
  if (linear < 0.78) return 0.22 + ((linear - 0.18) / 0.6) * 0.56;
  const settle = (linear - 0.78) / 0.22;
  return 0.78 + (1 - (1 - settle) * (1 - settle)) * 0.22;
};

const SHOT_MOTION_FRAMES = {
  'editorial-column': (eased) => ({
    x: -0.055 + eased * 0.095,
    y: 0.025 - eased * 0.04,
    scale: 0.98 + eased * 0.07,
    rotation: -0.006 + eased * 0.01
  }),
  'type-impact': (eased, linear) => ({
    x: -0.035 + eased * 0.07,
    y: 0.018 - eased * 0.028,
    scale: 1 + (1 - easeSonnetExpoOut(Math.min(linear / 0.18, 1))) * 0.22 + eased * 0.08,
    rotation: -0.01 + eased * 0.016
  }),
  'fragment-collage': (eased) => ({
    x: -0.045 + eased * 0.085,
    y: 0.028 - Math.sin(eased * Math.PI) * 0.055,
    scale: 0.97 + eased * 0.09,
    rotation: -0.014 + eased * 0.028
  }),
  'tracking-ribbon': (eased) => ({
    x: -0.16 + eased * 0.28,
    y: 0.05 - eased * 0.085,
    scale: 0.98 + eased * 0.07,
    rotation: 0.008 - eased * 0.014
  }),
  'mask-reveal': (eased) => ({
    x: 0.035 - eased * 0.065,
    y: 0.1 - eased * 0.135,
    scale: 0.96 + eased * 0.12,
    rotation: -0.006 + eased * 0.009
  }),
  'poster-blocks': (eased) => ({
    x: -0.012 + eased * 0.024,
    y: 0.008 - eased * 0.016,
    scale: 0.99 + eased * 0.025,
    rotation: -0.0015 + eased * 0.003
  }),
  'quiet-tableau': (eased) => ({
    x: -0.022 + eased * 0.04,
    y: 0.014 - eased * 0.025,
    scale: 1 + eased * 0.028,
    rotation: -0.002 + eased * 0.003
  })
};

export const resolveShotMotionFrame = (kind, progress) => {
  const linear = clamp01(progress);
  const eased = resolveShotPathProgress(kind, linear);
  const frame = SHOT_MOTION_FRAMES[kind] || SHOT_MOTION_FRAMES['quiet-tableau'];
  return frame(eased, linear);
};

export const resolveSonnetCameraBreath = (time, phase = 0) => {
  const tau = time * Math.PI * 2;
  return {
    x: (Math.sin(tau * 0.13 + phase) * 0.65 + Math.sin(tau * 0.31 + phase * 1.7) * 0.35) * 0.006,
    y: (Math.cos(tau * 0.11 + phase * 2.3) * 0.65 + Math.sin(tau * 0.29 + phase * 0.9) * 0.35) * 0.006,
    scale: Math.sin(tau * 0.09 + phase * 1.3) * 0.002,
    rotation: Math.sin(tau * 0.07 + phase * 2.9) * 0.0015
  };
};

export const resolveSonnetBreathWeight = (time, revealDoneTime, ramp = 1.2) => {
  if (ramp <= 0) return time >= revealDoneTime ? 1 : 0;
  return easeSonnetInOut(clamp01((time - revealDoneTime) / ramp));
};

export const resolveTimelineShake = (time, intensity) => {
  if (intensity <= 0) return { x: 0, y: 0, rotation: 0 };
  return {
    x: Math.sin(time * 123.456) * Math.cos(time * 789.123) * 0.02 * intensity,
    y: Math.cos(time * 345.678) * Math.sin(time * 901.234) * 0.02 * intensity,
    rotation: Math.sin(time * 567.89) * 0.005 * intensity
  };
};

// ---------------------------------------------------------------------------
// Typography: semantic segments are promoted to hero / support roles and laid
// out according to the shot kind. Positions are percentages of the stage.
// ---------------------------------------------------------------------------

const CJK_RE = /[㐀-鿿぀-ヿ가-힯]/u;

const scoreSegment = (segment) => {
  const text = segment.text.trim();
  if (!text) return -1;
  let score = text.length;
  if (CJK_RE.test(text)) score += 1;
  if (text.length <= 6) score += 1;
  if (!segment.wordLike) score -= 4;
  return score;
};

const SHOT_TYPE_SCALES = {
  'editorial-column': { hero: 4.0, support: 1.2 },
  'type-impact': { hero: 5.5, support: 1.5 },
  'fragment-collage': { hero: 3.2, support: 1.35 },
  'tracking-ribbon': { hero: 3.5, support: 1.5 },
  'mask-reveal': { hero: 4.5, support: 1.6 },
  'poster-blocks': { hero: 4.4, support: 1.15 },
  'quiet-tableau': { hero: 3.0, support: 1.15 }
};

const clampPercent = (value) => clamp(value, 14, 86);

export function buildSonnetLayout(shot, options = {}) {
  const {
    baseFont = 24,
    typographyMotion = 1,
    showGiantText = false
  } = options;

  const segments = (shot?.segments || []).filter((segment) => segment.text.trim());
  if (!segments.length) return { placements: [], ghost: null };

  const scores = segments.map(scoreSegment);
  const heroScore = Math.max(...scores);
  const heroIndex = scores.indexOf(heroScore);
  const semiHeroes = new Set(
    scores
      .map((score, index) => (index !== heroIndex && score >= heroScore * 0.62 ? index : -1))
      .filter((index) => index >= 0)
  );

  const kind = shot.kind;
  const scales = SHOT_TYPE_SCALES[kind] || SHOT_TYPE_SCALES['quiet-tableau'];
  const motionFactor = 0.6 + clamp(typographyMotion, 0, 2) * 0.4;
  const heroScale = 1 + (scales.hero - 1) * motionFactor;
  const supportScale = 1 + (scales.support - 1) * motionFactor;
  const semiScale = Math.max(supportScale * 1.3, heroScale * 0.7);
  const random = createRandom(`${shot.seed}:${kind}:layout`);
  const variant = (shot.seed >>> 0) % 5;
  const placements = [];

  const place = (segmentIndex, x, y, scale, extra = {}) => {
    const segment = segments[segmentIndex];
    if (!segment) return;
    const role = segmentIndex === heroIndex ? 'hero' : semiHeroes.has(segmentIndex) ? 'semi' : 'support';
    const vertical = extra.vertical === true;
    placements.push({
      key: `${shot.id}-${segmentIndex}`,
      segmentIndex,
      text: segment.text,
      html: segment.html,
      role,
      x: clampPercent(x),
      y: clampPercent(y),
      scale: role === 'hero' ? heroScale : role === 'semi' ? semiScale : supportScale,
      rotation: extra.rotation ?? 0,
      vertical,
      align: extra.align || 'center',
      startTime: segment.startTime,
      endTime: segment.endTime,
      block: Boolean(extra.block),
      outline: Boolean(extra.outline),
      ribbon: Boolean(extra.ribbon)
    });
  };

  const supports = segments.map((_, index) => index).filter((index) => index !== heroIndex);

  if (kind === 'editorial-column') {
    const heroRight = variant === 1 || variant === 3;
    if (variant === 2) {
      place(heroIndex, 50, 27, heroScale, { vertical: false });
      supports.slice(0, 4).forEach((index, position) => {
        place(index, 22 + position * 18.5, 48 + (position % 2) * 12, supportScale, {
          align: 'center',
          rotation: (random() - 0.5) * 0.03
        });
      });
    } else if (variant === 3) {
      place(heroIndex, 22, 50, heroScale, { vertical: true });
      supports.slice(0, 1).forEach((index) => place(index, 70, 34, semiScale, { align: 'center' }));
      supports.slice(1, 5).forEach((index, position) => {
        place(index, 72, 52 + position * 9, supportScale, { align: 'left' });
      });
    } else if (variant === 4) {
      place(heroIndex, 20, 50, heroScale * 1.05, { vertical: true });
      supports.slice(0, 5).forEach((index, position) => {
        place(index, 68, 32 + position * 11, supportScale, { align: 'center' });
      });
    } else {
      place(heroIndex, heroRight ? 76 : 24, 50, heroScale, { vertical: true });
      supports.slice(0, 5).forEach((index, position) => {
        place(index, heroRight ? 30 : 68, 32 + position * 11, supportScale, { align: heroRight ? 'right' : 'left' });
      });
    }
  } else if (kind === 'type-impact') {
    place(heroIndex, 50, 45, heroScale, { rotation: -0.012 });
    supports.slice(0, 6).forEach((index, position) => {
      const positions = [
        [30, 20], [70, 22], [22, 72], [50, 78], [78, 74], [50, 14]
      ];
      const [x, y] = positions[position % positions.length];
      place(index, x, y, supportScale, { outline: true, rotation: (random() - 0.5) * 0.06 });
    });
  } else if (kind === 'fragment-collage') {
    const cells = [
      [24, 28], [50, 22], [76, 30],
      [20, 54], [50, 50], [78, 56],
      [30, 78], [58, 82], [80, 76]
    ];
    const heroCell = 4;
    place(heroIndex, cells[heroCell][0], cells[heroCell][1], heroScale, {
      rotation: (random() - 0.5) * 0.16
    });
    const freeCells = cells.filter((_, index) => index !== heroCell);
    supports.slice(0, freeCells.length).forEach((index, position) => {
      const [x, y] = freeCells[(position * 3 + variant) % freeCells.length];
      place(index, x + (random() - 0.5) * 8, y + (random() - 0.5) * 8, supportScale, {
        rotation: (random() - 0.5) * 0.42,
        vertical: position % 4 === 0
      });
    });
  } else if (kind === 'tracking-ribbon') {
    // Keep the hero's centre column clear: supports sit in a top and a bottom
    // band, spread horizontally, so a vertical hero never collides with them.
    place(heroIndex, 50, 50, heroScale, { rotation: 0 });
    supports.forEach((index, position) => {
      const band = position % 2;
      const inBand = Math.floor(position / 2);
      const countInBand = Math.max(1, Math.ceil((supports.length - band) / 2));
      const x = 50 + (inBand - (countInBand - 1) / 2) * Math.min(24, 56 / countInBand);
      place(index, x, band === 0 ? 24 : 76, supportScale, {
        rotation: band === 0 ? -0.012 : 0.012,
        ribbon: true
      });
    });
  } else if (kind === 'mask-reveal') {
    place(heroIndex, 50, 44, heroScale, { rotation: 0, vertical: true });
    const supportSpots = [[20, 68], [80, 68], [20, 82], [80, 82], [50, 90]];
    supports.slice(0, supportSpots.length).forEach((index, position) => {
      const [x, y] = supportSpots[position];
      place(index, x, y, supportScale, { align: 'center' });
    });
  } else if (kind === 'poster-blocks') {
    const columns = segments.length > 4 ? 3 : 2;
    const rows = Math.max(1, Math.ceil((segments.length + 1) / columns));
    place(heroIndex, 50, 34, heroScale, { block: true });
    supports.slice(0, 8).forEach((index, position) => {
      const row = Math.floor(position / columns);
      const column = position % columns;
      const x = ((column + 0.5) / columns) * 100;
      const y = 34 + (row + 1) * Math.min(18, 52 / rows);
      place(index, x, y, supportScale, { block: true, align: 'center' });
    });
  } else {
    // quiet-tableau
    place(heroIndex, 50, 40, heroScale, { vertical: variant < 2 });
    supports.slice(0, 4).forEach((index, position) => {
      place(index, 50 + (position % 2 === 0 ? -1 : 1) * Math.min(18, position * 5), 62 + position * 8, supportScale, {
        rotation: (random() - 0.5) * 0.02
      });
    });
  }

  const ghost = showGiantText
    ? {
      key: `${shot.id}-ghost`,
      text: segments[heroIndex].text,
      x: 50,
      y: 50,
      scale: heroScale * 2.1,
      rotation: -0.03
    }
    : null;

  return { placements, ghost };
}
