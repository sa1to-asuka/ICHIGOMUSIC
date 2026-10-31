import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';
import { Clock, Search, RefreshCw, Check, AlertCircle, X, Save } from 'lucide-react';
import { computeLineDurations } from '../utils/lyrics/lyricParser';
import { normalizeMatchedLines, assessLyricQuality } from '../hooks/useLyricEngine';
import {
  Modal, ModalContent, ModalHeader, ModalTitle, ModalClose, ModalBody,
  Button, IconButton, Input, SegmentedControl, SegmentedControlItem
} from './ui';

export default function LyricAdjusterModal({ isOpen, onClose, currentSong, lyrics = [] }) {
  const { advancedLyricConfig, saveAdvancedLyricConfig, currentSong: activeSong, audioElement } = useApp();
  const song = currentSong || activeSong;

  const [activeTab, setActiveTab] = useState('offset');
  const [searchTitle, setSearchTitle] = useState('');
  const [searchArtist, setSearchArtist] = useState('');
  const [searchSource, setSearchSource] = useState('amll,qq,kugou,netease');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [appliedMsg, setAppliedMsg] = useState('');
  const [lineDrafts, setLineDrafts] = useState([]);
  const [lineDirty, setLineDirty] = useState(false);

  const currentOffset = advancedLyricConfig?.globalOffset || 0;

  useEffect(() => {
    if (!isOpen) return;
    setLineDrafts(Array.isArray(lyrics) ? lyrics.map((line) => ({ ...line })) : []);
    setLineDirty(false);
  }, [isOpen, song?.id]);

  useEffect(() => {
    if (!isOpen || lineDrafts.length > 0 || !Array.isArray(lyrics) || lyrics.length === 0) return;
    setLineDrafts(lyrics.map((line) => ({ ...line })));
  }, [isOpen, lyrics, lineDrafts.length]);

  useEffect(() => {
    if (song) {
      setSearchTitle(song.name || song.title || '');
      setSearchArtist(song.ar?.[0]?.name || song.artists?.[0]?.name || song.artist || '');
      setResults([]);
      setError('');
      setAppliedMsg('');
    }
  }, [song, isOpen]);

  if (!isOpen) return null;

  const handleAdjustOffset = (delta) => {
    const nextOffset = Math.round((currentOffset + delta) * 100) / 100;
    saveAdvancedLyricConfig({ globalOffset: nextOffset });
  };

  const handleResetOffset = () => {
    saveAdvancedLyricConfig({ globalOffset: 0 });
  };

  const handleSearchLyrics = async () => {
    if (!searchTitle.trim()) return;
    setSearching(true);
    setError('');
    setAppliedMsg('');
    try {
      const res = await api.getMatchedLyrics({
        id: song?.id,
        title: searchTitle.trim(),
        artist: searchArtist.trim(),
        sources: searchSource,
      });

      if (res && (res.lyrics || res.lines || Array.isArray(res))) {
        const lines = computeLineDurations(normalizeMatchedLines(res));
        setResults([{
          id: 'matched_1',
          source: res.source || 'multi-source',
          quality: assessLyricQuality(lines, song?.duration ? song.duration / 1000 : 0),
          lines,
          raw: res
        }]);
      } else {
        setError('未找到匹配的歌词版本，请尝试更改搜索关键词或源');
      }
    } catch (err) {
      console.warn('Manual lyric search failed:', err);
      setError('搜索失败：' + (err.message || '网络请求超时'));
    } finally {
      setSearching(false);
    }
  };

  const handleApplyLyrics = (candidate) => {
    if (!song?.id || !candidate?.lines) return;
    const lines = candidate.lines.map((line) => ({ ...line }));
    const overrideKey = `ichigo_lyrics_override_${song.id}`;
    const cacheKey = `ichigo_lyrics_parsed_${song.id}`;
    try {
      localStorage.setItem(overrideKey, JSON.stringify(lines));
      localStorage.setItem(cacheKey, JSON.stringify(lines));
      if (window.electronAPI?.writeLyricCache) {
        window.electronAPI.writeLyricCache({
          key: overrideKey,
          data: lines,
        }).catch(() => {});
      }
      window.dispatchEvent(new CustomEvent('ichigo-lyrics-updated', {
        detail: { songId: song.id, lines }
      }));
      setLineDrafts(lines.map((line) => ({ ...line })));
      setAppliedMsg('歌词已应用并即时生效');
      setTimeout(() => onClose(), 600);
    } catch (e) {
      setError('保存歌词缓存失败：' + e.message);
    }
  };

  const nudgeLine = (index, delta) => {
    setLineDrafts((prev) => prev.map((line, i) => (
      i === index
        ? { ...line, time: Math.max(0, Math.round((Number(line.time || 0) + delta) * 1000) / 1000) }
        : line
    )));
    setLineDirty(true);
  };

  const handleSaveLineEdits = () => {
    if (!song?.id) return;
    const lines = lineDrafts.map((line) => ({
      ...line,
      time: Math.max(0, Number(line.time) || 0)
    }));
    const overrideKey = `ichigo_lyrics_override_${song.id}`;
    try {
      localStorage.setItem(overrideKey, JSON.stringify(lines));
      localStorage.setItem(`ichigo_lyrics_parsed_${song.id}`, JSON.stringify(lines));
      if (window.electronAPI?.writeLyricCache) {
        window.electronAPI.writeLyricCache({ key: overrideKey, data: lines }).catch(() => {});
      }
      window.dispatchEvent(new CustomEvent('ichigo-lyrics-updated', {
        detail: { songId: song.id, lines }
      }));
      setLineDirty(false);
      toast.success(`已保存 ${lines.length} 行歌词时间轴`);
    } catch (err) {
      toast.error('保存失败：' + (err.message || '未知错误'));
    }
  };

  const handleResetLineEdits = () => {
    setLineDrafts((Array.isArray(lyrics) ? lyrics : []).map((line) => ({ ...line })));
    setLineDirty(false);
  };

  const formatLineTime = (sec) => {
    const total = Math.max(0, Number(sec) || 0);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.round((total % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ModalContent className="lyric-adjuster-dialog" showClose={false} aria-describedby={undefined}>
        <ModalHeader>
          <div className="lyric-adjuster-heading">
            <Clock size={18} color="var(--primary)" />
            <ModalTitle>歌词微调与手动替换</ModalTitle>
          </div>
          <ModalClose asChild>
            <IconButton label="关闭" variant="ghost" size="sm"><X size={16} /></IconButton>
          </ModalClose>
        </ModalHeader>

        <SegmentedControl value={activeTab} onValueChange={(value) => { if (value) setActiveTab(value); }} type="single">
          <SegmentedControlItem value="offset" style={{ flex: 1 }}>全局偏移</SegmentedControlItem>
          <SegmentedControlItem value="lines" style={{ flex: 1 }}>逐行微调</SegmentedControlItem>
          <SegmentedControlItem value="search" style={{ flex: 1 }}>搜索替换</SegmentedControlItem>
        </SegmentedControl>

        <ModalBody className="lyric-adjuster-body">
          {activeTab === 'offset' && (
            <div className="lyric-adjuster-section">
              <div className="lyric-offset-card">
                <div className="lyric-offset-label">当前全局时间轴偏移</div>
                <div className={`lyric-offset-value ${currentOffset === 0 ? '' : currentOffset > 0 ? 'is-late' : 'is-early'}`}>
                  {currentOffset > 0 ? `+${currentOffset.toFixed(2)}s` : `${currentOffset.toFixed(2)}s`}
                </div>
                <div className="lyric-offset-hint">正数代表歌词延后显示，负数代表歌词提前显示</div>
              </div>

              <div className="lyric-offset-grid">
                {[-0.5, -0.2, -0.1, -0.05, 0.05, 0.1, 0.2, 0.5].map((delta) => (
                  <Button key={delta} variant="outline" size="sm" onClick={() => handleAdjustOffset(delta)}>
                    {delta > 0 ? `+${delta}s` : `${delta}s`}
                  </Button>
                ))}
              </div>

              <div className="lyric-adjuster-center">
                <Button variant="subtle" size="sm" onClick={handleResetOffset}>
                  <RefreshCw size={13} /> 重置为 0.0s
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'lines' && (
            <div className="lyric-adjuster-section">
              <div className="lyric-line-toolbar">
                <span className="lyric-adjuster-label">共 {lineDrafts.length} 行 · 点击时间可跳转试听</span>
                <div className="lyric-line-toolbar-actions">
                  <Button variant="ghost" size="sm" onClick={handleResetLineEdits} disabled={!lineDirty}>撤销</Button>
                  <Button variant="primary" size="sm" onClick={handleSaveLineEdits} disabled={!lineDirty || lineDrafts.length === 0}>
                    <Save size={14} /> 保存
                  </Button>
                </div>
              </div>
              {lineDrafts.length === 0 ? (
                <div className="lyric-adjuster-alert">当前歌曲还没有可编辑的歌词</div>
              ) : (
                <div className="lyric-line-list">
                  {lineDrafts.map((line, index) => (
                    <div key={index} className="lyric-line-row">
                      <span className="lyric-line-index">{String(index + 1).padStart(2, '0')}</span>
                      <button
                        type="button"
                        className="lyric-line-time"
                        title="跳转到这一行"
                        onClick={() => { if (audioElement) audioElement.currentTime = Math.max(0, Number(line.time) || 0); }}
                      >
                        {formatLineTime(line.time)}
                      </button>
                      <span className="lyric-line-text">{line.text || '…'}</span>
                      <span className="lyric-line-actions">
                        {[-0.5, -0.1, 0.1, 0.5].map((delta) => (
                          <button
                            key={delta}
                            type="button"
                            className="lyric-line-nudge"
                            aria-label={`第 ${index + 1} 行${delta > 0 ? '延后' : '提前'} ${Math.abs(delta)} 秒`}
                            onClick={() => nudgeLine(index, delta)}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </button>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="lyric-adjuster-section">
              <div className="lyric-search-row">
                <Input
                  placeholder="歌曲名称"
                  value={searchTitle}
                  onChange={(event) => setSearchTitle(event.target.value)}
                  aria-label="歌曲名称"
                />
                <Input
                  placeholder="歌手名称（选填）"
                  value={searchArtist}
                  onChange={(event) => setSearchArtist(event.target.value)}
                  aria-label="歌手名称"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSearchLyrics}
                  disabled={searching || !searchTitle.trim()}
                >
                  {searching ? <RefreshCw size={14} className="spin" /> : <Search size={14} />}
                  搜索
                </Button>
              </div>

              {error && (
                <div className="lyric-adjuster-alert is-error" role="alert">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              {appliedMsg && (
                <div className="lyric-adjuster-alert is-success" role="status">
                  <Check size={15} />
                  <span>{appliedMsg}</span>
                </div>
              )}

              {results.length > 0 && (
                <div className="lyric-result-list">
                  <div className="lyric-adjuster-label">搜索匹配结果</div>
                  {results.map((cand, idx) => (
                    <div key={idx} className="lyric-result-card">
                      <div className="lyric-result-info">
                        <div className="lyric-result-tags">
                          <span className="lyric-source-badge">{cand.source}</span>
                          {cand.quality?.wordTimed && <span className="lyric-source-badge is-word">逐字时间轴</span>}
                          <span className="lyric-result-count">共 {cand.lines.length} 行</span>
                        </div>
                        <div className="lyric-result-preview">
                          {cand.lines[0]?.text || '歌词首句预览'} … {cand.lines[1]?.text || ''}
                        </div>
                      </div>
                      <Button variant="primary" size="sm" onClick={() => handleApplyLyrics(cand)}>
                        替换并应用
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
