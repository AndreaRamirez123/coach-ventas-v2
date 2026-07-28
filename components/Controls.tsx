import React from 'react';
import { PracticeMode, AiRole, Theme } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ControlsProps {
  isSessionActive: boolean;
  onStart: () => void;
  onStop: () => void;
  selectedMode: PracticeMode;
  onModeChange: (mode: PracticeMode) => void;
  selectedRole: AiRole;
  onRoleChange: (role: AiRole) => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  isFileUploaded: boolean;
  theme: Theme;
  isMuted: boolean;
  onToggleMute: () => void;
}

const StopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" ry="2" />
  </svg>
);

const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const MicOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l14 14" />
  </svg>
);

const MicOnIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v3" />
  </svg>
);

export default function Controls({
  isSessionActive,
  onStart,
  onStop,
  selectedMode,
  onModeChange,
  selectedRole,
  onRoleChange,
  playbackRate,
  onPlaybackRateChange,
  isFileUploaded,
  theme,
  isMuted,
  onToggleMute,
}: ControlsProps): React.ReactElement {
  const { t } = useLanguage();
  const modes: PracticeMode[] = ['Lección Práctica', 'Simulador de Llamada', 'Simulador de Chat'];
  const modeLabels: Record<PracticeMode, string> = {
    'Lección Práctica': t.modeLesson,
    'Simulador de Llamada': t.modeCall,
    'Simulador de Chat': t.modeChat,
  };
  const speedPresets = [0.8, 1.0, 1.2, 1.4];

  const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPlaybackRateChange(parseFloat(e.target.value));
  };

  const containerClass = theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white/50 border-gray-200';
  const textClass = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-xl">
      {!isSessionActive ? (
        <div className="w-full flex flex-col gap-5">
          <div className="flex flex-col space-y-2">
            <label className={`text-xs font-bold text-center uppercase tracking-widest ${textClass}`}>{t.trainingMode}</label>
            <div className="flex flex-col md:flex-row gap-2 w-full">
              {modes.map((mode) => (
                <button
                  key={mode}
                  onClick={() => onModeChange(mode)}
                  className={`flex-1 py-3 px-2 text-xs md:text-sm font-semibold rounded-2xl transition-all duration-300 active:scale-95 border-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                    selectedMode === mode
                      ? 'bg-gradient-to-b from-[#208BFF] to-[#0062CC] border-transparent text-white shadow-[0_4px_10px_rgba(0,122,255,0.4)] scale-105'
                      : `${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`
                  }`}
                >
                  {modeLabels[mode]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <label className={`text-xs font-bold text-center uppercase tracking-widest ${textClass}`}>{t.aiRole}</label>
            <div className={`flex flex-row gap-4 p-2 rounded-xl border justify-center ${containerClass}`}>
              {(['Asesor', 'Cliente'] as AiRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => onRoleChange(role)}
                  className={`flex-1 py-2 px-4 text-sm font-semibold rounded-xl transition-all duration-300 active:scale-95 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                    selectedRole === role
                      ? 'bg-gradient-to-b from-[#208BFF] to-[#0062CC] text-white shadow-[0_4px_10px_rgba(0,122,255,0.4)] scale-105'
                      : `${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
                  }`}
                >
                  {role === 'Asesor' ? t.roleAdvisor : t.roleClient}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full flex justify-center space-x-6 mb-2">
          {selectedMode !== 'Simulador de Chat' && (
            <button
              onClick={onToggleMute}
              className={`p-6 rounded-full flex items-center justify-center text-white transition-all duration-300 active:scale-90 shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.2)] hover:-translate-y-1 border-4
                ${
                  isMuted
                    ? 'bg-gradient-to-b from-gray-500 to-gray-700 border-gray-600 hover:from-gray-400 hover:to-gray-600'
                    : 'bg-gradient-to-b from-white to-gray-100 text-[#007AFF] border-[#007AFF] hover:from-gray-50 hover:to-gray-200'
                }
              `}
              title={isMuted ? t.unmuteMic : t.muteMic}
            >
              {isMuted ? <MicOffIcon /> : <MicOnIcon />}
            </button>
          )}
        </div>
      )}

      {selectedMode !== 'Simulador de Chat' && (
        <div className={`w-full p-4 rounded-xl border ${containerClass}`}>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="speed-control" className={`text-sm font-semibold ${textClass}`}>
              {t.speechSpeed}
            </label>
            <span className="font-bold text-cyan-500">{playbackRate.toFixed(1)}x</span>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            {speedPresets.map((rate) => (
              <button
                key={rate}
                onClick={() => onPlaybackRateChange(rate)}
                className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                  Math.abs(playbackRate - rate) < 0.05
                    ? 'bg-cyan-500 text-white border-cyan-500'
                    : theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {rate.toFixed(1)}x
              </button>
            ))}
          </div>

          <input
            id="speed-control"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={playbackRate}
            onChange={handlePlaybackRateChange}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-cyan-200/50"
          />
        </div>
      )}

      <button
        onClick={isSessionActive ? onStop : onStart}
        disabled={!isFileUploaded}
        style={!isSessionActive ? { backgroundImage: 'linear-gradient(to bottom, var(--brand-primary), var(--brand-secondary))' } : undefined}
        className={`w-full max-w-sm px-4 sm:px-6 py-3 sm:py-4 rounded-full flex items-center justify-center text-white font-semibold transition-all duration-300 active:scale-95 text-base sm:text-lg shadow-[0_8px_16px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.3)] hover:-translate-y-1
          ${
            isSessionActive
              ? 'bg-gradient-to-b from-[#FF4B40] to-[#D70015]'
              : `${!isFileUploaded ? 'opacity-50 cursor-not-allowed grayscale hover:translate-y-0 hover:shadow-none' : ''}`
          }
        `}
      >
        {isSessionActive ? (
          <>
            <StopIcon />
            <span className="ml-3">
              {selectedMode === 'Simulador de Chat'
                ? t.stopChat
                : selectedMode === 'Simulador de Llamada'
                  ? t.stopCall
                  : t.stopSession}
            </span>
          </>
        ) : (
          <>
            {selectedMode === 'Simulador de Chat' ? <ChatIcon /> : <MicIcon />}
            <span className="ml-3">
              {selectedMode === 'Simulador de Chat'
                ? t.startChat
                : selectedMode === 'Simulador de Llamada'
                  ? t.startCall
                  : t.startVoice}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
