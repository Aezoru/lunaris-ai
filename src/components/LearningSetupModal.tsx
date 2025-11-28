import React, { useState } from 'react';
import { X, GraduationCap, Target, BarChart, BookOpen, Sparkles } from 'lucide-react';
import { LearningConfig, Language } from '../types';

interface LearningSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: LearningConfig) => void;
  language: Language;
}

const LearningSetupModal: React.FC<LearningSetupModalProps> = ({ isOpen, onClose, onStart, language }) => {
  const [config, setConfig] = useState<LearningConfig>({ topic: '', currentLevel: 'Beginner', goal: '', teachingStyle: 'Socratic' });

  if (!isOpen) return null;

  const t = {
    title: language === 'ar' ? 'بدء رحلة تعلم' : 'Start Learning Journey',
    desc: language === 'ar' ? 'ماذا تريد أن تتقن اليوم؟' : 'What do you want to master today?',
    topic: language === 'ar' ? 'الموضوع' : 'Topic',
    level: language === 'ar' ? 'المستوى' : 'Level',
    goal: language === 'ar' ? 'الهدف' : 'Goal',
    style: language === 'ar' ? 'الأسلوب' : 'Style',
    start: language === 'ar' ? 'بدء' : 'Start',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel'
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (config.topic && config.goal) { onStart(config); onClose(); } };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f1117] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><GraduationCap size={24} /></div><div><h2 className="text-xl font-bold">{t.title}</h2><p className="text-emerald-100 text-xs">{t.desc}</p></div></div>
            <button onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            <div className="space-y-2"><label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><BookOpen size={16} className="text-emerald-500" /> {t.topic}</label><input type="text" required value={config.topic} onChange={e => setConfig({...config, topic: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><BarChart size={16} className="text-emerald-500" /> {t.level}</label><div className="flex bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700">{(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (<button key={lvl} type="button" onClick={() => setConfig({...config, currentLevel: lvl})} className={`flex-1 py-2 rounded-lg text-xs font-bold ${config.currentLevel === lvl ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'}`}>{lvl}</button>))}</div></div>
                <div className="space-y-2"><label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Sparkles size={16} className="text-emerald-500" /> {t.style}</label><select value={config.teachingStyle} onChange={e => setConfig({...config, teachingStyle: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl"><option value="Socratic">Socratic</option><option value="Direct">Direct</option><option value="Practical">Practical</option></select></div>
            </div>
            <div className="space-y-2"><label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Target size={16} className="text-emerald-500" /> {t.goal}</label><textarea required rows={3} value={config.goal} onChange={e => setConfig({...config, goal: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl resize-none" /></div>
            <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">{t.cancel}</button><button type="submit" className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/30 flex items-center gap-2"><GraduationCap size={18} /> {t.start}</button></div>
        </form>
      </div>
    </div>
  );
};

export default LearningSetupModal;
