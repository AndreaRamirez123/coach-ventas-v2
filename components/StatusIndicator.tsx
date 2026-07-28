
import React from 'react';
import { ConversationStatus, Theme } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface StatusIndicatorProps {
  status: ConversationStatus;
  theme: Theme;
  large?: boolean;
}

export default function StatusIndicator({ status, theme, large = false }: StatusIndicatorProps): React.ReactElement {
  const { t } = useLanguage();
  const getStatusInfo = () => {
    switch (status) {
      case 'listening':
        return { text: t.listening, color: 'bg-green-500', pulse: true };
      case 'speaking':
        return { text: t.aiSpeaking, color: 'bg-cyan-500', pulse: false };
      case 'thinking':
        return { text: t.aiThinking, color: 'bg-yellow-500', pulse: true };
      case 'connecting':
        return { text: t.connecting, color: 'bg-yellow-500', pulse: true };
      case 'idle':
      default:
        return { text: t.ready, color: 'bg-gray-500', pulse: false };
    }
  };

  const { text, color, pulse } = getStatusInfo();
  const textColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  const containerHeight = large ? 'h-64' : 'h-12';
  const waveHeight = large ? 'h-32' : 'h-6';
  const waveWidth = large ? 'w-3' : 'w-1.5';
  const waveSpacing = large ? 'space-x-2' : 'space-x-1';

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${containerHeight} transition-all duration-500`}>
      <style>
        {`
          @keyframes siri-wave {
            0%, 100% { transform: scaleY(0.3); opacity: 0.5; }
            50% { transform: scaleY(1); opacity: 1; }
          }
          .animate-siri-wave {
            animation: siri-wave 1s ease-in-out infinite;
          }
          .siri-orb-glow {
            box-shadow: 0 0 60px 20px rgba(6, 182, 212, 0.4), 0 0 100px 40px rgba(217, 70, 239, 0.2);
          }
        `}
      </style>
      
      {status === 'speaking' ? (
        <div className={`flex items-center justify-center ${waveSpacing} ${waveHeight} relative`}>
          {large && (
              <div className="absolute inset-0 rounded-full siri-orb-glow animate-pulse opacity-50 pointer-events-none"></div>
          )}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className={`${waveWidth} bg-gradient-to-t from-cyan-400 via-blue-500 to-fuchsia-500 rounded-full animate-siri-wave relative z-10`}
              style={{
                height: '100%',
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      ) : (
        <div className={`flex items-center justify-center ${waveHeight}`}>
            <div className={`rounded-full ${color} transition-colors ${pulse ? 'animate-pulse' : ''} ${large ? 'w-8 h-8' : 'w-3 h-3'}`}></div>
        </div>
      )}
      <span className={`font-medium ${textColor} ${large ? 'text-xl' : 'text-sm'}`}>{text}</span>
    </div>
  );
}
