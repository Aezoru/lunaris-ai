import React from 'react';
import { X, Palette, Check, Droplets } from 'lucide-react';
import { ColorTheme, Language } from '../types';

interface ThemeLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeThemeId: string;
  onSelectTheme: (theme: ColorTheme) => void;
  language: Language;
}

export const THEMES: ColorTheme[] = [
  { id: 'ocean', name: 'Ocean Depth', colors: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' } },
  { id: 'rabbit', name: 'Rabbit Festival', colors: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' } },
  { id: 'night', name: 'Night Silence', colors: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' } },
  { id: 'morning', name: 'Active Morning', colors: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407' } },
  { id: 'nature', name: 'Forest Whisper', colors: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' } },
  { id: 'royal', name: 'Royal Gold', colors: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12', 950: '#422006' } }
];

const ThemeLibraryModal: React.FC<ThemeLibraryModalProps> = ({ isOpen, onClose, activeThemeId, onSelectTheme, language }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f1117] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
             <div className="flex items-center gap-3"><Palette size={24} /><h2 className="text-xl font-bold">{language === 'ar' ? 'مكتبة الثيمات' : 'Theme Library'}</h2></div>
             <button onClick={onClose}><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {THEMES.map((theme) => {
                      const isActive = activeThemeId === theme.id;
                      return (
                          <button key={theme.id} onClick={() => onSelectTheme(theme)} className={`relative p-4 rounded-2xl border-2 transition-all duration-300 flex items-center gap-4 text-start ${isActive ? 'border-slate-800 dark:border-white bg-slate-50 dark:bg-slate-800/50' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-[#151a25]'}`}>
                              <div className="flex flex-col gap-1 shrink-0">
                                  <div className="flex gap-1"><div className="w-8 h-8 rounded-full" style={{ backgroundColor: theme.colors[500] }}></div><div className="w-8 h-8 rounded-full" style={{ backgroundColor: theme.colors[400] }}></div></div>
                              </div>
                              <div className="flex-1"><h3 className="font-bold">{theme.name}</h3><p className="text-xs text-slate-400">Lunaris Theme</p></div>
                              {isActive && <div className="absolute top-4 right-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full p-1"><Check size={14} /></div>}
                          </button>
                      );
                  })}
              </div>
          </div>
      </div>
    </div>
  );
};

export default ThemeLibraryModal;
