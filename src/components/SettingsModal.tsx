import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Save, Sparkles, User, MessageSquare, BookOpen, 
  Monitor, Globe, Shield, LogOut, Trash2, Zap, BrainCircuit,
  Layout, Moon, Sun, CheckCircle2, ChevronRight, AlertTriangle,
  Database, Download, Upload, HardDrive, Cpu, Flame, GraduationCap, Plus, Book, FileText, Clock,
  Cloud, RefreshCw, Lock, Mail, Camera, Loader2, LogIn, Lightbulb, Scale, FileCheck, Copyright
} from 'lucide-react';
import { Persona, ModelType, Theme, Language, KnowledgeItem, UserProfile } from '../types';
import { exportDatabase, importDatabase, saveKnowledge, getKnowledge, deleteKnowledge } from '../utils/db';
import { AuthService } from '../services/authService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPersona: Persona;
  onSavePersona: (persona: Persona) => void;
  theme: Theme;
  onToggleTheme: () => void;
  activeModel: ModelType;
  onSelectModel: (model: ModelType) => void;
  language: Language;
  onSetLanguage: (lang: Language) => void;
  onClearAllChats: () => void;
  onSetThemeMode: (mode: Theme) => void;
}

type Tab = 'general' | 'persona' | 'learning' | 'account' | 'legal' | 'about';
type AuthMode = 'login' | 'signup';
type AccountView = 'overview' | 'security' | 'sync';

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentPersona,
  onSavePersona,
  theme,
  onToggleTheme,
  activeModel,
  onSelectModel,
  language,
  onSetLanguage,
  onClearAllChats,
  onSetThemeMode
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [localPersona, setLocalPersona] = useState<Persona>(currentPersona);
  const [isClosing, setIsClosing] = useState(false);
  
  // Knowledge Base State
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  const [newKTitle, setNewKTitle] = useState('');
  const [newKContent, setNewKContent] = useState('');

  // --- AUTH STATE ---
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [accountView, setAccountView] = useState<AccountView>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Auth Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isRTL = language === 'ar';

  const t = {
    settings: language === 'ar' ? 'الإعدادات' : 'Settings',
    general: language === 'ar' ? 'عام' : 'General',
    persona: language === 'ar' ? 'الشخصية' : 'Persona',
    learning: language === 'ar' ? 'التعلم' : 'Learning',
    account: language === 'ar' ? 'الحساب والمزامنة' : 'Account & Sync',
    legal: language === 'ar' ? 'القانونية' : 'Legal',
    about: language === 'ar' ? 'حول' : 'About',
    save: language === 'ar' ? 'حفظ التغييرات' : 'Save Changes',
    appearance: language === 'ar' ? 'المظهر' : 'Appearance',
    language: language === 'ar' ? 'اللغة' : 'Language',
    aiModel: language === 'ar' ? 'نموذج الذكاء الاصطناعي' : 'AI Model',
    light: language === 'ar' ? 'نهاري' : 'Light',
    dark: language === 'ar' ? 'ليلي' : 'Dark',
    dynamic: language === 'ar' ? 'ديناميكي (تلقائي)' : 'Dynamic (Auto)',
    name: language === 'ar' ? 'الاسم' : 'Name',
    tone: language === 'ar' ? 'النبرة' : 'Tone',
    style: language === 'ar' ? 'الأسلوب' : 'Style',
    context: language === 'ar' ? 'الخلفية والتعليمات' : 'Context & Instructions',
    memory: language === 'ar' ? 'الذاكرة الدائمة' : 'Long-term Memory',
    memoryDesc: language === 'ar' ? 'معلومات يتذكرها الذكاء الاصطناعي في كل المحادثات.' : 'Info the AI remembers in every chat.',
    learnTitle: language === 'ar' ? 'قاعدة المعرفة المخصصة' : 'Custom Knowledge Base',
    learnDesc: language === 'ar' ? 'أضف لغات خيالية، روايات، أو مستندات تقنية.' : 'Add constructed languages, novels, or technical docs.',
    addKnowledge: language === 'ar' ? 'إضافة معرفة جديدة' : 'Add New Knowledge',
    kTitlePlaceholder: language === 'ar' ? 'العنوان' : 'Title',
    kContentPlaceholder: language === 'ar' ? 'المحتوى الكامل' : 'Full content',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    // AUTH TRANSLATIONS
    welcomeBack: language === 'ar' ? 'مرحبًا بعودتك' : 'Welcome Back',
    createAccount: language === 'ar' ? 'إنشاء حساب' : 'Create Account',
    login: language === 'ar' ? 'تسجيل الدخول' : 'Sign In',
    signup: language === 'ar' ? 'اشتراك' : 'Sign Up',
    email: language === 'ar' ? 'البريد الإلكتروني' : 'Email',
    password: language === 'ar' ? 'كلمة المرور' : 'Password',
    google: language === 'ar' ? 'متابعة باستخدام Google' : 'Continue with Google',
    haveAccount: language === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?',
    noAccount: language === 'ar' ? 'ليس لديك حساب؟' : 'Don\'t have an account?',
    syncTitle: language === 'ar' ? 'المزامنة السحابية' : 'Cloud Sync',
    syncDesc: language === 'ar' ? 'احفظ بياناتك سحابياً لمنع فقدانها.' : 'Backup your data to the cloud to prevent loss.',
    lastSync: language === 'ar' ? 'آخر مزامنة:' : 'Last Synced:',
    syncNow: language === 'ar' ? 'مزامنة الآن' : 'Sync Now',
    restore: language === 'ar' ? 'استعادة البيانات' : 'Restore Data',
    security: language === 'ar' ? 'الأمان' : 'Security',
    changePass: language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password',
    deleteAcc: language === 'ar' ? 'حذف الحساب' : 'Delete Account',
    wipeData: language === 'ar' ? 'حذف جميع البيانات' : 'Wipe All Data',
    overview: language === 'ar' ? 'نظرة عامة' : 'Overview',
    logout: language === 'ar' ? 'تسجيل الخروج' : 'Log Out',
    proBadge: language === 'ar' ? 'مشترك' : 'PRO',
    uploadPhoto: language === 'ar' ? 'تغيير الصورة' : 'Change Photo',
    lunaVDesc: language === 'ar' ? 'نموذج فلاش فائق السرعة للاستخدام اليومي.' : 'High-speed Flash model for daily tasks.',
    lunaXDesc: language === 'ar' ? 'نموذج مفتوح المصدر قوي عبر Groq.' : 'Powerful open-source model via Groq.',
    lunaDeepDesc: language === 'ar' ? 'النموذج الأقوى للاستنتاج المعقد والبرمجة.' : 'Most powerful model for complex reasoning & coding.',
    lunaODesc: language === 'ar' ? 'نموذج GPT-4o القوي (عبر Pollinations). ذكاء شامل.' : 'Powerful GPT-4o (via Pollinations). Omni intelligence.',
    lunarisMindDesc: language === 'ar' ? 'النظام الذكي: يختار تلقائياً النموذج الأنسب لكل سؤال مع نظام احتياطي للفشل.' : 'Smart System: Automatically routes to best model & handles failover.',
    version: language === 'ar' ? 'الإصدار' : 'Version',
    dev: language === 'ar' ? 'المطور' : 'Developer',
    rights: language === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.',
    
    // LEGAL
    privacyPolicy: language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy',
    termsOfService: language === 'ar' ? 'شروط الخدمة' : 'Terms of Service',
    copyright: language === 'ar' ? 'حقوق الطبع والنشر' : 'Copyright Notice',
    legalDisclaimer: language === 'ar' ? 'إخلاء مسؤولية' : 'Disclaimer',
    
    legalText: language === 'ar' ? {
        intro: 'مرحباً بك في Lunaris AI. نحن نلتزم بحماية خصوصيتك وبياناتك.',
        dataCollection: 'جمع البيانات: تطبيق Lunaris AI يعمل بمبدأ "المحلية أولاً". جميع محادثاتك، صورك، وإعداداتك تخزن محلياً على جهازك باستخدام تقنية IndexedDB. نحن لا نملك وصولاً لهذه البيانات.',
        cloudSync: 'المزامنة السحابية: إذا اخترت إنشاء حساب ومزامنة بياناتك، سيتم تخزين نسخة مشفرة من بياناتك على خوادم Supabase الآمنة. يمكنك حذف هذه البيانات في أي وقت.',
        aiProcessing: 'معالجة الذكاء الاصطناعي: تتم معالجة نصوص المحادثات بواسطة نماذج الطرف الثالث (Google Gemini, Groq, Pollinations). هذه الخدمات قد تحتفظ بسجلات مؤقتة لتحسين الخدمة ولكن لا تستخدم بياناتك لتدريب نماذجها العامة وفقاً لسياسات الخصوصية الخاصة بها.',
        copyright: 'جميع الحقوق محفوظة © 2024 للمطور عبد المعز (Eilas). الكود المصدري والتصميم هي ملكية فكرية للمطور.',
        usage: 'الاستخدام: يحق لك استخدام التطبيق للأغراض الشخصية والبحثية والتعليمية.',
        liability: 'المسؤولية: الذكاء الاصطناعي قد يرتكب أخطاء. المطور غير مسؤول عن دقة المعلومات المقدمة أو أي قرارات تتخذ بناءً عليها.'
    } : {
        intro: 'Welcome to Lunaris AI. We are committed to protecting your privacy and data.',
        dataCollection: 'Data Collection: Lunaris AI operates on a "Local-First" principle. All your chats, images, and settings are stored locally on your device using IndexedDB. We do not have access to this data.',
        cloudSync: 'Cloud Sync: If you choose to create an account and sync your data, an encrypted copy will be stored on secure Supabase servers. You can delete this data at any time.',
        aiProcessing: 'AI Processing: Chat texts are processed by third-party models (Google Gemini, Groq, Pollinations). These services may keep temporary logs for service improvement but generally do not use API data to train public models per their policies.',
        copyright: 'Copyright © 2024 Developer Abd el moez (Eilas). All rights reserved. The source code and design are intellectual property of the developer.',
        usage: 'Usage: You are granted the right to use this application for personal, research, and educational purposes.',
        liability: 'Liability: AI models can make mistakes (hallucinations). The developer is not responsible for the accuracy of information provided or decisions made based on it.'
    }
  };

  useEffect(() => {
    setLocalPersona(currentPersona);
    if (isOpen) {
        loadKnowledge();
        loadUser();
    }
  }, [currentPersona, isOpen]);

  const loadUser = () => {
      const u = AuthService.getCurrentUser();
      setUser(u);
      if(u) {
          setName(u.name);
          setEmail(u.email);
      }
  }

  const loadKnowledge = async () => {
      const data = await getKnowledge();
      setKnowledgeItems(data);
  }

  const handleClose = () => {
      setIsClosing(true);
      setTimeout(() => {
          setIsClosing(false);
          setActiveTab('general');
          onClose();
      }, 200);
  }

  const handleSavePersona = () => {
    onSavePersona(localPersona);
  };

  const handlePersonaChange = (field: keyof Persona, value: string) => {
    setLocalPersona(prev => ({ ...prev, [field]: value }));
  };

  // --- KNOWLEDGE BASE HANDLERS ---
  const handleAddKnowledge = async () => {
      if (!newKTitle || !newKContent) return;
      const item: KnowledgeItem = {
          id: Date.now().toString(),
          title: newKTitle,
          content: newKContent,
          updatedAt: Date.now()
      };
      await saveKnowledge(item);
      setNewKTitle('');
      setNewKContent('');
      setShowAddKnowledge(false);
      await loadKnowledge();
  }

  const handleDeleteKnowledge = async (id: string) => {
      if (confirm(language === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?')) {
          await deleteKnowledge(id);
          await loadKnowledge();
      }
  }

  // --- AUTH HANDLERS ---
  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true); setError('');
      try {
          await AuthService.login(email, password);
          loadUser();
      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsLoading(false);
      }
  }

  const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true); setError('');
      try {
          await AuthService.signup(name, email, password);
          loadUser();
      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsLoading(false);
      }
  }

  const handleLogout = async () => {
      await AuthService.logout();
      setUser(null);
      setAuthMode('login');
  }

  const handleUpdateProfile = async () => {
      setIsLoading(true);
      try {
          await AuthService.updateProfile({ name, email });
          loadUser();
          alert('Profile Updated');
      } catch (e: any) {
          alert(e.message);
      } finally {
          setIsLoading(false);
      }
  }

  const handleChangePassword = async () => {
      setIsLoading(true);
      try {
          await AuthService.changePassword('dummy', newPassword);
          setNewPassword('');
          alert('Password Changed');
      } catch(e: any) {
          alert(e.message);
      } finally {
          setIsLoading(false);
      }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = async (ev) => {
              await AuthService.updateProfile({ avatarUrl: ev.target?.result as string });
              loadUser();
          };
          reader.readAsDataURL(file);
      }
  }

  const handleDeleteAccount = async () => {
      if(confirm('Are you sure you want to delete your account? This cannot be undone.')) {
          await AuthService.deleteAccount();
          setUser(null);
      }
  }

  const handleSyncNow = async () => {
      setIsLoading(true);
      try {
          await AuthService.syncData();
          loadUser(); // update last sync time
          alert('Sync Complete!');
      } catch(e) {
          alert('Sync Failed');
      } finally {
          setIsLoading(false);
      }
  }

  const handleRestore = async () => {
      if(confirm('This will overwrite current data. Continue?')) {
          setIsLoading(true);
          try {
              const success = await AuthService.restoreData();
              if(success) {
                  alert('Data Restored. Reloading...');
                  window.location.reload();
              }
          } catch(e) {
              alert('Restore Failed');
          } finally {
              setIsLoading(false);
          }
      }
  }

  if (!isOpen && !isClosing) return null;

  const NavItem = ({ id, icon: Icon, label }: { id: Tab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium
        ${activeTab === id 
          ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 shadow-sm' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}
      `}
    >
      <Icon size={18} strokeWidth={activeTab === id ? 2.5 : 2} />
      <span>{label}</span>
      {activeTab === id && (
         <div className={`w-1.5 h-1.5 rounded-full bg-brand-500 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
      )}
    </button>
  );

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div 
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      <div className={`
        relative w-full max-w-4xl h-[85vh] md:h-[750px] bg-white dark:bg-[#0f1117] rounded-3xl shadow-2xl flex overflow-hidden
        border border-slate-100 dark:border-slate-800
        transition-all duration-300 transform
        ${isClosing ? 'scale-95 translate-y-8' : 'scale-100 translate-y-0'}
      `}>
        
        {/* Sidebar Navigation */}
        <div className="w-20 md:w-64 bg-slate-50/80 dark:bg-[#151a25] border-e border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
            <div className="p-6 pb-8">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                        <span className="text-white font-bold text-lg">L</span>
                    </div>
                    <span className="hidden md:block font-bold text-xl tracking-tight text-slate-800 dark:text-slate-100">
                        Lunaris
                    </span>
                </div>
            </div>

            <nav className="flex-1 px-3 space-y-1">
                <NavItem id="general" icon={Layout} label={t.general} />
                <NavItem id="persona" icon={Sparkles} label={t.persona} />
                <NavItem id="learning" icon={GraduationCap} label={t.learning} />
                <NavItem id="account" icon={user ? Shield : LogIn} label={t.account} />
                <NavItem id="legal" icon={Scale} label={t.legal} />
                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/50">
                     <NavItem id="about" icon={BrainCircuit} label={t.about} />
                </div>
            </nav>

            <div className="p-4">
                 <button onClick={handleClose} className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors px-4">
                     <LogOut size={14} className={isRTL ? 'rotate-180' : ''}/> 
                     <span>Exit Settings</span>
                 </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0f1117]">
            {/* Header */}
            <div className="h-16 px-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                    {activeTab === 'general' && t.general}
                    {activeTab === 'persona' && t.persona}
                    {activeTab === 'learning' && t.learning}
                    {activeTab === 'account' && t.account}
                    {activeTab === 'legal' && t.legal}
                    {activeTab === 'about' && t.about}
                </h2>
                <button 
                    onClick={handleClose}
                    className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-2xl mx-auto space-y-10">

                    {/* --- GENERAL TAB --- */}
                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-fade-in">
                            
                            {/* Theme */}
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                    <Monitor size={16} /> {t.appearance}
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {/* Buttons for Light, Dark, Dynamic */}
                                    {[
                                        { mode: Theme.LIGHT, icon: Sun, label: t.light },
                                        { mode: Theme.DARK, icon: Moon, label: t.dark },
                                        { mode: Theme.DYNAMIC, icon: Clock, label: t.dynamic }
                                    ].map(item => (
                                        <button 
                                            key={item.mode}
                                            onClick={() => onSetThemeMode(item.mode)}
                                            className={`group relative p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-3
                                                ${theme === item.mode 
                                                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10' 
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700'}
                                            `}
                                        >
                                            <div className={`w-full h-12 rounded-lg relative overflow-hidden shadow-inner flex items-center justify-center ${item.mode === Theme.LIGHT ? 'bg-slate-100' : item.mode === Theme.DARK ? 'bg-slate-900' : 'bg-gradient-to-r from-sky-200 to-indigo-900'}`}>
                                                <item.icon size={16} className={item.mode === Theme.LIGHT ? 'text-slate-500' : 'text-white'} />
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate w-full justify-center">
                                                <span className="truncate">{item.label}</span>
                                            </div>
                                            {theme === item.mode && <div className="absolute top-2 right-2 text-brand-500"><CheckCircle2 size={16} fill="currentColor" className="text-white" /></div>}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Language */}
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                    <Globe size={16} /> {t.language}
                                </h3>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                                    <button 
                                        onClick={() => onSetLanguage('en')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm
                                            ${language === 'en' 
                                                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' 
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}
                                        `}
                                    >
                                        English
                                    </button>
                                    <button 
                                        onClick={() => onSetLanguage('ar')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm
                                            ${language === 'ar' 
                                                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' 
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}
                                        `}
                                    >
                                        العربية
                                    </button>
                                </div>
                            </section>

                            {/* Model Selection */}
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                    <Cpu size={16} /> {t.aiModel}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* LUNARIS MIND (NEW) */}
                                    <button 
                                        onClick={() => onSelectModel('Lunaris-Mind')}
                                        className={`relative p-4 rounded-xl border text-start transition-all md:col-span-2 overflow-hidden group
                                            ${activeModel === 'Lunaris-Mind'
                                                ? 'bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-pink-50/80 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border-indigo-400 ring-1 ring-indigo-400 shadow-md'
                                                : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'}
                                        `}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity"></div>
                                        <div className="flex items-center justify-between mb-2 relative">
                                            <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                <BrainCircuit size={18} className="text-indigo-500" /> 
                                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Lunaris Mind</span>
                                            </span>
                                            {activeModel === 'Lunaris-Mind' && <CheckCircle2 size={18} className="text-indigo-500" />}
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed relative">
                                            {t.lunarisMindDesc}
                                        </p>
                                    </button>

                                    <button 
                                        onClick={() => onSelectModel('Luna-V')}
                                        className={`relative p-4 rounded-xl border text-start transition-all
                                            ${activeModel === 'Luna-V'
                                                ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-500 ring-1 ring-blue-500'
                                                : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'}
                                        `}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                <Zap size={16} className="text-blue-500" /> Luna-V
                                            </span>
                                            {activeModel === 'Luna-V' && <CheckCircle2 size={18} className="text-blue-500" />}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {t.lunaVDesc}
                                        </p>
                                    </button>

                                    <button 
                                        onClick={() => onSelectModel('Luna-X')}
                                        className={`relative p-4 rounded-xl border text-start transition-all
                                            ${activeModel === 'Luna-X'
                                                ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-500 ring-1 ring-orange-500'
                                                : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700'}
                                        `}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                <HardDrive size={16} className="text-orange-500" /> Luna-X
                                            </span>
                                            {activeModel === 'Luna-X' && <CheckCircle2 size={18} className="text-orange-500" />}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {t.lunaXDesc}
                                        </p>
                                    </button>

                                    <button 
                                        onClick={() => onSelectModel('Luna-O')}
                                        className={`relative p-4 rounded-xl border text-start transition-all
                                            ${activeModel === 'Luna-O'
                                                ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-500 ring-1 ring-rose-500'
                                                : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700'}
                                        `}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                <Lightbulb size={16} className="text-rose-500" /> Luna-O
                                            </span>
                                            {activeModel === 'Luna-O' && <CheckCircle2 size={18} className="text-rose-500" />}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {t.lunaODesc}
                                        </p>
                                    </button>

                                    <button 
                                        onClick={() => onSelectModel('Luna-Deep')}
                                        className={`relative p-4 rounded-xl border text-start transition-all
                                            ${activeModel === 'Luna-Deep'
                                                ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-500 ring-1 ring-purple-500'
                                                : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'}
                                        `}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                <Flame size={16} className="text-purple-500" /> Luna-Deep <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Pro</span>
                                            </span>
                                            {activeModel === 'Luna-Deep' && <CheckCircle2 size={18} className="text-purple-500" />}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {t.lunaDeepDesc}
                                        </p>
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}
                    
                    {/* --- PERSONA TAB --- */}
                    {activeTab === 'persona' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.name}</label>
                                    <div className="relative">
                                        <User size={18} className="absolute left-3 top-3 text-slate-400" />
                                        <input 
                                            type="text" 
                                            value={localPersona.name}
                                            onChange={(e) => handlePersonaChange('name', e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm font-medium"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.tone}</label>
                                    <div className="relative">
                                        <MessageSquare size={18} className="absolute left-3 top-3 text-slate-400" />
                                        <input 
                                            type="text" 
                                            value={localPersona.tone}
                                            onChange={(e) => handlePersonaChange('tone', e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm font-medium"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.style}</label>
                                <input 
                                    type="text" 
                                    value={localPersona.style}
                                    onChange={(e) => handlePersonaChange('style', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.context}</label>
                                <textarea 
                                    value={localPersona.context}
                                    onChange={(e) => handlePersonaChange('context', e.target.value)}
                                    rows={4}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm font-medium resize-none"
                                />
                            </div>

                            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <label className="flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-400">
                                    <BrainCircuit size={16} /> {t.memory}
                                </label>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t.memoryDesc}</p>
                                <textarea 
                                    value={localPersona.memory}
                                    onChange={(e) => handlePersonaChange('memory', e.target.value)}
                                    rows={3}
                                    className="w-full p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm font-medium resize-none"
                                />
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button 
                                    onClick={handleSavePersona}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-brand-500/30 active:scale-95"
                                >
                                    <Save size={18} />
                                    {t.save}
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* --- LEARNING TAB --- */}
                    {activeTab === 'learning' && (
                         <div className="space-y-6 animate-fade-in">
                             <div className="p-4 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-2xl mb-6">
                                 <h3 className="flex items-center gap-2 font-bold text-teal-800 dark:text-teal-200 mb-2">
                                     <GraduationCap size={20} /> {t.learnTitle}
                                 </h3>
                                 <p className="text-sm text-teal-700 dark:text-teal-400">{t.learnDesc}</p>
                             </div>

                             {showAddKnowledge ? (
                                 <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4 animate-slide-up">
                                     <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Plus size={18} /> {t.addKnowledge}</h4>
                                     <input 
                                        type="text" 
                                        value={newKTitle}
                                        onChange={e => setNewKTitle(e.target.value)}
                                        placeholder={t.kTitlePlaceholder}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-brand-500/50 outline-none"
                                     />
                                     <textarea 
                                        rows={8}
                                        value={newKContent}
                                        onChange={e => setNewKContent(e.target.value)}
                                        placeholder={t.kContentPlaceholder}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm resize-none focus:ring-2 focus:ring-brand-500/50 outline-none"
                                     />
                                     <div className="flex justify-end gap-3 pt-2">
                                         <button onClick={() => setShowAddKnowledge(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">{t.cancel}</button>
                                         <button onClick={handleAddKnowledge} disabled={!newKTitle || !newKContent} className="px-6 py-2 bg-brand-600 text-white rounded-lg font-bold disabled:opacity-50">{t.save}</button>
                                     </div>
                                 </div>
                             ) : (
                                 <button onClick={() => setShowAddKnowledge(true)} className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 hover:border-brand-500 hover:text-brand-500 transition-colors flex flex-col items-center justify-center gap-2">
                                     <Plus size={24} />
                                     <span className="font-medium">{t.addKnowledge}</span>
                                 </button>
                             )}

                             <div className="space-y-3">
                                 {knowledgeItems.length > 0 && <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">My Knowledge Base</h4>}
                                 {knowledgeItems.map(item => (
                                     <div key={item.id} className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 transition-all hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700">
                                         <div className="flex items-center justify-between mb-2">
                                             <div className="flex items-center gap-2">
                                                 <Book size={18} className="text-brand-500" />
                                                 <span className="font-bold text-slate-800 dark:text-slate-200">{item.title}</span>
                                             </div>
                                             <button onClick={() => handleDeleteKnowledge(item.id)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100">
                                                 <Trash2 size={16} />
                                             </button>
                                         </div>
                                         <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 font-mono bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                             {item.content}
                                         </p>
                                         <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                                             <FileText size={10} /> {item.content.length} chars
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                    )}
                    
                    {/* --- ACCOUNT TAB --- */}
                    {activeTab === 'account' && (
                        <div className="animate-fade-in h-full flex flex-col">
                            {!user ? (
                                <div className="flex-1 flex flex-col items-center justify-center space-y-6 max-w-sm mx-auto w-full">
                                    <div className="text-center space-y-2">
                                        <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <LogIn size={32} />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{authMode === 'login' ? t.welcomeBack : t.createAccount}</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">Synchronize your chats and settings across devices.</p>
                                    </div>

                                    <form className="w-full space-y-4" onSubmit={authMode === 'login' ? handleLogin : handleSignup}>
                                        {authMode === 'signup' && (
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.name}</label>
                                                <div className="relative">
                                                    <User size={18} className="absolute left-3 top-3 text-slate-400" />
                                                    <input 
                                                        type="text" required
                                                        value={name} onChange={e => setName(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500/50 outline-none"
                                                        placeholder="John Doe"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.email}</label>
                                            <div className="relative">
                                                <Mail size={18} className="absolute left-3 top-3 text-slate-400" />
                                                <input 
                                                    type="email" required
                                                    value={email} onChange={e => setEmail(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500/50 outline-none"
                                                    placeholder="you@example.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t.password}</label>
                                            <div className="relative">
                                                <Lock size={18} className="absolute left-3 top-3 text-slate-400" />
                                                <input 
                                                    type="password" required minLength={6}
                                                    value={password} onChange={e => setPassword(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500/50 outline-none"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>
                                        
                                        {error && <p className="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-900/10 p-2 rounded-lg text-center">{error}</p>}

                                        <button 
                                            type="submit" 
                                            disabled={isLoading}
                                            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            {isLoading && <Loader2 size={18} className="animate-spin" />}
                                            {authMode === 'login' ? t.login : t.signup}
                                        </button>
                                    </form>

                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {authMode === 'login' ? t.noAccount : t.haveAccount} {' '}
                                        <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); }} className="text-brand-600 dark:text-brand-400 font-bold hover:underline">
                                            {authMode ===
