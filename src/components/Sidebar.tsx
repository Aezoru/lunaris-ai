import React from 'react';
import { Plus, MessageSquare, Settings, X, Moon, Sun, Trash2, LogOut, Bookmark, Theater, Headphones, Palette, GraduationCap } from 'lucide-react';
import { ChatSession, Theme, Language } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onNewRoleplay: () => void;
  onNewLearning: () => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenThemeLib: () => void; 
  language: Language;
  onStartLiveMode: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onNewRoleplay,
  onNewLearning,
  onDeleteSession,
  onToggleSave,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenThemeLib,
  language,
  onStartLiveMode
}) => {
  const isRTL = language === 'ar';

  const t = {
    newChat: isRTL ? 'محادثة جديدة' : 'New Chat',
    newRoleplay: isRTL ? 'بدء قصة' : 'Start Story',
    newLearning: isRTL ? 'بدء تعلم' : 'Start Learning',
    liveMode: isRTL ? 'المحادثة الحية' : 'Lunaris Live',
    recent: isRTL ? 'المحادثات الأخيرة' : 'Recent Conversations',
    saved: isRTL ? 'المحفوظة' : 'Saved',
    noChats: isRTL ? 'لا توجد محادثات بعد.' : 'No conversations yet.',
    light: isRTL ? 'الوضع النهاري' : 'Light Mode',
    dark: isRTL ? 'الوضع الليلي' : 'Dark Mode',
    dynamic: isRTL ? 'ديناميكي' : 'Dynamic',
    prefs: isRTL ? 'الإعدادات' : 'Preferences',
    themes: isRTL ? 'المظاهر' : 'Themes'
  };

  const closedTransform = isRTL ? 'translate-x-full' : '-translate-x-full';
  const transformClass = isOpen ? 'translate-x-0' : closedTransform;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <div className={`
        fixed inset-y-0 start-0 z-50 h-full w-[300px] 
        bg-slate-50/90 dark:bg-[#0B0F19]/95 backdrop-blur-xl
        border-e border-slate-200 dark:border-slate-800
        flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
        ${transformClass}
        md:relative md:translate-x-0
        ${isOpen ? 'md:w-[300px]' : 'md:w-0 md:border-e-0 md:overflow-hidden'}
        shadow-2xl md:shadow-none
      `}>
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
                <span className="text-white font-bold text-lg">L</span>
             </div>
             <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-slate-100">Lunaris AI</span>
          </div>
          <button onClick={onClose} className="md:hidden p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 mb-6 space-y-2">
            <div className="grid grid-cols-3 gap-2">
                <button 
                    onClick={() => { onNewChat(); if (window.innerWidth < 768) onClose(); }}
                    className="flex flex-col items-center justify-center gap-1.5 px-2 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5"
                    title={t.newChat}
                >
                    <Plus size={18} strokeWidth={2.5} />
                </button>

                <button 
                    onClick={() => { onNewRoleplay(); if (window.innerWidth < 768) onClose(); }}
                    className="flex flex-col items-center justify-center gap-1.5 px-2 py-3 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-xl transition-all shadow-md hover:shadow-purple-500/30 hover:-translate-y-0.5"
                    title={t.newRoleplay}
                >
                    <Theater size={18} strokeWidth={2.5} />
                </button>
                
                <button 
                    onClick={() => { onNewLearning(); if (window.innerWidth < 768) onClose(); }}
                    className="flex flex-col items-center justify-center gap-1.5 px-2 py-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl transition-all shadow-md hover:shadow-emerald-500/30 hover:-translate-y-0.5"
                    title={t.newLearning}
                >
                    <GraduationCap size={18} strokeWidth={2.5} />
                </button>
            </div>

            <button 
                onClick={() => { onStartLiveMode(); if (window.innerWidth < 768) onClose(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 dark:bg-slate-800/50 border border-slate-700 hover:border-brand-500 text-slate-200 rounded-xl transition-all shadow-sm group"
            >
                <Headphones size={18} className="group-hover:text-brand-400 transition-colors" />
                <span className="font-bold text-xs uppercase tracking-wide">{t.liveMode}</span>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex justify-between items-center">
            <span>{t.recent}</span>
          </div>
          
          {sessions.length === 0 && (
            <div className="px-4 py-10 text-center">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-3 opacity-50" />
              <p className="text-sm text-slate-400 dark:text-slate-600">{t.noChats}</p>
            </div>
          )}

          {sessions.map((session) => (
            <div 
              key={session.id}
              onClick={() => { onSelectSession(session.id); if (window.innerWidth < 768) onClose(); }}
              className={`
                group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 border border-transparent
                ${currentSessionId === session.id 
                  ? 'bg-white dark:bg-slate-800/80 shadow-sm border-slate-100 dark:border-slate-700/50 text-brand-600 dark:text-brand-400' 
                  : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}
              `}
            >
              <div className="relative shrink-0">
                  {session.isRoleplay ? (
                      <Theater size={16} className={`transition-colors ${currentSessionId === session.id ? 'text-purple-500' : 'text-purple-400/70 group-hover:text-purple-500'}`} />
                  ) : session.isLearning ? (
                      <GraduationCap size={16} className={`transition-colors ${currentSessionId === session.id ? 'text-emerald-500' : 'text-emerald-400/70 group-hover:text-emerald-500'}`} />
                  ) : (
                      <MessageSquare size={16} className={`transition-colors ${currentSessionId === session.id ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'}`} />
                  )}
                  {session.isSaved && <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-500 rounded-full border border-white dark:border-slate-900"></div>}
              </div>
              
              <span className={`truncate text-sm font-medium flex-1 text-start ${session.isRoleplay ? 'text-purple-700 dark:text-purple-300' : session.isLearning ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>{session.title}</span>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => onToggleSave(e, session.id)} className={`p-1.5 rounded-md transition-colors ${session.isSaved ? 'text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20' : 'text-slate-400 hover:text-brand-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                      <Bookmark size={13} fill={session.isSaved ? 'currentColor' : 'none'} />
                  </button>
                  <button onClick={(e) => onDeleteSession(e, session.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
                    <Trash2 size={13} />
                  </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0B0F19]/50">
          <div className="grid grid-cols-4 gap-2">
            <button 
                onClick={onToggleTheme}
                className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                title={theme === Theme.DYNAMIC ? t.dynamic : theme === Theme.LIGHT ? t.light : t.dark}
            >
                {theme === Theme.LIGHT ? <Sun size={16} /> : theme === Theme.DARK ? <Moon size={16} /> : <div className="relative"><Sun size={14} className="absolute -top-1 -left-1"/><Moon size={14} className="absolute top-1 left-1"/></div>}
                <span className="truncate">{theme === Theme.DYNAMIC ? t.dynamic : theme === Theme.LIGHT ? t.light : t.dark}</span>
            </button>

            <button onClick={onOpenThemeLib} className="col-span-1 flex items-center justify-center p-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700" title={t.themes}>
                <Palette size={16} />
            </button>
            
            <button onClick={onOpenSettings} className="col-span-1 flex items-center justify-center p-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700" title={t.prefs}>
                <Settings size={16} />
            </button>
          </div>
          
          <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800/60">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-100 to-indigo-100 dark:from-brand-900/50 dark:to-indigo-900/50 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold text-xs shadow-sm">IL</div>
                <div className="flex flex-col text-start">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">Ilas</span>
                <span className="text-[10px] font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-1.5 py-0.5 rounded-md w-fit">PRO</span>
                </div>
            </div>
            <button className={`text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ${isRTL ? 'rotate-180' : ''}`}><LogOut size={16} /></button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
