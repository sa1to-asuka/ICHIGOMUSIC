import React, { useEffect, useMemo, useRef, useState } from 'react';
import { subscribeLyricClock } from '../../utils/lyricClock';
import {
  buildSonnetLayout,
  clamp01,
  compileSonnetProgram,
  createRandom,
  easeSonnetExpoOut,
  findSonnetShotIndex,
  resolveShotMotionFrame,
  resolveSonnetBreathWeight,
  resolveSonnetCameraBreath,
  resolveTimelineShake
} from '../../utils/lyrics/sonnetProgram';

// "商籁" (Sonnet) — editorial kinetic typography driven by a deterministic
// shot program. Lyrics are split into semantic segments; each paragraph is cut
// into shots with their own camera path, hero word and layout, so the picture
// jumps between magazine columns, type posters, ribbons, collages and quiet
// tableaux as the song moves.

const CJK_RE = /[㐀-鿿぀-ヿ가-힯]/u;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const readConfig = (config = {}) => ({
  camera: clamp(Number(config.sonnetCamera ?? 1), 0, 2),
  typography: clamp(Number(config.sonnetTypography ?? 1), 0, 2),
  density: clamp(Number(config.sonnetDensity ?? 1), 0, 2),
  postProcess: config.sonnetPostProcess !== false,
  grain: clamp(Number(config.sonnetGrain ?? 0.18), 0, 1),
  rgbShift: clamp(Number(config.sonnetRgbShift ?? 0.35), 0, 1),
  halftone: clamp(Number(config.sonnetHalftone ?? 0.1), 0, 1),
  vignette: clamp(Number(config.sonnetVignette ?? 0.9), 0, 2),
  outerFrame: config.sonnetOuterFrame || 'frame',
  showGuide: config.sonnetShowGuide === true,
  showMg: config.sonnetShowMg !== false,
  showGiantText: config.sonnetShowGiantText !== false,
  transitions: config.sonnetEnableTransitions !== false
});

