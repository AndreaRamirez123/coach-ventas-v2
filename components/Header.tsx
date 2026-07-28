
import React from 'react';
import { Theme } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
    children?: React.ReactNode;
    theme: Theme;
    onToggleTheme: () => void;
    brand?: { name?: string; logoDataUrl?: string; primaryColor?: string; secondaryColor?: string; };
}

const BrainIcon = ({ logoDataUrl, primaryColor = '#0ea5e9' }: { logoDataUrl?: string; primaryColor?: string }) => (
    <div className="w-20 h-12 rounded-2xl bg-[#e0f2fe] flex items-center justify-center overflow-hidden px-2" style={{ backgroundColor: `${primaryColor}22` }}>
        {logoDataUrl ? (
            <img src={logoDataUrl} alt="logo" className="w-full h-full object-contain" />
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.874 15.013a5.98 5.98 0 011.05-3.328c.99-1.393 2.585-2.22 4.314-2.22h.004c1.73 0 3.324.827 4.314 2.22a5.98 5.98 0 011.05 3.328c.11.543.166 1.09.166 1.637 0 3.314-2.686 6-6 6s-6-2.686-6-6c0-.547.056-1.094.166-1.637z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 12V6m0 0a2.25 2.25 0 00-2.25 2.25v1.5a2.25 2.25 0 004.5 0v-1.5A2.25 2.25 0 0012 6zm-5.636 9.364a2.25 2.25 0 003.182 0M14.454 21.364a2.25 2.25 0 003.182 0M12 21.013v.012" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.364 15.364a2.25 2.25 0 010-3.182m11.272 3.182a2.25 2.25 0 000-3.182" />
            </svg>
        )}
    </div>
);

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
);

export default function Header({ children, theme, onToggleTheme, brand }: HeaderProps): React.ReactElement {
  const primary = brand?.primaryColor || '#0ea5e9';
  const secondary = brand?.secondaryColor || '#a855f7';
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className={`p-4 border-b flex items-center justify-between sticky top-0 z-50 backdrop-blur-md ${theme === 'dark' ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-100 shadow-sm'}`}>
        <div className="flex items-center space-x-4">
            <BrainIcon logoDataUrl={brand?.logoDataUrl} primaryColor={primary} />
            <div className="flex flex-col">
                <h1 className="text-base sm:text-xl font-bold text-transparent bg-clip-text leading-tight" style={{ backgroundImage: `linear-gradient(to right, ${primary}, ${secondary})` }}>
                    {t.appName}
                </h1>
                <span className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {brand?.name || t.tagline}
                </span>
            </div>
        </div>

        <div className="flex items-center space-x-2">
            <button
                onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all duration-200 active:scale-90 border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'}`}
                aria-label="Toggle Language"
            >
                {language === 'es' ? '🇺🇸 EN' : '🇪🇸 ES'}
            </button>
            <button
                onClick={onToggleTheme}
                className={`p-2 rounded-full transition-all duration-200 active:scale-90 ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                aria-label="Toggle Theme"
            >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            {children}
        </div>
    </header>
  );
}
