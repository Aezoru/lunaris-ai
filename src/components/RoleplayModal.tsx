import React, { useState } from 'react';
import { X, Theater, User, Map, ScrollText, Sparkles } from 'lucide-react';
import { RoleplayConfig, Language } from '../types';

interface RoleplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: RoleplayConfig) => void;
  language: Language;
}

const RoleplayModal: React.FC<RoleplayModalProps> = ({ isOpen, onClose, onStart, language }) => {
  const [config, setConfig] = useState<RoleplayConfig>({ characterName: '', characterDescription: '', scenario: '', worldContext: '' });

  if (!isOpen) return null;

  const t = {
    title: language === 'ar' ? 'إنشاء قصة جديدة' : 'New Roleplay Story',
    desc: language === 'ar' ? 'حدد الشخصية والسيناريو لتبدأ مغامرة فريدة.' : 'Define the character and scenario.',
    charName: language === 'ar' ? 'اسم الشخصية' : 'Character Name',
    charDesc: language === 'ar' ? 'وصف الشخصية' : 'Character Description',
    scenario: language === 'ar' ? 'السيناريو' : 'Scenario',
    world: language === 'ar' ? 'سياق العالم' : 'World Context',
    start: language === 'ar' ? 'بدء المغامرة' : 'Start Adventure',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel'
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (config.characterName && config.characterDescription) { onStart(config); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f1117] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Theater size={24} /></div><div><h2 className="text-xl font-bold">{t.title}</h2><p className="text-purple-100 text-xs">{t.desc}</p></div></div>
            <button onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[70vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><User size={16} className="text-purple-500" /> {t.charName}</label><input type="text" required value={config.characterName} onChange={e => setConfig({...config, characterName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl" /></div>
                <div className="space-y-2"><label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Map size={16} className="text-purple-500" /> {t.world}</label><input type="text" value={config.worldContext} onChange={e => setConfig({...config, worldContext: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl" /></div>
            </div>
            <div className="space-y-2"><label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><ScrollText size={16} className="text-purple-500" /> {t.charDesc}</label><textarea required rows={3} value={config.characterDescription} onChange={e => setConfig({...config, characterDescription: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl resize-none" /></div>
            <div className="space-y-2"><label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Sparkles size={16} className="text-purple-500" /> {t.scenario}</label><textarea required rows={4} value={config.scenario} onChange={e => setConfig({...config, scenario: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl resize-none" /></div>
            <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">{t.cancel}</button><button type="submit" className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/30 flex items-center gap-2"><Theater size={18} /> {t.start}</button></div>
        </form>
      </div>
    </div>
  );
};

export default RoleplayModal;