export default function SonnetLyrics({
  lyrics = [],
  activeLineIndex = -1,
  engineRef,
  fontPx = 24,
  translationPx = 16,
  fontStack,
  coverUrl,
  themeColor,
  songKey,
  config = {},
  globalOffset = 0,
  showTranslation = true
}) {
  const stageRef = useRef(null);
  const cameraRef = useRef(null);
  const segRefs = useRef(new Map());
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const tuning = useMemo(() => readConfig(config), [config]);
  const seed = useMemo(() => String(config?.sonnetSeed || songKey || 'sonnet'), [config?.sonnetSeed, songKey]);
  const program = useMemo(() => compileSonnetProgram(lyrics, seed), [lyrics, seed]);

  // Entering mid-song (or seeking while paused) should paint the shot that is
  // actually playing instead of the first shot until the clock ticks.
  const initialShotIndex = useMemo(() => {
    const engineTime = Number(engineRef?.current?.getCurrentTime?.());
    const fallback = Number(lyrics[activeLineIndex]?.time ?? lyrics[0]?.time ?? 0);
    const time = (Number.isFinite(engineTime) ? engineTime : fallback) + globalOffset;
    return Math.max(0, findSonnetShotIndex(program, time));
  }, [program, engineRef, lyrics, activeLineIndex, globalOffset]);

  const shotIndexRef = useRef(initialShotIndex);
  const [shotIndex, setShotIndex] = useState(initialShotIndex);

  const activeShot = program.shots.length
    ? program.shots[clamp(shotIndex, 0, program.shots.length - 1)]
    : null;

  const baseFont = useMemo(() => {
    const width = stageSize.width || 1200;
    const height = stageSize.height || 700;
    return clamp(Math.min(width / 44, height / 26), 15, 48);
  }, [stageSize]);

  const layout = useMemo(() => (
    activeShot
      ? buildSonnetLayout(activeShot, {
        baseFont,
        typographyMotion: tuning.typography,
        showGiantText: tuning.showGiantText
      })
      : { placements: [], ghost: null }
  ), [activeShot, baseFont, tuning.typography, tuning.showGiantText]);

  const mgShapes = useMemo(() => {
    if (!activeShot || !tuning.showMg) return [];
    const random = createRandom(`${activeShot.seed}:mg`);
    const count = Math.round(3 + tuning.density * 5);
    return Array.from({ length: count }, (_, index) => {
      const kind = index % 4;
      return {
        key: `${activeShot.id}-mg-${index}`,
        kind: ['line', 'ring', 'bar', 'diagonal'][kind],
        x: 6 + random() * 88,
        y: 8 + random() * 84,
        size: 12 + random() * 42,
        rotation: (random() - 0.5) * 60,
        opacity: 0.05 + random() * 0.12
      };
    });
  }, [activeShot, tuning.density, tuning.showMg]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setStageSize({ width: rect.width, height: rect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const readTime = () => {
    const engineTime = Number(engineRef?.current?.getCurrentTime?.());
    if (Number.isFinite(engineTime)) return engineTime + globalOffset;
    const line = lyrics[activeLineIndex] || lyrics[0];
    return Number(line?.time ?? 0) + globalOffset;
  };

  useEffect(() => {
    const shot = activeShot;
    if (!shot) return undefined;
    const cameraNode = cameraRef.current;
    const placements = layout.placements;

    const applyFrame = (time) => {
      if (cameraNode) {
        const progress = clamp01((time - shot.startTime) / Math.max(0.001, shot.endTime - shot.startTime));
        const motion = resolveShotMotionFrame(shot.kind, progress);
        const revealDone = shot.segments.reduce((max, segment) => Math.max(max, segment.endTime), shot.startTime);
        const breathWeight = resolveSonnetBreathWeight(time, revealDone);
        const breath = resolveSonnetCameraBreath(time, shot.camera.phase);
        const shake = resolveTimelineShake(time, Math.max(0, tuning.camera - 1) * 0.6);
        const intensity = tuning.camera;
        const x = ((motion.x + shot.camera.x * 0.55) * 100) * intensity
          + breath.x * 100 * breathWeight
          + shake.x * 100;
        const y = ((motion.y + shot.camera.y * 0.55) * 100) * intensity
          + breath.y * 100 * breathWeight
          + shake.y * 100;
        const scale = 1 + (motion.scale - 1) * intensity + breath.scale * breathWeight;
        const rotation = ((motion.rotation + shot.camera.rotation) * intensity
          + breath.rotation * breathWeight
          + shake.rotation) * (180 / Math.PI);
        cameraNode.style.transform = `translate3d(${x.toFixed(3)}%, ${y.toFixed(3)}%, 0) scale(${scale.toFixed(4)}) rotate(${rotation.toFixed(3)}deg)`;
      }

      placements.forEach((placement) => {
        const node = segRefs.current.get(placement.key);
        if (!node) return;
        const duration = Math.max(0.08, placement.endTime - placement.startTime);
        const raw = clamp01((time - placement.startTime) / duration);
        const eased = easeSonnetExpoOut(raw);
        let opacity = raw <= 0 ? 0 : 0.18 + eased * 0.82;
        if (time > placement.endTime) {
          const after = time - placement.endTime;
          const floor = placement.role === 'hero' ? 0.62 : 0.34;
          opacity = Math.max(floor, 1 - after * 0.16);
        }
        const shift = (1 - eased) * Math.max(10, baseFont * placement.scale * 0.22);
        const blur = (1 - eased) * Math.min(10, baseFont * 0.16);
        node.style.setProperty('--seg-opacity', opacity.toFixed(3));
        node.style.setProperty('--seg-shift', `${shift.toFixed(2)}px`);
        node.style.setProperty('--seg-blur', `${blur.toFixed(2)}px`);
      });
    };

    let lastPaint = -1000;
    const paint = (now = 0) => {
      if (now - lastPaint < 33) return;
      lastPaint = now;
      const time = readTime();
      const index = findSonnetShotIndex(program, time);
      if (index !== shotIndexRef.current) {
        shotIndexRef.current = index;
        setShotIndex(index);
        return;
      }
      applyFrame(time);
    };

    applyFrame(readTime());
    return subscribeLyricClock(paint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShot, layout, program, tuning.camera, baseFont, globalOffset, engineRef, lyrics, activeLineIndex]);

  const accent = themeColor || 'var(--primary)';
  const translations = showTranslation && activeShot
    ? activeShot.lines
      .map((line) => String(line?.translation || '').trim())
      .filter(Boolean)
    : [];

  return (
    <div
      className="sonnet-stage"
      ref={stageRef}
      data-shot={activeShot?.kind || 'idle'}
      data-frame={tuning.outerFrame}
      data-guide={tuning.showGuide ? 'on' : 'off'}
      data-post={tuning.postProcess ? 'on' : 'off'}
      style={{
        '--sonnet-accent': accent,
        '--sonnet-grain': tuning.postProcess ? tuning.grain : 0,
        '--sonnet-halftone': tuning.postProcess ? tuning.halftone : 0,
        '--sonnet-vignette': tuning.postProcess ? tuning.vignette : 0,
        '--sonnet-rgb': `${(tuning.postProcess ? tuning.rgbShift : 0) * 1.6}px`
      }}
    >
      <style>{`
        .sonnet-stage {
          position: absolute;
          inset: 0;
          overflow: hidden;
          isolation: isolate;
          background: #07070a;
          --sonnet-ink: #f5f2ec;
          --sonnet-muted: rgba(242, 238, 230, 0.66);
        }
        .sonnet-cover {
          position: absolute;
          inset: -10%;
          background-size: cover;
          background-position: center;
          filter: blur(34px) brightness(0.3) saturate(0.9);
          transform: scale(1.12);
        }
        .sonnet-void {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(90% 70% at 50% 40%, rgba(24, 24, 30, 0.35) 0%, rgba(7, 7, 10, 0.92) 68%),
            linear-gradient(180deg, rgba(5, 5, 8, 0.55) 0%, rgba(5, 5, 8, 0.88) 100%);
        }
        .sonnet-mg {
          position: absolute;
          pointer-events: none;
          mix-blend-mode: screen;
        }
        .sonnet-mg-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(245, 242, 236, 0.5), transparent);
        }
        .sonnet-mg-ring {
          border: 1px solid rgba(245, 242, 236, 0.6);
          border-radius: 50%;
          aspect-ratio: 1;
        }
        .sonnet-mg-bar {
          background: linear-gradient(180deg, color-mix(in srgb, var(--sonnet-accent) 55%, transparent), transparent);
        }
        .sonnet-mg-diagonal {
          height: 1px;
          background: color-mix(in srgb, var(--sonnet-accent) 60%, transparent);
        }
        .sonnet-camera {
          position: absolute;
          inset: 0;
          transform-origin: 50% 50%;
          will-change: transform;
        }
        .sonnet-shot {
          position: absolute;
          inset: 0;
          animation: sonnetSoftIn 0.34s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .sonnet-shot[data-transition='fast-blur'] { animation-name: sonnetFastBlur; }
        .sonnet-shot[data-transition='mono-glitch'] { animation-name: sonnetMonoGlitch; }
        .sonnet-shot[data-transition='camera-pull'] { animation-name: sonnetCameraPull; }
        @keyframes sonnetSoftIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sonnetFastBlur {
          from { opacity: 0; filter: blur(22px); transform: scale(1.06); }
          to { opacity: 1; filter: blur(0); transform: scale(1); }
        }
        @keyframes sonnetMonoGlitch {
          0% { opacity: 0.15; clip-path: inset(18% 0 42% 0); transform: translate3d(-1.8%, 0, 0); }
          40% { opacity: 0.7; clip-path: inset(58% 0 8% 0); transform: translate3d(1.6%, 0, 0); }
          70% { clip-path: inset(30% 0 34% 0); transform: translate3d(-0.8%, 0, 0); }
          100% { opacity: 1; clip-path: inset(0 0 0 0); transform: translate3d(0, 0, 0); }
        }
        @keyframes sonnetCameraPull {
          from { opacity: 0; transform: scale(1.16); }
          to { opacity: 1; transform: scale(1); }
        }
        .sonnet-place {
          position: absolute;
          transform: translate(-50%, -50%) rotate(var(--place-rot, 0rad));
          pointer-events: none;
        }
        .sonnet-seg {
          display: inline-block;
          line-height: 1.02;
          letter-spacing: -0.01em;
          white-space: pre-wrap;
          color: var(--sonnet-ink);
          opacity: var(--seg-opacity, 0);
          filter: blur(var(--seg-blur, 6px));
          transform: translate3d(0, var(--seg-shift, 14px), 0);
          will-change: opacity, transform, filter;
          text-shadow: 0 2px 18px rgba(0, 0, 0, 0.35);
        }
        .sonnet-place[data-role='hero'] .sonnet-seg {
          color: color-mix(in srgb, var(--sonnet-accent) 32%, #fff);
          font-weight: 700;
          text-shadow:
            calc(var(--sonnet-rgb) * -1) 0 rgba(255, 46, 96, 0.5),
            var(--sonnet-rgb) 0 rgba(46, 214, 255, 0.45),
            0 0 34px color-mix(in srgb, var(--sonnet-accent) 45%, transparent);
        }
        .sonnet-place[data-role='semi'] .sonnet-seg {
          color: color-mix(in srgb, var(--sonnet-accent) 42%, #fff);
          font-weight: 600;
        }
        .sonnet-place[data-role='support'] .sonnet-seg {
          color: var(--sonnet-muted);
          font-weight: 500;
        }
        .sonnet-place[data-outline='true'] .sonnet-seg {
          color: transparent;
          -webkit-text-stroke: 1px rgba(245, 242, 236, 0.72);
          text-shadow: none;
        }
        .sonnet-place[data-block='true'] {
          padding: 0.18em 0.34em;
          border: 1px solid rgba(245, 242, 236, 0.22);
          background: rgba(10, 10, 14, 0.34);
          backdrop-filter: blur(2px);
        }
        .sonnet-place[data-ribbon='true']::before {
          content: '';
          position: absolute;
          left: -6%;
          right: -6%;
          top: 52%;
          height: 0.34em;
          background: color-mix(in srgb, var(--sonnet-accent) 34%, transparent);
          z-index: -1;
        }
        .sonnet-place[data-align='left'] { text-align: left; }
        .sonnet-place[data-align='right'] { text-align: right; }
        .sonnet-ghost {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          color: transparent;
          -webkit-text-stroke: 1px rgba(245, 242, 236, 0.07);
          white-space: nowrap;
          line-height: 1;
          pointer-events: none;
        }
        .sonnet-subtitle {
          position: absolute;
          left: 50%;
          bottom: 7%;
          transform: translateX(-50%);
          width: min(72%, 880px);
          text-align: center;
          color: rgba(238, 234, 226, 0.62);
          font-size: ${Math.max(13, translationPx)}px;
          font-family: ${fontStack || 'inherit'};
          line-height: 1.5;
          letter-spacing: 0.02em;
          z-index: 3;
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.6);
        }
        .sonnet-subtitle span { display: block; }
        .sonnet-guide,
        .sonnet-frame,
        .sonnet-grain,
        .sonnet-halftone,
        .sonnet-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .sonnet-guide {
          background:
            linear-gradient(90deg, transparent calc(50% - 0.5px), rgba(245, 242, 236, 0.12) 50%, transparent calc(50% + 0.5px)),
            linear-gradient(0deg, transparent calc(50% - 0.5px), rgba(245, 242, 236, 0.12) 50%, transparent calc(50% + 0.5px)),
            linear-gradient(90deg, transparent calc(33.333% - 0.5px), rgba(245, 242, 236, 0.06) 33.333%, transparent calc(33.333% + 0.5px)),
            linear-gradient(90deg, transparent calc(66.666% - 0.5px), rgba(245, 242, 236, 0.06) 66.666%, transparent calc(66.666% + 0.5px)),
            linear-gradient(0deg, transparent calc(33.333% - 0.5px), rgba(245, 242, 236, 0.06) 33.333%, transparent calc(33.333% + 0.5px)),
            linear-gradient(0deg, transparent calc(66.666% - 0.5px), rgba(245, 242, 236, 0.06) 66.666%, transparent calc(66.666% + 0.5px));
          display: none;
        }
        .sonnet-stage[data-guide='on'] .sonnet-guide { display: block; }
        .sonnet-frame { display: none; }
        .sonnet-stage[data-frame='frame'] .sonnet-frame,
        .sonnet-stage[data-frame='full'] .sonnet-frame {
          display: block;
          inset: 3.2%;
          border: 1px solid rgba(245, 242, 236, 0.2);
        }
        .sonnet-stage[data-frame='full'] .sonnet-frame {
          inset: 2.2%;
          border-color: rgba(245, 242, 236, 0.3);
          box-shadow: inset 0 0 0 6px rgba(7, 7, 10, 0.35);
        }
        .sonnet-frame::before,
        .sonnet-frame::after {
          content: '';
          position: absolute;
          width: 14px;
          height: 14px;
          border: 1px solid rgba(245, 242, 236, 0.4);
        }
        .sonnet-frame::before { left: -1px; top: -1px; border-right: 0; border-bottom: 0; }
        .sonnet-frame::after { right: -1px; bottom: -1px; border-left: 0; border-top: 0; }
        .sonnet-grain {
          opacity: var(--sonnet-grain, 0);
          background-image:
            repeating-radial-gradient(circle at 17% 32%, rgba(255, 255, 255, 0.16) 0 1px, transparent 1px 3px),
            repeating-radial-gradient(circle at 73% 61%, rgba(0, 0, 0, 0.2) 0 1px, transparent 1px 4px);
          background-size: 5px 5px, 7px 7px;
          mix-blend-mode: overlay;
          animation: sonnetGrainShift 0.6s steps(3, end) infinite;
        }
        @keyframes sonnetGrainShift {
          0% { background-position: 0 0, 0 0; }
          33% { background-position: 2px 1px, -2px 1px; }
          66% { background-position: -1px 2px, 1px -2px; }
          100% { background-position: 0 0, 0 0; }
        }
        .sonnet-halftone {
          opacity: var(--sonnet-halftone, 0);
          background-image: radial-gradient(rgba(245, 242, 236, 0.55) 0.6px, transparent 0.7px);
          background-size: 4px 4px;
          mix-blend-mode: soft-light;
        }
        .sonnet-vignette {
          opacity: min(1, var(--sonnet-vignette, 0.9));
          background: radial-gradient(ellipse at 50% 46%, transparent 38%, rgba(0, 0, 0, 0.55) 100%);
        }
        body.reduced-motion .sonnet-shot,
        body.reduced-motion .sonnet-grain { animation: none; }
      `}</style>

      {coverUrl && <div className="sonnet-cover" style={{ backgroundImage: `url("${coverUrl}")` }} />}
      <div className="sonnet-void" />

      {mgShapes.map((shape) => (
        <span
          key={shape.key}
          className={`sonnet-mg sonnet-mg-${shape.kind}`}
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: shape.kind === 'line' || shape.kind === 'diagonal' ? `${shape.size}%` : `${shape.size}%`,
            height: shape.kind === 'bar' ? `${shape.size}%` : undefined,
            opacity: shape.opacity,
            transform: `rotate(${shape.rotation}deg)`
          }}
        />
      ))}

      <div className="sonnet-camera" ref={cameraRef}>
        {activeShot && (
          <div
            className="sonnet-shot"
            key={activeShot.id}
            data-transition={tuning.transitions ? (activeShot.transitionIn || 'none') : 'none'}
          >
            {layout.ghost && (
              <div
                className="sonnet-ghost"
                style={{
                  left: `${layout.ghost.x}%`,
                  top: `${layout.ghost.y}%`,
                  fontSize: `${baseFont * layout.ghost.scale}px`,
                  fontFamily: fontStack,
                  transform: `translate(-50%, -50%) rotate(${layout.ghost.rotation}rad)`
                }}
              >
                {layout.ghost.text}
              </div>
            )}
            {layout.placements.map((placement) => {
              const vertical = placement.vertical
                ? CJK_RE.test(placement.text) ? 'cjk' : 'rotate'
                : 'none';
              const rotation = placement.rotation + (vertical === 'rotate' ? Math.PI / 2 : 0);
              const stageWidth = stageSize.width || 1200;
              const stageHeight = stageSize.height || 700;
              const textLength = Math.max(1, placement.text.length);
              const fitWidth = vertical === 'cjk' ? Infinity : (stageWidth * 0.9) / textLength;
              const fitHeight = vertical === 'cjk' ? (stageHeight * 0.66) / textLength : Infinity;
              const fontSize = Math.max(12, Math.min(baseFont * placement.scale, fitWidth, fitHeight));
              return (
                <div
                  key={placement.key}
                  className="sonnet-place"
                  data-role={placement.role}
                  data-outline={placement.outline ? 'true' : 'false'}
                  data-block={placement.block ? 'true' : 'false'}
                  data-ribbon={placement.ribbon ? 'true' : 'false'}
                  data-align={placement.align}
                  style={{
                    left: `${placement.x}%`,
                    top: `${placement.y}%`,
                    '--place-rot': `${rotation}rad`
                  }}
                >
                  <span
                    className="sonnet-seg"
                    ref={(node) => {
                      if (node) segRefs.current.set(placement.key, node);
                      else segRefs.current.delete(placement.key);
                    }}
                    style={{
                      fontSize: `${fontSize}px`,
                      fontFamily: fontStack,
                      writingMode: vertical === 'cjk' ? 'vertical-rl' : 'horizontal-tb',
                      textOrientation: 'mixed'
                    }}
                    dangerouslySetInnerHTML={{ __html: placement.html }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {translations.length > 0 && (
        <div className="sonnet-subtitle">
          {translations.map((text, index) => <span key={`${activeShot.id}-trans-${index}`}>{text}</span>)}
        </div>
      )}

      <div className="sonnet-guide" />
      <div className="sonnet-frame" />
      <div className="sonnet-grain" />
      <div className="sonnet-halftone" />
      <div className="sonnet-vignette" />
    </div>
  );
}
