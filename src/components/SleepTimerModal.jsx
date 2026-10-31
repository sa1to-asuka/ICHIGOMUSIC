import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Moon, X } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalClose, Button, IconButton } from './ui';

export default function SleepTimerModal({ isOpen, onClose }) {
  const { volume } = useApp();

  const [timerMode, setTimerMode] = useState('minutes');
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  const [customMinutes, setCustomMinutes] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen) return undefined;
    const checkState = () => {
      const state = window.__ICHIGO_SLEEP_TIMER__;
      if (state && state.active && state.targetTime > Date.now()) {
        setIsRunning(true);
        setRemainingSeconds(Math.max(0, Math.round((state.targetTime - Date.now()) / 1000)));
      } else if (state && state.active && state.endOfSong) {
        setIsRunning(true);
        setTimerMode('endOfSong');
      } else {
        setIsRunning(false);
        setRemainingSeconds(0);
      }
    };
    checkState();
    const interval = setInterval(checkState, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleStartTimer = () => {
    const mins = customMinutes ? Number(customMinutes) : selectedMinutes;
    if (timerMode === 'minutes') {
      if (!mins || mins <= 0) return;
      window.__ICHIGO_SLEEP_TIMER__ = {
        active: true,
        endOfSong: false,
        targetTime: Date.now() + mins * 60 * 1000,
        originalVolume: volume
      };
      setIsRunning(true);
      setRemainingSeconds(mins * 60);
    } else {
      window.__ICHIGO_SLEEP_TIMER__ = {
        active: true,
        endOfSong: true,
        targetTime: 0,
        originalVolume: volume
      };
      setIsRunning(true);
    }
    onClose();
  };

  const handleCancelTimer = () => {
    window.__ICHIGO_SLEEP_TIMER__ = null;
    setIsRunning(false);
    setRemainingSeconds(0);
  };

  const formatRemaining = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ModalContent className="sleep-timer-dialog" showClose={false} aria-describedby={undefined}>
        <ModalHeader>
          <div className="sleep-timer-heading">
            <span className="sleep-timer-icon"><Moon size={20} /></span>
            <div>
              <ModalTitle>睡眠定时器</ModalTitle>
              <p className="sleep-timer-hint">停止播放并在结束前自动渐弱音量</p>
            </div>
          </div>
          <ModalClose asChild>
            <IconButton label="关闭" variant="ghost" size="sm"><X size={16} /></IconButton>
          </ModalClose>
        </ModalHeader>

        {isRunning && (
          <div className="sleep-timer-running">
            <div>
              <div className="sleep-timer-running-label">定时关闭运行中</div>
              <div className="sleep-timer-running-value">
                {timerMode === 'endOfSong' ? '播完本曲后停止' : formatRemaining(remainingSeconds)}
              </div>
            </div>
            <Button variant="danger" size="sm" onClick={handleCancelTimer}>取消定时</Button>
          </div>
        )}

        <div className="sleep-timer-section">
          <div className="sleep-timer-label">选择定时时长</div>
          <div className="sleep-timer-presets">
            {[15, 30, 45, 60, 90].map((mins) => {
              const active = timerMode === 'minutes' && selectedMinutes === mins && !customMinutes;
              return (
                <button
                  key={mins}
                  type="button"
                  className={`sleep-timer-preset ${active ? 'active' : ''}`}
                  onClick={() => {
                    setTimerMode('minutes');
                    setSelectedMinutes(mins);
                    setCustomMinutes('');
                  }}
                >
                  {mins} 分钟
                </button>
              );
            })}
            <button
              type="button"
              className={`sleep-timer-preset ${timerMode === 'endOfSong' ? 'active' : ''}`}
              onClick={() => setTimerMode('endOfSong')}
            >
              播完本曲后
            </button>
          </div>
        </div>

        <div className="sleep-timer-custom">
          <label className="sleep-timer-label" htmlFor="sleep-timer-custom-minutes">自定义分钟数</label>
          <input
            id="sleep-timer-custom-minutes"
            className="ui-text-input"
            type="number"
            min="1"
            max="600"
            inputMode="numeric"
            placeholder="例如 20"
            value={customMinutes}
            onChange={(event) => {
              setCustomMinutes(event.target.value);
              if (event.target.value) setTimerMode('minutes');
            }}
          />
        </div>

        <div className="sleep-timer-actions">
          <Button variant="ghost" onClick={onClose}>关闭</Button>
          <Button variant="primary" onClick={handleStartTimer}>
            {isRunning ? '更新并重新开始' : '开启定时关闭'}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
