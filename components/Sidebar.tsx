import React, { useRef, useState } from 'react';
import { PracticeMode, VoiceName, Theme } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { GEMINI_API_KEY } from '../services/geminiConfig';
import { GoogleGenAI, Modality } from '@google/genai';
import { decode, decodeAudioData } from '../services/audioUtils';

const voiceEngineMap: Record<VoiceName, string> = {
    Miguel: 'Zephyr',
    Ismael: 'Charon',
    Diego: 'Fenrir',
    Andrea: 'Kore',
    Sonia: 'Puck',
    Angela: 'Aoede'
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  useFreeMode: boolean;
  onUseFreeModeChange: (useFreeMode: boolean) => void;
  selectedVoice: VoiceName;
  onVoiceChange: (voice: VoiceName) => void;
  showTranscript: boolean;
  onShowTranscriptChange: (show: boolean) => void;
  disableVoicePreview?: boolean;
  onOpenTutorial?: () => void;
}

const ZephyrIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
    </svg>
);

const PuckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 20c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z"/>
    </svg>
);

const CharonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        <path d="M4 20h16v2H4z" opacity="0.3"/>
    </svg>
);

const KoreIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M12 2c-4.97 0-9 4.03-9 9 0 4.17 2.84 7.67 6.69 8.69L12 22l2.31-2.31C18.16 18.67 21 15.17 21 11c0-4.97-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7zm-3-8c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm6 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
    </svg>
);

const FenrirIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
         <path d="M21 11c0-4.97-4.03-9-9-9s-9 4.03-9 9c0 2.12.74 4.07 1.97 5.61L3 21l4.39-1.03C8.93 20.74 10.88 21.48 13 21.48c.17 0 .33-.01.5-.02V21h7v-2h-1.52c1.23-2.18 2.02-4.8 2.02-8zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
         <path d="M17 11.5l-2-2-2 2 2 2 2-2z"/>
    </svg>
);

const AoedeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        <circle cx="12" cy="12" r="1.5" fill="white" />
    </svg>
);

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M8 5v14l11-7z"/>
    </svg>
);

const Avatar = ({ name, label, selected, theme, onPreview }: { name: VoiceName, label: string, selected: boolean, theme: Theme, onPreview: () => void }) => {
    const colors: Record<VoiceName, { bg: string, accent: string }> = {
        'Miguel': { bg: 'bg-cyan-100', accent: 'text-cyan-600' },
        'Ismael': { bg: 'bg-slate-300', accent: 'text-slate-700' },
        'Diego': { bg: 'bg-red-100', accent: 'text-red-600' },
        'Andrea': { bg: 'bg-pink-100', accent: 'text-pink-600' },
        'Sonia': { bg: 'bg-orange-100', accent: 'text-orange-600' },
        'Angela': { bg: 'bg-purple-100', accent: 'text-purple-600' }
    };

    const icons: Record<VoiceName, React.ReactElement> = {
        'Miguel': <ZephyrIcon />,
        'Ismael': <CharonIcon />,
        'Diego': <FenrirIcon />,
        'Andrea': <KoreIcon />,
        'Sonia': <PuckIcon />,
        'Angela': <AoedeIcon />
    };

    const c = colors[name];
    const isDark = theme === 'dark';

    return (
        <div className={`flex flex-col items-center gap-2 transition-all duration-300 ${selected ? 'scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'} relative group`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 shadow-md ${c.bg} ${c.accent} ${selected ? 'border-fuchsia-500' : 'border-transparent'}`}>
                {icons[name]}
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); onPreview(); }}
                className="absolute top-0 right-0 bg-white text-black p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200"
                title="Previsualizar Voz"
            >
                <PlayIcon />
            </button>
            <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} ${selected ? (isDark ? 'text-white' : 'text-black font-bold') : ''}`}>
                {label}
            </span>
        </div>
    );
};

