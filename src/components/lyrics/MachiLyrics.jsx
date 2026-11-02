import React, { useMemo } from 'react';
import TokenRevealLine from './TokenRevealLine';

// "町景" — a miniature night street seen in 2.5D. The current line lives on the
// LED board, the next one on the small sign above it, and the layers slide at
// different speeds as the camera drifts.

const SCENES = {
  konbini: { sky: 'linear-gradient(180deg, #0b1220 0%, #16233a 46%, #1b2a3f 100%)', accent: '#7fe3ff' },
  gas: { sky: 'linear-gradient(180deg, #150f08 0%, #2a1b10 48%, #38220f 100%)', accent: '#ffcf7a' },
  corner: { sky: 'linear-gradient(180deg, #140a16 0%, #2a1230 48%, #3a1638 100%)', accent: '#ff8fd0' }
};

export default function MachiLyrics({
  lyrics = [],
  activeLineIndex = -1,
  engineRef,
  fontPx = 42,
  translationPx = 17,
  fontStack,
  songTitle,
  songArtist,
  config = {},
  globalOffset = 0
}) {
  const showTranslation = config?.showTranslation !== false;
  const sceneKey = SCENES[config?.machiScene] ? config.machiScene : 'konbini';
  const scene = SCENES[sceneKey];
  const night = config?.machiNight !== false;
  const rain = config?.machiRain === true;
  const camera = Math.min(1.5, Math.max(0, Number(config?.machiCamera ?? 0.6)));
  const signGlow = Math.min(1.6, Math.max(0, Number(config?.machiSignGlow ?? 0.9)));

  const { current, next, previous } = useMemo(() => {
    if (!Array.isArray(lyrics) || lyrics.length === 0) {
      return { current: null, next: null, previous: null };
    }
    const index = activeLineIndex < 0 ? 0 : Math.min(activeLineIndex, lyrics.length - 1);
    return {
      current: lyrics[index],
      next: lyrics[index + 1] || null,
      previous: index > 0 ? lyrics[index - 1] : null
    };
  }, [lyrics, activeLineIndex]);

  return (
    <div className="machi-stage" data-night={night ? '1' : '0'} data-rain={rain ? '1' : '0'}>
      <style>{`
        .machi-stage {
          position: absolute;
          inset: 0;
          overflow: hidden;
          --machi-accent: ${scene.accent};
          --machi-camera: ${camera};
          background: ${scene.sky};
          perspective: 1100px;
          perspective-origin: 50% 46%;
        }
        .machi-world {
          position: absolute;
          inset: -12%;
          transform-style: preserve-3d;
          animation: machiDrift calc(26s / max(0.2, var(--machi-camera))) ease-in-out infinite;
        }
        @keyframes machiDrift {
          0%, 100% { transform: translate3d(-1.4%, 0.6%, 0) rotateY(-1.6deg) scale(1.02); }
          50% { transform: translate3d(1.6%, -0.8%, 0) rotateY(1.6deg) scale(1.05); }
        }
        .machi-layer { position: absolute; inset: 0; }
        .machi-far {
          background:
            repeating-linear-gradient(90deg,
              rgba(6, 10, 18, 0.92) 0px, rgba(6, 10, 18, 0.92) 58px,
              rgba(10, 16, 26, 0.92) 58px, rgba(10, 16, 26, 0.92) 96px,
              rgba(4, 8, 14, 0.94) 96px, rgba(4, 8, 14, 0.94) 150px);
          mask-image: linear-gradient(180deg, #000 0%, #000 54%, transparent 78%);
          -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 54%, transparent 78%);
          opacity: 0.85;
        }
        .machi-far::after {
          content: '';
          position: absolute;
          inset: 8% 4% 44% 4%;
          background:
            radial-gradient(circle at 12% 30%, var(--machi-accent) 0 3px, transparent 4px),
            radial-gradient(circle at 38% 18%, #ffd79a 0 2px, transparent 3px),
            radial-gradient(circle at 66% 34%, #9fd8ff 0 3px, transparent 4px),
            radial-gradient(circle at 84% 22%, #ffb3d4 0 2px, transparent 3px);
          opacity: 0.55;
        }
        .machi-mid {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: clamp(18px, 4vw, 64px);
          padding-bottom: 30%;
          transform: translateZ(40px);
        }
        .machi-board {
          position: relative;
          padding: clamp(16px, 2.4vh, 28px) clamp(20px, 3vw, 40px);
          border-radius: 14px;
          background: linear-gradient(180deg, rgba(8, 12, 20, 0.94) 0%, rgba(4, 7, 12, 0.97) 100%);
          border: 1px solid color-mix(in srgb, var(--machi-accent) 48%, transparent);
          box-shadow:
            0 0 calc(18px * ${signGlow}) color-mix(in srgb, var(--machi-accent) 42%, transparent),
            inset 0 0 24px rgba(0, 0, 0, 0.65);
          max-width: min(62vw, 860px);
          overflow: hidden;
        }
        .machi-board::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px);
          pointer-events: none;
          opacity: 0.5;
        }
        .machi-board-main .trl-line { color: color-mix(in srgb, var(--machi-accent) 30%, #ffffff); }
        .machi-board-main .trl-line[data-state='active'] { color: #ffffff; filter: none; }
        .machi-board-main .trl-token {
          display: inline-block;
          white-space: pre-wrap;
          opacity: calc(0.32 + var(--token-progress, 0) * 0.68);
          text-shadow: 0 0 calc(var(--token-progress, 0) * 22px) var(--machi-accent);
          transition: opacity 0.18s linear;
        }
        .machi-board-main .trl-translation {
          margin-top: 8px;
          color: color-mix(in srgb, var(--machi-accent) 62%, #d9e6f2);
          letter-spacing: 0.02em;
        }
        .machi-board-side {
          padding: 12px 16px;
          max-width: min(28vw, 320px);
          opacity: 0.7;
        }
        .machi-board-side .trl-line { color: rgba(226, 236, 246, 0.66); filter: none; opacity: 1; }
        .machi-board-side .trl-token { opacity: 1; text-shadow: none; }
        .machi-sign-title {
          position: absolute;
          right: 5vw;
          top: 17vh;
          writing-mode: vertical-rl;
          padding: 16px 10px;
          border-radius: 10px;
          background: linear-gradient(180deg, rgba(9, 13, 22, 0.9), rgba(4, 7, 12, 0.95));
          border: 1px solid color-mix(in srgb, var(--machi-accent) 38%, transparent);
          color: color-mix(in srgb, var(--machi-accent) 70%, #ffffff);
          font-size: 14px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          box-shadow: 0 0 16px color-mix(in srgb, var(--machi-accent) 26%, transparent);
        }
        .machi-near {
          background:
            linear-gradient(180deg, transparent 58%, rgba(2, 4, 8, 0.9) 82%, rgba(1, 2, 5, 1) 100%),
            radial-gradient(120% 90% at 50% 120%, rgba(0, 0, 0, 0.85) 0%, transparent 60%);
          transform: translateZ(90px);
          pointer-events: none;
        }
        .machi-rain {
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(104deg,
            rgba(190, 220, 255, 0.16) 0px, rgba(190, 220, 255, 0.16) 1px,
            transparent 1px, transparent 9px);
          animation: machiRain 0.9s linear infinite;
          opacity: 0.7;
          pointer-events: none;
        }
        @keyframes machiRain {
          from { transform: translate3d(0, -12%, 0); }
          to { transform: translate3d(-6%, 12%, 0); }
        }
        body.reduced-motion .machi-world,
        body.reduced-motion .machi-rain { animation: none; }
      `}</style>

      <div className="machi-world">
        <div className="machi-layer machi-far" />
        <div className="machi-layer machi-mid">
          {next && (
            <div className="machi-board machi-board-side">
              <TokenRevealLine
                line={next}
                state="idle"
                engineRef={engineRef}
                globalOffset={globalOffset}
                fontPx={fontPx * 0.42}
                translationPx={translationPx * 0.8}
                fontStack={fontStack}
                showTranslation={false}
              />
            </div>
          )}
          {current && (
            <div className="machi-board machi-board-main">
              <TokenRevealLine
                line={current}
                state={activeLineIndex >= 0 ? 'active' : 'idle'}
                engineRef={engineRef}
                globalOffset={globalOffset}
                fontPx={fontPx}
                translationPx={translationPx}
                fontStack={fontStack}
                showTranslation={showTranslation}
              />
            </div>
          )}
          {previous && (
            <div className="machi-board machi-board-side">
              <TokenRevealLine
                line={previous}
                state="passed"
                engineRef={engineRef}
                globalOffset={globalOffset}
                fontPx={fontPx * 0.42}
                translationPx={translationPx * 0.8}
                fontStack={fontStack}
                showTranslation={false}
              />
            </div>
          )}
        </div>
        <div className="machi-layer machi-near" />
      </div>

      {(songTitle || songArtist) && (
        <div className="machi-sign-title">
          {[songTitle, songArtist].filter(Boolean).join(' · ')}
        </div>
      )}

      {rain && <div className="machi-rain" />}
    </div>
  );
}
