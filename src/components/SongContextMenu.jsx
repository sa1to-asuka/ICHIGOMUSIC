import React from 'react';
import {
  Play, ListStart, ListPlus, Heart, Mic2, Disc3, User, Link2, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator
} from './ui';
import { useApp } from '../context/AppContext';

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function SongContextMenu({ song, queue, children }) {
  const {
    playSong,
    insertAfterCurrent,
    appendToQueue,
    toggleLike,
    likedSongIds,
    navigateTo,
    setIsLyricsOpen
  } = useApp();

  if (!song?.id) return children;

  const album = song.al || song.album || null;
  const artists = Array.isArray(song.ar) ? song.ar : (Array.isArray(song.artists) ? song.artists : []);
  const artist = artists[0] || null;
  const liked = Boolean(likedSongIds?.has?.(song.id)
    || likedSongIds?.has?.(String(song.id))
    || likedSongIds?.has?.(Number(song.id)));

  const handlePlay = () => playSong(song, queue || [song]);

  const handlePlayNext = () => {
    if (insertAfterCurrent(song)) toast.success('将在下一首播放');
  };

  const handleAddToQueue = () => {
    if (appendToQueue(song)) toast.success('已加入播放队列');
  };

  const handleToggleLike = async () => {
    const ok = await toggleLike(song.id);
    if (ok) toast.success(liked ? '已取消收藏' : '已收藏');
  };

  const handleShowLyrics = () => {
    if (queue?.length) playSong(song, queue);
    setIsLyricsOpen(true);
  };

  const handleCopyLink = async () => {
    const ok = await copyText(`https://music.163.com/song?id=${song.id}`);
    if (ok) toast.success('歌曲链接已复制');
    else toast.error('复制失败，请检查剪贴板权限');
  };

  const handleCopyInfo = async () => {
    const artistName = artists.map((item) => item?.name).filter(Boolean).join(' / ');
    const ok = await copyText(artistName ? `${song.name} - ${artistName}` : song.name);
    if (ok) toast.success('歌曲信息已复制');
    else toast.error('复制失败，请检查剪贴板权限');
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="song-context-menu">
        <ContextMenuItem onSelect={handlePlay}>
          <Play size={15} /> 播放
        </ContextMenuItem>
        <ContextMenuItem onSelect={handlePlayNext}>
          <ListStart size={15} /> 下一首播放
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleAddToQueue}>
          <ListPlus size={15} /> 加入播放队列
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={handleToggleLike}>
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} /> {liked ? '取消收藏' : '收藏'}
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleShowLyrics}>
          <Mic2 size={15} /> 查看歌词
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          disabled={!album?.id}
          onSelect={() => album?.id && navigateTo('album-detail', { id: album.id })}
        >
          <Disc3 size={15} /> 前往专辑
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!artist?.id}
          onSelect={() => artist?.id && navigateTo('artist-detail', { id: artist.id })}
        >
          <User size={15} /> 前往歌手
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={handleCopyLink}>
          <Link2 size={15} /> 复制歌曲链接
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleCopyInfo}>
          <Copy size={15} /> 复制歌曲信息
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
