import React from 'react';
import { Command } from 'cmdk';
import {
  Play, Pause, SkipForward, SkipBack, Heart, Mic2, MonitorSpeaker,
  ListMusic, Settings, Sun, Moon, Disc3, Search, Trophy, HardDrive,
  Radio, History, Home, Command as CommandIcon
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { key: 'home', label: '现代首页', icon: Home },
  { key: 'discover', label: '发现音乐', icon: Disc3 },
  { key: 'search', label: '搜索音乐', icon: Search },
  { key: 'leaderboards', label: '排行榜', icon: Trophy },
  { key: 'local', label: '本地音乐', icon: HardDrive },
  { key: 'liked', label: '我喜欢的音乐', icon: Heart },
  { key: 'recent', label: '最近播放', icon: History },
  { key: 'listen-together', label: '一起听', icon: Radio },
  { key: 'settings', label: '设置', icon: Settings }
];

export default function CommandPalette({ open, onOpenChange }) {
  const {
    currentSong, playlist, isPlaying, togglePlay, playNext, playPrev, playSong,
    toggleLike, likedSongIds, setIsLyricsOpen, setIsQueueOpen, navigateTo,
    colorMode, setColorMode, setTheme
  } = useApp();

  const currentLiked = Boolean(currentSong?.id && (
    likedSongIds?.has?.(currentSong.id)
    || likedSongIds?.has?.(String(currentSong.id))
    || likedSongIds?.has?.(Number(currentSong.id))
  ));

  const closeThen = (action) => () => {
    onOpenChange(false);
    action();
  };

  const items = Array.isArray(playlist) ? playlist.slice(0, 60) : [];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="全局命令面板"
      overlayClassName="command-overlay"
      contentClassName="command-dialog"
    >
      <div className="command-input-row">
        <CommandIcon size={16} className="command-input-icon" />
        <Command.Input className="command-input" placeholder="搜索歌曲、歌手或输入命令…" />
        <kbd className="command-kbd">Esc</kbd>
      </div>

      <Command.List className="command-list">
        <Command.Empty className="command-empty">没有匹配的结果</Command.Empty>

        <Command.Group heading="播放控制" className="command-group">
          <Command.Item value="播放 暂停 play pause" className="command-item" onSelect={closeThen(togglePlay)}>
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            {isPlaying ? '暂停播放' : '继续播放'}
            <kbd className="command-kbd">Space</kbd>
          </Command.Item>
          <Command.Item value="下一首 next" className="command-item" onSelect={closeThen(playNext)} disabled={!playlist?.length}>
            <SkipForward size={15} /> 下一首
          </Command.Item>
          <Command.Item value="上一首 previous" className="command-item" onSelect={closeThen(playPrev)} disabled={!playlist?.length}>
            <SkipBack size={15} /> 上一首
          </Command.Item>
          <Command.Item
            value="收藏 喜欢 like"
            className="command-item"
            disabled={!currentSong?.id}
            onSelect={closeThen(() => toggleLike(currentSong.id))}
          >
            <Heart size={15} fill={currentLiked ? 'currentColor' : 'none'} />
            {currentLiked ? '取消收藏当前歌曲' : '收藏当前歌曲'}
          </Command.Item>
        </Command.Group>

        <Command.Group heading="界面" className="command-group">
          <Command.Item value="沉浸歌词 lyrics" className="command-item" onSelect={closeThen(() => setIsLyricsOpen(true))}>
            <Mic2 size={15} /> 打开沉浸歌词
          </Command.Item>
          <Command.Item value="桌面歌词 desktop lyrics" className="command-item" onSelect={closeThen(() => window.electronAPI?.toggleDesktopLyrics?.())}>
            <MonitorSpeaker size={15} /> 切换桌面歌词
          </Command.Item>
          <Command.Item value="播放队列 queue" className="command-item" onSelect={closeThen(() => setIsQueueOpen(true))}>
            <ListMusic size={15} /> 打开播放队列
          </Command.Item>
          <Command.Item
            value="切换深色浅色 theme mode"
            className="command-item"
            onSelect={closeThen(() => setColorMode(colorMode === 'light' ? 'dark' : 'light'))}
          >
            {colorMode === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            {colorMode === 'light' ? '切换到深色模式' : '切换到浅色模式'}
          </Command.Item>
          <Command.Item value="暖纸 主题 paper theme" className="command-item" onSelect={closeThen(() => setTheme('paper'))}>
            <Disc3 size={15} /> 使用「暖纸」主题
          </Command.Item>
        </Command.Group>

        <Command.Group heading="导航" className="command-group">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <Command.Item key={key} value={`导航 ${label} ${key}`} className="command-item" onSelect={closeThen(() => navigateTo(key))}>
              <Icon size={15} /> {label}
            </Command.Item>
          ))}
        </Command.Group>

        {items.length > 0 && (
          <Command.Group heading={`当前队列（${items.length}）`} className="command-group">
            {items.map((song, index) => {
              const artist = song.ar?.map((item) => item.name).join(' / ')
                || song.artists?.map((item) => item.name).join(' / ')
                || song.artist
                || '未知艺术家';
              return (
                <Command.Item
                  key={`${song.id}-${index}`}
                  value={`${song.name || song.title || ''} ${artist}`}
                  className="command-item"
                  onSelect={closeThen(() => playSong(song, playlist))}
                >
                  <Play size={14} />
                  <span className="command-song-name">{song.name || song.title}</span>
                  <span className="command-song-artist">{artist}</span>
                </Command.Item>
              );
            })}
          </Command.Group>
        )}
      </Command.List>

      <div className="command-footer">
        <span><kbd className="command-kbd">↑</kbd><kbd className="command-kbd">↓</kbd> 选择</span>
        <span><kbd className="command-kbd">Enter</kbd> 执行</span>
        <span><kbd className="command-kbd">Ctrl</kbd> + <kbd className="command-kbd">K</kbd> 开关</span>
      </div>
    </Command.Dialog>
  );
}