export default function Sidebar({ isOpen, onClose, theme, useFreeMode, onUseFreeModeChange, selectedVoice, onVoiceChange, showTranscript, onShowTranscriptChange, disableVoicePreview = false, onOpenTutorial }: SidebarProps) {
    const { t } = useLanguage();
    const isDark = theme === 'dark';
    const bgClass = isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200';
    const textClass = isDark ? 'text-white' : 'text-gray-900';
    const overlayClass = isDark ? 'bg-black/50' : 'bg-gray-900/20';

    const voices: VoiceName[] = ['Miguel', 'Ismael', 'Diego', 'Andrea', 'Sonia', 'Angela'];
    const voiceLabels: Record<VoiceName, string> = {
      Miguel: 'Miguel',
      Ismael: 'Ismael',
      Diego: 'Diego',
      Andrea: 'Andrea',
      Sonia: 'Sonia',
      Angela: 'Angela',
    };

    const [previewingVoice, setPreviewingVoice] = useState<VoiceName | null>(null);
    const previewCacheRef = useRef<Map<VoiceName, string>>(new Map());
    const previewCtxRef = useRef<AudioContext | null>(null);

    const playPreviewAudio = async (base64Audio: string) => {
        if (!previewCtxRef.current || previewCtxRef.current.state === 'closed') {
            previewCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }

        const ctx = previewCtxRef.current;
        await ctx.resume();
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setPreviewingVoice(null);
        source.start(0);
    };

    const handlePreview = async (voice: VoiceName) => {
        if (disableVoicePreview || previewingVoice) return;

        setPreviewingVoice(voice);
        try {
            const cached = previewCacheRef.current.get(voice);
            if (cached) {
                await playPreviewAudio(cached);
                return;
            }

            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
            const models = ["gemini-2.5-flash-preview-tts", "gemini-2.5-flash-native-audio-preview-09-2025"];
            let base64Audio: string | undefined;

            for (const model of models) {
                try {
                    const response = await ai.models.generateContent({
                        model,
                        contents: [{ parts: [{ text: 'Hola, soy tu coach de ventas.' }] }],
                        config: {
                            responseModalities: [Modality.AUDIO],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: { voiceName: voiceEngineMap[voice] || 'Zephyr' }
                                }
                            }
                        }
                    });

                    base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                    if (base64Audio) break;
                } catch (_) {
                    // intenta con siguiente modelo
                }
            }

            if (!base64Audio) {
                throw new Error('No fue posible generar previsualización para esta voz');
            }

            previewCacheRef.current.set(voice, base64Audio);
            await playPreviewAudio(base64Audio);
        } catch (err) {
            console.error("Error previewing voice:", err);
            setPreviewingVoice(null);
        }
    };

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div 
                    className={`fixed inset-0 z-40 transition-opacity ${overlayClass}`}
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed top-0 right-0 h-full w-full sm:w-80 z-50 transform transition-transform duration-300 ease-in-out border-l shadow-2xl ${bgClass} ${isOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
                <div className="p-6 space-y-8">
                    <div className="flex justify-between items-center">
                        <h2 className={`text-xl font-bold ${textClass}`}>{t.settings}</h2>
                        <button onClick={onClose} className={`p-2 rounded-full hover:bg-gray-500/20 transition-colors ${textClass}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Mode Selection */}
                    <div className="space-y-3">
                        <h3 className={`text-sm font-bold uppercase tracking-wider opacity-70 ${textClass}`}>{t.trainingModeLabel}</h3>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => onUseFreeModeChange(false)}
                                className={`p-3 rounded-xl text-left font-semibold transition-all duration-200 active:scale-95 border-2 ${!useFreeMode ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]' : 'border-transparent hover:bg-gray-500/10 ' + textClass}`}
                            >
                                {t.companyCoach}
                            </button>
                            <button
                                onClick={() => onUseFreeModeChange(true)}
                                className={`p-3 rounded-xl text-left font-semibold transition-all duration-200 active:scale-95 border-2 ${useFreeMode ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]' : 'border-transparent hover:bg-gray-500/10 ' + textClass}`}
                            >
                                {t.freeCoach}
                            </button>
                        </div>
                    </div>

                    {/* Transcript Toggle */}
                    <div className="space-y-3">
                        <h3 className={`text-sm font-bold uppercase tracking-wider opacity-70 ${textClass}`}>{t.visualization}</h3>
                        <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-gray-500/10 transition-colors">
                            <span className={`font-semibold ${textClass}`}>{t.showTranscript}</span>
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={showTranscript} onChange={(e) => onShowTranscriptChange(e.target.checked)} />
                                <div className={`block w-14 h-8 rounded-full transition-colors ${showTranscript ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${showTranscript ? 'transform translate-x-6' : ''}`}></div>
                            </div>
                        </label>
                        <button
                          onClick={onOpenTutorial}
                          className={`w-full text-left p-3 rounded-xl font-semibold transition-all duration-200 active:scale-95 border-2 border-transparent hover:bg-gray-500/10 ${textClass}`}
                        >
                          {t.tutorial}
                        </button>
                    </div>

                    {/* Voice Selection */}
                    <div className="space-y-4">
                        <h3 className={`text-sm font-bold uppercase tracking-wider opacity-70 ${textClass}`}>{t.selectVoice}</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {voices.map(v => (
                                <div 
                                    key={v} 
                                    onClick={() => { onVoiceChange(v); handlePreview(v); }} 
                                    className="outline-none cursor-pointer"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onVoiceChange(v); handlePreview(v); } }}
                                >
                                    <Avatar name={v} label={voiceLabels[v]} selected={selectedVoice === v} theme={theme} onPreview={() => handlePreview(v)} />
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}
