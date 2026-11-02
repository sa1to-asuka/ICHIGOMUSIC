import React, { useEffect, useMemo, useRef } from 'react';
import TokenRevealLine from './TokenRevealLine';
import { subscribeLyricClock } from '../../utils/lyricClock';

// "绘光" — volumetric beams, drifting smoke and line art; every sung character
// lights up as the light front passes it.

const WINDOW_BEFORE = 2;
const WINDOW_AFTER = 4;

export default function LumiereLyrics({
  lyrics = [],
  activeLineIndex = -1,
  engineRef,
  fontPx = 46,
  translationPx = 18,
  fontStack,
  coverUrl,
  isPlaying = false,
  audioAnalyser,
  themeColor,
  config = {},
  globalOffset = 0
}) {
  const stageRef = useRef(null);
  const showTranslation = config?.showTranslation !== false;
  const beamCount = Math.round(Math.min(8, Math.max(1, Number(config?.lumiereBeams ?? 4))));
  const smoke = Math.min(1, Math.max(0, Number(config?.lumiereSmoke ?? 0.6)));
  const glow = Math.min(1, Math.max(0.1, Number(config?.lumiereGlow ?? 0.8)));

  const windowLines = useMemo(() => {
    if (!Array.isArray(lyrics) || lyrics.length === 0) return [];
    const anchor = activeLineIndex < 0 ? 0 : activeLineIndex;
    const start = Math.max(0, anchor - WINDOW_BEFORE);
    const end = Math.min(lyrics.length, anchor + WINDOW_AFTER);
    return lyrics.slice(start, end).map((line, offset) => ({ line, index: start + offset }));
  }, [lyrics, activeLineIndex]);

  const beams = useMemo(
    () => Array.from({ length: beamCount }, (_, index) => ({
      id: index,
      left: 8 + (index * 84) / Math.max(1, beamCount),
      width: 90 + ((index * 37) % 120),
      tilt: -22 + ((index * 13) % 44),
      delay: index * 1.7,
      duration: 14 + ((index * 5) % 12)
    })),
    [beamCount]
  );

  // Feed the beams from the low end of the spectrum; without an analyser the
  // CSS animation alone still looks alive.
  useEffect(() => {
    const node = stageRef.current;
    if (!node || !audioAnalyser || typeof audioAnalyser.getByteFrequencyData !== 'function') return undefined;

    let buffer = null;
    let last = 0;
    const paint = (now = 0) => {
      if (now - last < 66) return;
      last = now;
      if (!buffer || buffer.length !== audioAnalyser.frequencyBinCount) {
        buffer = new Uint8Array(audioAnalyser.frequencyBinCount);
      }
      audioAnalyser.getByteFrequencyData(buffer);
      const bins = Math.max(4, Math.min(24, buffer.length >> 3));
      let sum = 0;
      for (let i = 0; i < bins; i += 1) sum += buffer[i];
      const energy = sum / (bins * 255);
      node.style.setProperty('--lumiere-energy', energy.toFixed(3));
    };

    paint(0);
    if (!isPlaying) return undefined;
    return subscribeLyricClock(paint);
  }, [audioAnalyser, isPlaying]);

  return (
    <div className="lumiere-stage" ref={stageRef}>
      <style>{`
        .lumiere-stage {
          position: absolute;
          inset: 0;
          overflow: hidden;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          box-sizing: border-box;
          /* Clear the poster header (song title / artist) painted above the rail. */
          padding: clamp(120px, 20vh, 200px) 0 6vh;
          --lumiere-energy: 0.25;
          --lumiere-accent: ${themeColor || 'var(--primary)'};
        }
        .lumiere-scene {
          position: absolute;
          inset: -8%;
          background-size: cover;
          background-position: center;
          filter: blur(30px) brightness(0.3) saturate(1.2);
          transform: scale(1.1);
        }
        .lumiere-void {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(80% 60% at 50% 8%, rgba(255, 250, 240, 0.12) 0%, transparent 62%),
            linear-gradient(180deg, rgba(10, 12, 18, 0.9) 0%, rgba(6, 8, 12, 0.96) 100%);
        }
        .lumiere-beam {
          position: absolute;
          top: -18%;
          height: 150%;
          transform-origin: 50% 0%;
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--lumiere-accent) 42%, transparent) 0%,
            color-mix(in srgb, var(--lumiere-accent) 12%, transparent) 42%,
            transparent 78%);
          filter: blur(18px);
          mix-blend-mode: screen;
          opacity: calc(0.16 + var(--lumiere-energy, 0.25) * 0.6);
          animation-name: lumiereSway;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          pointer-events: none;
        }
        @keyframes lumiereSway {
          0%, 100% { transform: rotate(var(--beam-tilt)) translateX(-2%); opacity: 0.35; }
          50% { transform: rotate(calc(var(--beam-tilt) + 6deg)) translateX(2%); opacity: 0.7; }
        }
        .lumiere-smoke {
          position: absolute;
          border-radius: 50%;
          filter: blur(46px);
          background: radial-gradient(circle, rgba(255, 246, 232, 0.22) 0%, transparent 70%);
          animation: lumiereDrift 22s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes lumiereDrift {
          0%, 100% { transform: translate3d(-4%, 2%, 0) scale(1); }
          50% { transform: translate3d(6%, -3%, 0) scale(1.12); }
        }
        .lumiere-lines {
          position: relative;
          z-index: 2;
          width: min(76%, 900px);
          display: flex;
          flex-direction: column;
          gap: clamp(12px, 2vh, 26px);
        }
        .lumiere-lines .trl-line {
          color: rgba(240, 236, 228, 0.34);
          transition: opacity 0.5s ease, filter 0.5s ease, transform 0.5s ease;
          filter: blur(1px);
        }
        .lumiere-lines .trl-line[data-state='active'] {
          color: rgba(255, 252, 246, 0.98);
          filter: none;
          transform: translateX(4px);
        }
        .lumiere-lines .trl-line[data-state='passed'] { opacity: 0.5; }
        .lumiere-lines .trl-token {
          display: inline-block;
          white-space: pre-wrap;
          opacity: calc(0.3 + var(--token-progress, 0) * 0.7);
          color: color-mix(in srgb, var(--lumiere-accent) calc(var(--token-progress, 0) * 42%), currentColor);
          text-shadow:
            0 0 calc(var(--token-progress, 0) * 26px) color-mix(in srgb, var(--lumiere-accent) 70%, transparent),
            0 0 calc(var(--token-progress, 0) * 60px) color-mix(in srgb, var(--lumiere-accent) 32%, transparent);
          transition: opacity 0.2s linear;
        }
        .lumiere-lines .trl-translation {
          margin-top: 6px;
          color: rgba(226, 232, 240, 0.66);
        }
        body.reduced-motion .lumiere-beam,
        body.reduced-motion .lumiere-smoke { animation: none; }
      `}</style>

      {coverUrl && <div className="lumiere-scene" style={{ backgroundImage: `url("${coverUrl}")` }} />}
      <div className="lumiere-void" />

      {beams.map((beam) => (
        <span
          key={beam.id}
          className="lumiere-beam"
          style={{
            left: `${beam.left}%`,
            width: `${beam.width}px`,
            animationDelay: `${beam.delay}s`,
            animationDuration: `${beam.duration}s`,
            '--beam-tilt': `${beam.tilt}deg`
          }}
        />
      ))}

      {[0, 1, 2].map((index) => (
        <span
          key={`smoke-${index}`}
          className="lumiere-smoke"
          style={{
            left: `${12 + index * 32}%`,
            top: `${18 + (index % 2) * 40}%`,
            width: `${38 + index * 8}%`,
            height: `${30 + index * 6}%`,
            opacity: 0.25 + smoke * 0.5,
            animationDelay: `${index * 4}s`
          }}
        />
      ))}

      <div className="lumiere-lines">
        {windowLines.map(({ line, index }) => {
          const state = index === activeLineIndex ? 'active' : index < activeLineIndex ? 'passed' : 'idle';
          const distance = Math.abs(index - activeLineIndex);
          return (
            <TokenRevealLine
              key={`${line.time}-${index}`}
              line={line}
              state={state}
              engineRef={engineRef}
              globalOffset={globalOffset}
              fontPx={state === 'active' ? fontPx * glow : fontPx * 0.84}
              translationPx={translationPx}
              fontStack={fontStack}
              showTranslation={showTranslation}
              style={{
                opacity: state === 'active' ? 1 : Math.max(0.25, 0.62 - distance * 0.1),
                transformOrigin: 'left center'
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
