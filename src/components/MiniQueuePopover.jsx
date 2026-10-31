import React, { useEffect, useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useApp } from '../context/AppContext';
import { Play, ListMusic, HeartPulse, Trash2, GripVertical } from 'lucide-react';
import { EmptyState, IconButton } from './ui';
import { toast } from 'sonner';

export default function MiniQueuePopover({ isOpen, onClose }) {
  const { playlist, setPlaylist, playlistIndex, setPlaylistIndex, currentSong, playSong, playMode } = useApp();
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const parentRef = useRef(null);
  const activeItemRef = useRef(null);

  const songs = playlist || [];
  const isHeart = playMode === 'heart';

  const rowVirtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10
  });

  useEffect(() => {
    if (!isOpen) return;
    const activeIndex = songs.findIndex((song) => String(song?.id) === String(currentSong?.id));
    if (activeIndex < 0) return;
    const timer = setTimeout(() => {
      rowVirtualizer.scrollToIndex(activeIndex, { align: 'center' });
      window.setTimeout(() => {
        activeItemRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
      }, 120);
    }, 60);
    return () => clearTimeout(timer);
  }, [isOpen, currentSong?.id, songs.length, rowVirtualizer]);

  if (!isOpen) return null;

  const moveItem = (from, to) => {
    if (from === null || to === null || from === to) return;
    if (from < 0 || to < 0 || from >= songs.length || to >= songs.length) return;
    const next = [...songs];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const currentIndex = next.findIndex((song) => String(song?.id) === String(currentSong?.id));
    setPlaylist(next);
    if (currentIndex >= 0 && currentIndex !== playlistIndex) setPlaylistIndex(currentIndex);
  };

  const removeItem = (index) => {
    const next = [...songs];
    const [removed] = next.splice(index, 1);
    setPlaylist(next);
    if (index < playlistIndex) setPlaylistIndex(playlistIndex - 1);
    toast.success(`已从队列移除 ${removed?.name || '歌曲'}`);
  };

  const virtualItems = rowVirtualizer.getVirtualItems();

  return <>
    <button type="button" className="modern-queue-overlay open" aria-label="关闭播放队列" onClick={onClose} />
    <aside className={`modern-queue-sidebar open ${isHeart ? 'is-heart-sidebar' : ''}`} aria-label="当前播放队列">
      <header className="modern-queue-header">
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {isHeart ? <>心动模式 <HeartPulse size={16} color="var(--primary)" className="heart-mode-icon" /></> : '播放队列'}
          </span>
          <small>{songs.length} 首{isHeart ? ' · 智能推荐中' : ''}</small>
        </div>
        <IconButton label="关闭播放队列" size="sm" onClick={onClose}>×</IconButton>
      </header>
      {songs.length ? (
        <div ref={parentRef} className="modern-queue-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
            {virtualItems.map((virtualRow) => {
              const index = virtualRow.index;
              const song = songs[index];
              const isNow = String(currentSong?.id) === String(song.id);
              const coverUrl = song?.coverUrl || song?.al?.picUrl || '';
              return (
                <div
                  key={`${song.id}-${index}`}
                  ref={(node) => {
                    rowVirtualizer.measureElement(node);
                    if (isNow) activeItemRef.current = node;
                  }}
                  data-index={index}
                  className={`modern-queue-item queue-item ${isNow ? 'now' : ''} ${dragIndex === index ? 'is-dragging' : ''} ${dragOverIndex === index ? 'is-drag-over' : ''}`}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
                  draggable
                  role="button"
                  tabIndex={0}
                  aria-current={isNow ? 'true' : undefined}
                  aria-label={`${song.name || '歌曲'}，拖动排序，或按 Alt 加上下方向键调整`}
                  onDragStart={(event) => {
                    setDragIndex(index);
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', String(index));
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDragOverIndex(index);
                  }}
                  onDragLeave={() => setDragOverIndex((prev) => (prev === index ? null : prev))}
                  onDrop={(event) => {
                    event.preventDefault();
                    moveItem(dragIndex, index);
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  onKeyDown={(event) => {
                    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
                    event.preventDefault();
                    moveItem(index, event.key === 'ArrowUp' ? index - 1 : index + 1);
                  }}
                  onClick={() => !isNow && playSong(song, songs)}
                >
                  <span className="queue-drag-handle" aria-hidden="true"><GripVertical size={12} /></span>
                  <span className="queue-cover" style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined} />
                  <span className="queue-info">
                    <b className="queue-name">
                      {song.name}
                      {song.isHeartRecommend && <span className="queue-heart-pill">心动推荐</span>}
                    </b>
                    <small className="queue-artist">{song.ar?.[0]?.name || song.artists?.[0]?.name || song.artist || '未知艺术家'}</small>
                  </span>
                  {isNow && <Play size={14} fill="currentColor" />}
                  <button
                    type="button"
                    draggable={false}
                    className="queue-remove-btn"
                    aria-label={`从队列移除 ${song.name || ''}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeItem(index);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState icon={<ListMusic size={26} />} title="播放队列为空" description="从歌单或搜索结果中选择一首歌开始播放。" />
      )}
    </aside>
  </>;
}
