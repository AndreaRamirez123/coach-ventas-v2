
import React, { useState } from 'react';
import { Theme } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TextInputProps {
    onSend: (message: string) => void;
    disabled: boolean;
    theme: Theme;
}

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
    </svg>
);

export default function TextInput({ onSend, disabled, theme }: TextInputProps): React.ReactElement {
    const { t } = useLanguage();
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim()) {
            onSend(message);
            setMessage('');
        }
    };

    return (
        <div className={`p-3 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'}`}>
            <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t.textPlaceholder}
                    disabled={disabled}
                    className={`flex-grow border text-sm rounded-lg block w-full p-2.5 outline-none focus:ring-2 focus:ring-cyan-500 transition-colors
                        ${theme === 'dark' 
                            ? 'bg-gray-700/50 border-gray-600 text-gray-200 placeholder-gray-400' 
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'}`}
                    autoComplete="off"
                />
                <button
                    type="submit"
                    disabled={disabled || !message.trim()}
                    className="inline-flex justify-center items-center p-2.5 rounded-full cursor-pointer transition-all duration-200 text-white
                               bg-[#007AFF] hover:bg-[#0062CC] active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm"
                    aria-label="Enviar mensaje"
                >
                    <SendIcon />
                </button>
            </form>
        </div>
    );
}
