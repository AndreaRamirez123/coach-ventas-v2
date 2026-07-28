
import React, { useState } from 'react';
import { User, Theme } from '../types';
import Header from './Header';
import { useLanguage } from '../context/LanguageContext';
import { hasFirebaseConfig, signInWithGoogle } from '../services/firebase';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  theme: Theme;
  onToggleTheme: () => void;
}

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function Login({ users, onLogin, theme, onToggleTheme }: LoginProps): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const { t } = useLanguage();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setError('');
      onLogin(user);
    } else {
      setError(t.wrongCredentials);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const googleUser = await signInWithGoogle();
      if (!googleUser) return;
      const matched = users.find(u => u.email.toLowerCase() === googleUser.email.toLowerCase());
      if (matched) {
        onLogin(matched);
      } else {
        setError(t.googleNotRegistered);
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(t.wrongCredentials);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const bgClass = theme === 'dark' ? 'bg-gray-900' : 'bg-[#f8f9fa]';
  const cardClass = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]';
  const textClass = theme === 'dark' ? 'text-gray-300' : 'text-gray-500';
  const headingClass = theme === 'dark' ? 'text-white' : 'text-[#1a1f2c]';
  const inputClass = theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400';
  const featureBoxClass = theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-100 shadow-sm text-gray-700';

  return (
    <div className={`min-h-screen flex flex-col ${bgClass} font-sans`}>
      <Header theme={theme} onToggleTheme={onToggleTheme} />
      <div className="flex-grow flex items-center justify-center p-4 md:p-8">
        <div className="max-w-6xl w-full grid md:grid-cols-2 gap-6 md:gap-12 items-center">
          
          {/* Left Column: Marketing / Features */}
          <div className="space-y-6 hidden md:block">
            <div>
              <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-4 ${headingClass}`}>
                {t.loginHero} <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
                  {t.loginHeroHighlight}
                </span>
              </h1>
              <p className={`text-lg md:text-xl ${textClass} max-w-lg`}>
                {t.loginDesc}
              </p>
            </div>

            <div className="space-y-4 max-w-lg">
              <div className={`flex items-center space-x-4 p-4 rounded-xl border ${featureBoxClass}`}>
                <span className="text-xl">🎯</span>
                <span className="font-medium">{t.feature1}</span>
              </div>
              <div className={`flex items-center space-x-4 p-4 rounded-xl border ${featureBoxClass}`}>
                <span className="text-xl">🧠</span>
                <span className="font-medium">{t.feature2}</span>
              </div>
              <div className={`flex items-center space-x-4 p-4 rounded-xl border ${featureBoxClass}`}>
                <span className="text-xl">📈</span>
                <span className="font-medium">{t.feature3}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Login Card */}
          <div className="flex justify-center md:justify-end">
            <div className={`p-8 md:p-10 rounded-3xl border w-full max-w-md ${cardClass}`}>
              <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold brand-gradient-text mb-2">
                      {t.welcome}
                  </h2>
                  <p className={`text-sm ${textClass}`}>{t.platformName}</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                  {error && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center font-medium">
                          {error}
                      </div>
                  )}
                  
                  <div>
                      <label className={`block text-sm font-medium mb-2 ${textClass}`}>{t.email}</label>
                      <input
                          type="email"
                          required
                          className={`w-full rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow border ${inputClass}`}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t.emailPlaceholder}
                      />
                  </div>

                  <div>
                      <label className={`block text-sm font-medium mb-2 ${textClass}`}>{t.password}</label>
                      <input
                          type="password"
                          required
                          className={`w-full rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow border ${inputClass}`}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                      />
                  </div>

                  <button
                      type="submit"
                      className="w-full brand-gradient-bg text-white font-semibold py-3.5 px-4 rounded-2xl transition-all duration-200 shadow-sm active:scale-[0.98] active:opacity-90"
                  >
                      {t.loginButton}
                  </button>
              </form>

              {hasFirebaseConfig && (
                <>
                  <div className="flex items-center my-5">
                    <div className={`flex-grow h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
                    <span className={`px-3 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t.orSeparator}</span>
                    <div className={`flex-grow h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className={`w-full flex items-center justify-center py-3.5 px-4 rounded-2xl border font-semibold text-sm transition-all duration-200 active:scale-[0.98] ${
                      theme === 'dark'
                        ? 'bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-800'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    } ${googleLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <GoogleIcon />
                    {googleLoading ? '...' : t.loginWithGoogle}
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
