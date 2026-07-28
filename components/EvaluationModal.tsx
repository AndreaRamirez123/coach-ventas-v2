
import React from 'react';
import { EvaluationResult, Theme } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface EvaluationModalProps {
  result: EvaluationResult;
  onClose: () => void;
  theme: Theme;
}

export default function EvaluationModal({ result, onClose, theme }: EvaluationModalProps): React.ReactElement {
  const { t } = useLanguage();
  const bgClass = theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200';
  const textClass = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const subTextClass = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const cardBgClass = theme === 'dark' ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
      <div className={`border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in duration-300 ${bgClass}`}>
        
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="text-xs px-3 py-1 rounded-lg border">{t.closeModal}</button>
        </div>

        <div className="text-center mb-4 sm:mb-6">
            <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${textClass}`}>{t.sessionResults}</h2>
            <div className={`inline-block px-4 py-1 rounded-full text-sm font-bold ${
                result.closingStatus === 'Cerrada' ? 'bg-green-600/20 text-green-600' : 'bg-red-600/20 text-red-600'
            }`}>
                {result.closingStatus === 'Cerrada' ? t.saleClosed : t.saleNotClosed}
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className={`flex-1 p-4 rounded-xl text-center border ${cardBgClass}`}>
                <span className={`block text-sm mb-1 ${subTextClass}`}>{t.globalScore}</span>
                <span className={`text-5xl font-black ${result.score >= 80 ? 'text-green-500' : result.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {result.score}
                </span>
                <span className={`text-sm ${subTextClass}`}>/100</span>
            </div>

            <div className={`flex-[2] p-4 rounded-xl border ${cardBgClass}`}>
                <h3 className="text-sm font-bold text-cyan-500 mb-2">{t.coachFeedback}</h3>
                <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{result.feedback}</p>
            </div>
        </div>

        {result.metrics && (
          <div className={`mb-4 p-4 rounded-lg border ${cardBgClass}`}>
            <h4 className="text-sm font-bold text-cyan-500 mb-3">{t.callMetrics}</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <div><strong>{t.metricOpening}:</strong> {result.metrics.apertura}</div>
              <div><strong>{t.metricDiscovery}:</strong> {result.metrics.descubrimiento}</div>
              <div><strong>{t.metricObjections}:</strong> {result.metrics.manejoObjeciones}</div>
              <div><strong>{t.metricClarity}:</strong> {result.metrics.claridad}</div>
              <div><strong>{t.metricClosing}:</strong> {result.metrics.cierre}</div>
            </div>
          </div>
        )}
        

        <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-green-900/20 border-green-900/50' : 'bg-green-50 border-green-100'}`}>
                <h4 className="text-green-500 font-bold text-sm mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {t.strengths}
                </h4>
                <ul className={`list-disc list-inside text-xs space-y-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
            </div>
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-red-900/20 border-red-900/50' : 'bg-red-50 border-red-100'}`}>
                <h4 className="text-red-500 font-bold text-sm mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {t.improve}
                </h4>
                <ul className={`list-disc list-inside text-xs space-y-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {result.improvements.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
            </div>
        </div>

        <button 
            onClick={onClose}
            className={`w-full font-semibold py-3 rounded-2xl transition-all duration-200 active:scale-[0.98] ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
        >
            {t.closeAndContinue}
        </button>
      </div>
    </div>
  );
}
