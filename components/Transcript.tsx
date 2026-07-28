
import React, { useEffect, useRef } from 'react';
import { TranscriptTurn, Theme } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TranscriptProps {
  transcript: TranscriptTurn[];
  theme: Theme;
}

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);

const AiIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-fuchsia-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 4.5a.75.75 0 01.75.75v.01a.75.75 0 01-1.5 0v-.01a.75.75 0 01.75-.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12h.01M16.5 12h.01M7.5 12h.01" />
    </svg>
);

const LightbulbIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);


export default function Transcript({ transcript, theme }: TranscriptProps): React.ReactElement {
  const { t } = useLanguage();
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="flex-grow p-4 space-y-4">
      {transcript.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
            <p className="font-semibold">{t.transcriptEmpty}</p>
            <p className="text-sm">{t.transcriptStart}</p>
          </div>
      )}
      {transcript.map((turn, index) => {
        const isAi = turn.speaker === 'ai';
        const feedbackTag = '[RETROALIMENTACIÓN]';
        const hasFeedback = isAi && turn.text.includes(feedbackTag);
        let dialogue = turn.text;
        let feedbackText = '';

        if (hasFeedback) {
            const parts = turn.text.split(feedbackTag);
            dialogue = parts[0].trim();
            feedbackText = parts.slice(1).join(feedbackTag).trim();
        }

        const bubbleClass = isAi 
            ? (theme === 'dark' ? 'bg-gray-700/60 text-white rounded-bl-none' : 'bg-gray-200 text-gray-800 rounded-bl-none')
            : 'bg-cyan-600/90 text-white rounded-br-none';

        const iconBg = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200';

        return (
            <div
            key={index}
            className={`flex items-start gap-3 ${
                turn.speaker === 'user' ? 'justify-end' : 'justify-start'
            }`}
            >
            {isAi && <div className={`flex-shrink-0 p-1 rounded-full mt-1 ${iconBg}`}><AiIcon /></div>}
            
            <div className="flex flex-col max-w-md lg:max-w-lg">
                {dialogue && (
                    <div className={`p-3 rounded-2xl ${bubbleClass} shadow-sm`}>
                        <p className="text-sm md:text-base whitespace-pre-wrap">{dialogue}</p>
                    </div>
                )}
                
                {feedbackText && (
                    <div className={`mt-2 p-4 border-l-4 border-fuchsia-500 rounded-r-xl shadow-md ${theme === 'dark' ? 'bg-fuchsia-900/20 text-gray-200' : 'bg-fuchsia-50 text-gray-800'}`}>
                        <div className="flex items-center mb-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-fuchsia-500 text-white mr-2">
                                <LightbulbIcon/>
                            </span>
                            <span className="text-sm font-bold tracking-wider text-fuchsia-600 dark:text-fuchsia-400 uppercase">
                                FEEDBACK:
                            </span>
                        </div>
                        <p className="text-sm md:text-base font-medium leading-relaxed whitespace-pre-wrap">{feedbackText}</p>
                    </div>
                )}
            </div>

            {!isAi && <div className={`flex-shrink-0 p-1 rounded-full mt-1 ${iconBg}`}><UserIcon/></div>}
            </div>
        )
      })}
      <div ref={endOfMessagesRef} />
    </div>
  );
}
