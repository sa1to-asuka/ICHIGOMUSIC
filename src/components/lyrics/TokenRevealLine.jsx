import React, { useEffect, useMemo, useRef } from 'react';
import { parseDisplayTokens } from './MonetLyricsEngine';
import { subscribeLyricClock } from '../../utils/lyricClock';

/**
 * One lyric line whose tokens expose their own 0..1 progress as the CSS custom
 * property `--token-progress` (plus `data-lit`). Layout modes style around that
 * value, so the timing logic lives here instead of in every renderer.
 */
const TokenRevealLine = React.memo(function TokenRevealLine({
  line,
  engineRef,
  globalOffset = 0,
  fontPx = 40,
  translationPx = 18,
  fontStack,
  showTranslation = true,
  state = 'idle',
  className = '',
  style
}) {
  const tokens = useMemo(() => parseDisplayTokens(line), [line]);
  const tokenRefs = useRef([]);

  useEffect(() => {
    tokenRefs.current.length = tokens.length;
  }, [tokens]);

  useEffect(() => {
    if (state !== 'active') {
      const settled = state === 'passed' ? 1 : 0;
      tokenRefs.current.forEach((el) => {
        if (!el) return;
        el.style.setProperty('--token-progress', settled.toFixed(3));
        const lit = settled > 0 ? '1' : '0';
        if (el.dataset.lit !== lit) el.dataset.lit = lit;
      });
      return undefined;
    }

    const paint = () => {
      const now = (engineRef.current?.getCurrentTime?.() || 0) + globalOffset;
      tokenRefs.current.forEach((el, index) => {
        if (!el) return;
        const token = tokens[index];
        if (!token) return;
        const start = Number(token.startTime) || 0;
        const end = Number(token.endTime) || start + 0.2;
        const progress = (now - start) / Math.max(0.05, end - start);
        const clamped = progress <= 0 ? 0 : progress >= 1 ? 1 : progress;
        el.style.setProperty('--token-progress', clamped.toFixed(3));
        const lit = clamped > 0 ? '1' : '0';
        if (el.dataset.lit !== lit) el.dataset.lit = lit;
      });
    };

    paint();
    return subscribeLyricClock(paint);
  }, [state, tokens, engineRef, globalOffset]);

  const translation = showTranslation ? String(line?.translation || '').trim() : '';

  return (
    <div className={`trl-line ${className}`} data-state={state} style={style}>
      <div
        className="trl-text"
        style={{ fontSize: `${fontPx}px`, fontFamily: fontStack, lineHeight: 1.3 }}
      >
        {tokens.map((token, index) => (
          <span
            key={token.key || `${index}`}
            ref={(el) => {
              tokenRefs.current[index] = el;
            }}
            className="trl-token"
            dangerouslySetInnerHTML={{ __html: token.rubyHtml || token.text }}
          />
        ))}
      </div>
      {translation && (
        <div
          className="trl-translation"
          style={{ fontSize: `${translationPx}px`, fontFamily: fontStack }}
        >
          {translation}
        </div>
      )}
    </div>
  );
});

export default TokenRevealLine;
