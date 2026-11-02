import React, { useMemo } from 'react';
import TokenRevealLine from './TokenRevealLine';

// "雾笺" — lyrics written through the condensation on a night bus window.
// Every token clears a little more fog as it is sung; droplets run down the
// glass, and the title is written once the last line is done.

const WINDOW_BEFORE = 3;
const WINDOW_AFTER = 4;

const hash = (seed) => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

export default function NebbiaLyrics({
  lyrics = [],
  activeLineIndex = -1,
  engineRef,
  fontPx = 44,
  translationPx = 18,
  fontStack,
  coverUrl,
  songTitle,
  songArtist,
  config = {},
  globalOffset = 0
}) {
  const showTranslation = config?.showTranslation !== false;
  const fogDensity = Math.min(1, Math.max(0.2, Number(config?.nebbiaFog ?? 0.82)));
  const dropletCount = Math.round(Math.min(40, Math.max(4, Number(config?.nebbiaDroplets ?? 16))));
  const showTitleCard = config?.nebbiaTitleCard !== false;

  const windowLines = useMemo(() => {
    if (!Array.isArray(lyrics) || lyrics.length === 0) return [];
    const anchor = activeLineIndex < 0 ? 0 : activeLineIndex;
    const start = Math.max(0, anchor - WINDOW_BEFORE);
    const end = Math.min(lyrics.length, anchor + WINDOW_AFTER);
    return lyrics.slice(start, end).map((line, offset) => ({ line, index: start + offset }));
  }, [lyrics, activeLineIndex]);

  const droplets = useMemo(
    () => Array.from({ length: dropletCount }, (_, index) => ({
      id: index,
      left: 4 + hash(index + 1) * 92,
      top: 6 + hash(index + 21) * 74,
      size: 2 + hash(index + 41) * 4,
      delay: hash(index + 61) * 9,
      duration: 7 + hash(index + 81) * 10,
      length: 30 + hash(index + 101) * 90
    })),
    [dropletCount]
  );

  const finished = lyrics.length > 0 && activeLineIndex >= lyrics.length - 1;

  return (
    <div className="nebbia-stage">
      <style>{`
        .nebbia-stage {
          position: absolute;
          inset: 0;
          overflow: hidden;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          box-sizing: border-box;
          /* Clear the poster header (song title / artist) painted above the rail. */
          padding: clamp(120px, 20vh, 200px) 0 6vh;
          --nebbia-glass: color-mix(in srgb, var(--color-raised, #f7f2ea) 78%, transparent);
          --nebbia-ink: var(--color-ink, #f4efe8);
        }
        .nebbia-scene {
          position: absolute;
          inset: -6%;
          background-size: cover;
          background-position: center;
          filter: blur(26px) brightness(0.42) saturate(1.1);
          transform: scale(1.08);
          opacity: 0.9;
        }
        .nebbia-night {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(120% 90% at 72% 18%, rgba(120, 176, 214, 0.28) 0%, transparent 58%),
            radial-gradient(100% 80% at 12% 82%, rgba(196, 132, 96, 0.22) 0%, transparent 62%),
            linear-gradient(180deg, rgba(9, 14, 22, 0.86) 0%, rgba(12, 18, 28, 0.94) 100%);
        }
        .nebbia-fog {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.16) 0%, transparent 46%),
            radial-gradient(circle at 74% 62%, rgba(255, 255, 255, 0.12) 0%, transparent 52%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0.04) 100%);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          pointer-events: none;
        }
        .nebbia-droplet {
          position: absolute;
          border-radius: 50% 50% 46% 46%;
          background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.08));
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          animation-name: nebbiaRun;
          animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
          animation-iteration-count: infinite;
          pointer-events: none;
        }
        .nebbia-droplet::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 100%;
          width: 1px;
          height: var(--trail);
          background: linear-gradient(180deg, rgba(255,255,255,0.35), transparent);
          transform: translateX(-50%);
        }
        @keyframes nebbiaRun {
          0% { transform: translate3d(0, -12px, 0); opacity: 0; }
          12% { opacity: 0.9; }
          70% { opacity: 0.75; }
          100% { transform: translate3d(6px, 150px, 0); opacity: 0; }
        }
        .nebbia-lines {
          position: relative;
          z-index: 2;
          width: min(78%, 880px);
          display: flex;
          flex-direction: column;
          gap: clamp(10px, 1.6vh, 22px);
          padding-bottom: 4vh;
        }
        .nebbia-lines .trl-line {
          color: rgba(244, 240, 234, 0.5);
          transition: opacity 0.5s ease, filter 0.5s ease, transform 0.5s ease;
          filter: blur(1.6px);
          opacity: 0.55;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.12);
        }
        .nebbia-lines .trl-line[data-state='active'] {
          color: rgba(255, 253, 248, 0.96);
          filter: none;
          opacity: 1;
          transform: translateX(6px);
        }
        .nebbia-lines .trl-line[data-state='passed'] {
          filter: blur(0.4px);
          opacity: 0.62;
        }
        .nebbia-lines .trl-token {
          display: inline-block;
          white-space: pre-wrap;
          opacity: calc(0.22 + var(--token-progress, 0) * 0.78);
          filter: blur(calc((1 - var(--token-progress, 0)) * 2.4px));
          text-shadow:
            0 1px 0 rgba(255, 255, 255, calc(0.18 + var(--token-progress, 0) * 0.35)),
            0 0 18px rgba(214, 232, 255, calc(var(--token-progress, 0) * 0.5));
          transition: opacity 0.16s linear, filter 0.2s linear;
        }
        .nebbia-lines .trl-translation {
          margin-top: 6px;
          color: rgba(214, 228, 246, 0.72);
          letter-spacing: 0.02em;
        }
        .nebbia-titlecard {
          position: absolute;
          right: 8%;
          bottom: 12%;
          z-index: 3;
          text-align: right;
          color: rgba(255, 252, 246, 0.92);
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.9s ease, transform 0.9s ease;
          pointer-events: none;
        }
        .nebbia-titlecard.is-visible { opacity: 1; transform: translateY(0); }
        .nebbia-titlecard .nebbia-title {
          font-family: var(--font-display, ${fontStack || 'inherit'});
          font-size: clamp(24px, 3.2vw, 46px);
          font-weight: 600;
          line-height: 1.25;
          text-shadow: 0 0 26px rgba(190, 220, 255, 0.45);
        }
        .nebbia-titlecard .nebbia-artist {
          margin-top: 8px;
          font-size: 14px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(206, 220, 240, 0.7);
        }
      `}</style>

      {coverUrl && <div className="nebbia-scene" style={{ backgroundImage: `url("${coverUrl}")` }} />}
      <div className="nebbia-night" />
      <div className="nebbia-fog" style={{ opacity: fogDensity }} />

      {droplets.map((drop) => (
        <span
          key={drop.id}
          className="nebbia-droplet"
          style={{
            left: `${drop.left}%`,
            top: `${drop.top}%`,
            width: `${drop.size}px`,
            height: `${drop.size * 1.5}px`,
            animationDelay: `${drop.delay}s`,
            animationDuration: `${drop.duration}s`,
            '--trail': `${drop.length}px`
          }}
        />
      ))}

      <div className="nebbia-lines">
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
              fontPx={state === 'active' ? fontPx : fontPx * 0.86}
              translationPx={translationPx}
              fontStack={fontStack}
              showTranslation={showTranslation}
              style={{ transform: state === 'active' ? undefined : `scale(${Math.max(0.86, 1 - distance * 0.03)})`, transformOrigin: 'left center' }}
            />
          );
        })}
      </div>

      {showTitleCard && (
        <div className={`nebbia-titlecard ${finished ? 'is-visible' : ''}`}>
          <div className="nebbia-title">{songTitle || ''}</div>
          {songArtist && <div className="nebbia-artist">{songArtist}</div>}
        </div>
      )}
    </div>
  );
}
