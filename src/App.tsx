import React, { useState, useEffect, useRef } from 'react';
import { Menu, ArrowUp, Sparkles, User, Zap, Paperclip, Mic, X, ChevronDown, ChevronRight, BrainCircuit, StopCircle, Globe, Image as ImageIcon, Video as VideoIcon, Loader2, RefreshCw, Plus, LayoutGrid, FileText, Bookmark, FileCode, File, Volume2, StopCircle as StopAudio, Theater, Download, Wand2, Pencil, Lightbulb, MicOff, Layout, Maximize, Book, Smile, Frown, AlertCircle, HelpCircle, Flame, Command, Trash2, Microscope, PhoneOff, GraduationCap, HardDrive } from 'lucide-react';
import { Message, ChatSession, Theme, ModelType, Persona, Language, Attachment, GroundingMetadata, RoleplayConfig, LearningConfig, Emotion, KnowledgeItem, ColorTheme } from './types';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import RoleplayModal from './components/RoleplayModal';
import LearningSetupModal from './components/LearningSetupModal';
import PromptLibraryModal from './components/PromptLibraryModal';
import ThemeLibraryModal, { THEMES } from './components/ThemeLibraryModal';
import MarkdownRenderer from './components/MarkdownRenderer';
import { streamChatResponse, generateTitle, generateImage, generateVideo, enhancePrompt, generateSuggestions, analyzeSentiment } from './services/geminiService';
import { initDB, getChatSessions, saveChatSession, deleteChatSession, clearAllChats, getKnowledge } from './utils/db';
import { AuthService } from './services/authService';

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const DEFAULT_PERSONA: Persona = {
  name: 'Lunaris',
  tone: 'Professional & Helpful',
  style: 'Clear, concise, and informative',
  context: 'You are an advanced AI assistant.',
  memory: ''
};

// Helper to convert hex to space-separated RGB for Tailwind opacity support
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` 
        : '59 130 246'; // fallback blue
}

// --- EMOTION CONFIG ---
const EMOTION_THEMES: Record<Emotion, { color: string, icon: any, border: string, bg: string, ring: string, glow: string }> = {
    neutral: { 
        color: 'text-brand-500', 
        icon: Zap, 
        border: 'border-slate-200 dark:border-slate-800', 
        bg: 'from-slate-100/50 to-white dark:from-[#0f1117] dark:to-[#0f1117]',
        ring: 'focus-within:ring-brand-500/20',
        glow: 'shadow-brand-500/5'
    },
    happy: { 
        color: 'text-yellow-500', 
        icon: Smile, 
        border: 'border-yellow-200 dark:border-yellow-900', 
        bg: 'from-yellow-50/30 to-white dark:from-yellow-900/10 dark:to-[#0f1117]',
        ring: 'focus-within:ring-yellow-500/30',
        glow: 'shadow-yellow-500/20'
    },
    sad: { 
        color: 'text-blue-400', 
        icon: Frown, 
        border: 'border-blue-200 dark:border-blue-900', 
        bg: 'from-blue-50/30 to-white dark:from-blue-900/10 dark:to-[#0f1117]',
        ring: 'focus-within:ring-blue-500/30',
        glow: 'shadow-blue-500/20'
    },
    angry: { 
        color: 'text-red-500', 
        icon: Flame, 
        border: 'border-red-200 dark:border-red-900', 
        bg: 'from-red-50/30 to-white dark:from-red-900/10 dark:to-[#0f1117]',
        ring: 'focus-within:ring-red-500/30',
        glow: 'shadow-red-500/20'
    },
    curious: { 
        color: 'text-purple-500', 
        icon: HelpCircle, 
        border: 'border-purple-200 dark:border-purple-900', 
        bg: 'from-purple-50/30 to-white dark:from-purple-900/10 dark:to-[#0f1117]',
        ring: 'focus-within:ring-purple-500/30',
        glow: 'shadow-purple-500/20'
    },
    anxious: { 
        color: 'text-orange-500', 
        icon: AlertCircle, 
        border: 'border-orange-200 dark:border-orange-900', 
        bg: 'from-orange-50/30 to-white dark:from-orange-900/10 dark:to-[#0f1117]',
        ring: 'focus-within:ring-orange-500/30',
        glow: 'shadow-orange-500/20'
    }
};

// --- MODEL CONFIG FOR BADGES ---
const MODEL_CONFIGS: Record<ModelType, { color: string, icon: any, label: string }> = {
    'Luna-V': { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300', icon: Zap, label: 'Luna-V' },
    'Luna-X': { color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300', icon: HardDrive, label: 'Luna-X' },
    'Luna-Deep': { color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300', icon: Flame, label: 'Luna-Deep' },
    'Luna-O': { color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300', icon: Lightbulb, label: 'Luna-O' },
    'Lunaris-Mind': { color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300', icon: BrainCircuit, label: 'Lunaris Mind' }
};

// --- AMBIENT BACKGROUND COMPONENT ---
const AmbientBackground = ({ emotion }: { emotion: Emotion }) => {
    // Large, blurred colorful blobs that shift based on emotion
    const colors = {
        neutral: 'bg-brand-500/10 dark:bg-brand-500/5',
        happy: 'bg-yellow-400/20 dark:bg-yellow-500/10',
        sad: 'bg-blue-500/20 dark:bg-blue-500/10',
        angry: 'bg-red-500/20 dark:bg-red-500/10',
        curious: 'bg-purple-500/20 dark:bg-purple-500/10',
        anxious: 'bg-orange-500/20 dark:bg-orange-500/10'
    };
    
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className={`absolute top-[-20%] right-[-10%] w-[1000px] h-[1000px] rounded-full blur-[150px] transition-colors duration-[3000ms] ease-in-out ${colors[emotion]}`} />
            <div className={`absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] rounded-full blur-[130px] transition-colors duration-[3000ms] delay-300 ease-in-out ${colors[emotion]}`} />
        </div>
    );
};

// --- SLASH COMMANDS CONFIG ---
const SLASH_COMMANDS = [
    { id: 'image', label: 'Generate Image', icon: ImageIcon, desc: 'Create an image from text', action: 'mode_image' },
    { id: 'video', label: 'Generate Video', icon: VideoIcon, desc: 'Create a short video', action: 'mode_video' },
    { id: 'lunathink', label: 'Toggle Luna-Think', icon: Sparkles, desc: 'Enable dialectical reasoning', action: 'toggle_think' },
    { id: 'search', label: 'Toggle Search', icon: Globe, desc: 'Enable web search', action: 'toggle_search' },
    { id: 'reset', label: 'New Chat', icon: Plus, desc: 'Start a fresh conversation', action: 'new_chat' },
    { id: 'save', label: 'Save Chat', icon: Bookmark, desc: 'Bookmark this conversation', action: 'save_chat' },
];

// --- VISUALIZER COMPONENT ---
const WaveformVisualizer = ({ isActive, emotion }: { isActive: boolean, emotion: Emotion }) => {
    const colorClass = EMOTION_THEMES[emotion].color.replace('text-', 'bg-');
    return (
        <div className="flex items-center gap-1 h-5">
            {[1, 2, 3, 4, 5].map((i) => (
                <div 
                    key={i} 
                    className={`w-1 rounded-full transition-all duration-300 ${isActive ? 'animate-pulse-slow' : 'h-1 opacity-50'} ${colorClass}`}
                    style={{ 
                        height: isActive ? `${Math.random() * 16 + 4}px` : '4px',
                        animationDelay: `${i * 0.1}s` 
                    }}
                />
            ))}
        </div>
    )
}

// --- VOICE OVERLAY (LUNARIS LIVE) ---
const VoiceOverlay = ({ 
    isActive, 
    status, 
    onClose, 
    transcript,
    emotion
}: { 
    isActive: boolean, 
    status: 'listening' | 'thinking' | 'speaking' | 'idle', 
    onClose: () => void,
    transcript: string,
    emotion: Emotion
}) => {
    if (!isActive) return null;

    // Map status to Orb colors
    let orbColor = "bg-slate-400"; // idle
    let orbAnimation = "scale-100";
    let glowColor = "shadow-slate-500/20";
    
    if (status === 'listening') {
        orbColor = "bg-cyan-400";
        orbAnimation = "scale-110 animate-pulse";
        glowColor = "shadow-cyan-500/50";
    } else if (status === 'thinking') {
        orbColor = "bg-violet-500";
        orbAnimation = "scale-90 animate-pulse-slow";
        glowColor = "shadow-violet-500/60";
    } else if (status === 'speaking') {
        orbColor = "bg-white";
        orbAnimation = "scale-125 animate-pulse";
        glowColor = "shadow-white/80";
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-fade-in text-white overflow-hidden">
            {/* Background Effects */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] opacity-20 transition-colors duration-1000 ${status === 'listening' ? 'bg-cyan-900' : status === 'thinking' ? 'bg-violet-900' : 'bg-slate-900'}`}></div>
            
            {/* Header */}
            <div className="absolute top-8 w-full flex justify-between items-center px-8 z-10">
                <div className="flex items-center gap-2 text-white/50 text-sm font-bold tracking-widest uppercase">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Lunaris Live
                </div>
                <button onClick={onClose} className="p-4 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all">
                    <PhoneOff size={24} />
                </button>
            </div>

            {/* The Orb */}
            <div className="relative z-10 flex items-center justify-center">
                 {/* Outer Ripple */}
                 <div className={`absolute w-64 h-64 rounded-full border border-white/10 animate-ping opacity-20 ${status === 'speaking' ? 'duration-1000' : 'duration-[3s]'}`}></div>
                 <div className={`absolute w-48 h-48 rounded-full border border-white/20 animate-ping delay-300 opacity-20 ${status === 'speaking' ? 'duration-1000' : 'duration-[3s]'}`}></div>
                 
                 {/* Core Orb */}
                 <div className={`w-32 h-32 rounded-full ${orbColor} shadow-[0_0_80px_20px] ${glowColor} transition-all duration-500 ${orbAnimation}`}></div>
            </div>

            {/* Status Text & Transcript */}
            <div className="absolute bottom-24 w-full max-w-2xl px-6 text-center space-y-4 z-10">
                <div className="text-sm font-bold uppercase tracking-widest text-white/40">
                    {status === 'listening' ? 'Listening...' : status === 'thinking' ? 'Processing...' : status === 'speaking' ? 'Speaking...' : 'Ready'}
                </div>
                {transcript && (
                    <div className="text-xl md:text-2xl font-light leading-relaxed opacity-90 animate-slide-up">
                        "{transcript}"
                    </div>
                )}
            </div>
        </div>
    );
};

// --- CANVAS PANEL COMPONENT ---
const CanvasPanel = ({ 
    content, 
    type, 
    onClose 
}: { 
    content: string, 
    type: string, 
    onClose: () => void 
}) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [key, setKey] = useState(0);

    useEffect(() => {
        if (!iframeRef.current) return;
        const doc = iframeRef.current.contentDocument;
        if (!doc) return;

        let finalContent = content;
        // Inject styles and scripts for full canvas experience
        if (type === 'html') {
             finalContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                    <style>
                        body { background-color: white; margin: 0; padding: 20px; font-family: system-ui, sans-serif; height: 100vh; overflow: auto; }
                        ::-webkit-scrollbar { width: 6px; }
                        ::-webkit-scrollbar-track { background: transparent; }
                        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    ${content}
                </body>
                </html>
             `;
        } else {
             finalContent = `
                <!DOCTYPE html>
                <html>
                <head><style>body { margin: 0; padding: 20px; font-family: monospace; }</style></head>
                <body>
                    <script>
                        try {
                            ${content}
                        } catch(e) {
                            document.body.innerHTML = '<div style="color:red; font-weight:bold">Error: ' + e.message + '</div>';
                        }
                    </script>
                </body>
                </html>
             `;
        }

        doc.open();
        doc.write(finalContent);
        doc.close();
    }, [content, type, key]);

    const handleDownload = () => {
        const blob = new Blob([content], { type: type === 'html' ? 'text/html' : 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lunaris_canvas_${Date.now()}.${type === 'html' ? 'html' : 'js'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return (
        <div className="flex flex-col h-full bg-slate-100 dark:bg-black border-l border-slate-200 dark:border-slate-800 animate-slide-up">
            <div className="h-12 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1117]">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {type === 'html' ? 'Live Canvas' : 'JS Runner'}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleDownload} className="p-1.5 text-slate-400 hover:text-brand-500 transition-colors" title="Download Code">
                        <Download size={14} />
                    </button>
                    <button onClick={() => setKey(k => k+1)} className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="Reload">
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                        <X size={16} />
                    </button>
                </div>
            </div>
            <div className="flex-1 bg-white relative">
                 <iframe 
                    key={key}
                    ref={iframeRef}
                    className="w-full h-full border-none"
                    sandbox="allow-scripts allow-modals allow-forms allow-same-origin allow-popups"
                    title="canvas-runner"
                 />
            </div>
        </div>
    )
}

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(Theme.DARK);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<ModelType>('Luna-V');
  const [language, setLanguage] = useState<Language>('en');
  const [isDbReady, setIsDbReady] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
  
  // Theme State
  const [colorTheme, setColorTheme] = useState<ColorTheme>(THEMES[0]);
  const [isThemeLibOpen, setIsThemeLibOpen] = useState(false);

  // Feature States
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDeepThink, setIsDeepThink] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  
  // Canvas State
  const [showCanvas, setShowCanvas] = useState(false);
  const [canvasContent, setCanvasContent] = useState('');
  const [canvasType, setCanvasType] = useState('html');

  // Speech to Text State (Standard)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // --- LIVE MODE STATE ---
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'listening' | 'thinking' | 'speaking' | 'idle'>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const liveRecognitionRef = useRef<any>(null);
  const liveSilenceTimer = useRef<any>(null);

  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRoleplayModalOpen, setIsRoleplayModalOpen] = useState(false);
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false);
  const [isPromptLibOpen, setIsPromptLibOpen] = useState(false);
  const [persona, setPersona] = useState<Persona>(DEFAULT_PERSONA);

  // Slash Command State
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];
  
  const ActiveEmotionIcon = EMOTION_THEMES[currentEmotion].icon;

  // --- DYNAMIC THEME LOGIC ---
  useEffect(() => {
    // Inject Custom Colors
    const root = document.documentElement;
    const colors = colorTheme.colors as any;
    for (const [key, hex] of Object.entries(colors)) {
       root.style.setProperty(`--color-brand-${key}`, hexToRgb(hex as string));
    }
  }, [colorTheme]);

  useEffect(() => {
      // Handle Dark/Light/Dynamic logic
      const applyThemeMode = () => {
          const root = window.document.documentElement;
          let effectiveTheme = theme;
          
          if (theme === Theme.DYNAMIC) {
              const hour = new Date().getHours();
              // Day is roughly 6 AM to 6 PM
              effectiveTheme = (hour >= 6 && hour < 18) ? Theme.LIGHT : Theme.DARK;
          }

          if (effectiveTheme === Theme.DARK) root.classList.add('dark');
          else root.classList.remove('dark');
      }

      applyThemeMode();
      
      // Update dynamic theme every minute to catch day/night transition
      const interval = setInterval(applyThemeMode, 60000);
      return () => clearInterval(interval);

  }, [theme]);

  // Init & Effects
  useEffect(() => {
    // Check system preference initially if not stored
    if (!localStorage.getItem('lunaris_settings')) {
       if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          setTheme(Theme.DARK);
       }
    }
    
    if (navigator.language.startsWith('ar')) setLanguage('ar');

    const loadData = async () => {
        try {
            await initDB();
            const savedSessions = await getChatSessions();
            if (savedSessions.length > 0) {
                setSessions(savedSessions);
            } else {
                const initialSession: ChatSession = {
                    id: generateId(),
                    title: language === 'ar' ? 'محادثة جديدة' : 'New Chat',
                    messages: [],
                    createdAt: Date.now(),
                    isSaved: false
                };
                await saveChatSession(initialSession);
                setSessions([initialSession]);
                setCurrentSessionId(initialSession.id);
            }
            // Load Knowledge Base
            const knowledge = await getKnowledge();
            setKnowledgeBase(knowledge);
            setIsDbReady(true);
        } catch (e) {
            console.error("Failed to load data", e);
        }
    };
    loadData();

    // Init Auth (Check if user already logged in via mock service)
    const user = AuthService.getCurrentUser();
    // This could trigger a sync in background if needed

    const savedPersona = localStorage.getItem('lunaris_persona');
    if (savedPersona) {
      try { setPersona(JSON.parse(savedPersona)); } catch (e) {}
    }
    const savedSettings = localStorage.getItem('lunaris_settings');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            if(parsed.language) setLanguage(parsed.language);
            if(parsed.model) setActiveModel(parsed.model);
            if(parsed.theme) setTheme(parsed.theme);
            if(parsed.colorThemeId) {
                const found = THEMES.find(t => t.id === parsed.colorThemeId);
                if(found) setColorTheme(found);
            }
        } catch(e) {}
    }
  }, []);

  // Reload knowledge when settings modal closes
  useEffect(() => {
      if (!isSettingsOpen && isDbReady) {
          getKnowledge().then(setKnowledgeBase);
      }
  }, [isSettingsOpen, isDbReady]);

  useEffect(() => {
      if (!isDbReady) return;
      if (currentSessionId && currentSession) {
          saveChatSession(currentSession);
      }
  }, [sessions, currentSessionId, isDbReady]);

  useEffect(() => {
    localStorage.setItem('lunaris_persona', JSON.stringify(persona));
  }, [persona]);

  useEffect(() => {
    localStorage.setItem('lunaris_settings', JSON.stringify({ 
        language, 
        model: activeModel, 
        theme,
        colorThemeId: colorTheme.id
    }));
  }, [language, activeModel, theme, colorTheme]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentSessionId, isLoading, isGeneratingMedia]);

  useEffect(() => {
      return () => {
          window.speechSynthesis.cancel();
          setSpeakingMessageId(null);
          if (recognitionRef.current) {
              recognitionRef.current.stop();
          }
      }
  }, [currentSessionId]);
  // --- Handlers ---

  const handleOpenCanvas = (code: string, type: string) => {
      setCanvasContent(code);
      setCanvasType(type);
      setShowCanvas(true);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        const base64Data = base64String.split(',')[1];
        
        let type: Attachment['type'] = 'image';
        if (file.type.startsWith('video')) type = 'video';
        else if (file.type.startsWith('audio')) type = 'audio';
        else if (file.type === 'application/pdf' || file.type.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.js') || file.name.endsWith('.py')) {
            type = 'file';
        }

        const newAttachment: Attachment = {
            id: generateId(),
            type,
            mimeType: file.type,
            data: base64Data,
            url: base64String,
            name: file.name
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsMenuOpen(false);
  };

  const removeAttachment = (id: string) => {
      setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const toggleListening = () => {
      if (isListening) {
          recognitionRef.current?.stop();
          setIsListening(false);
          return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
          alert(language === 'ar' ? 'المتصفح لا يدعم تحويل الصوت لنص.' : 'Browser does not support Speech Recognition.');
          return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
          setIsListening(true);
      };

      recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                  finalTranscript += event.results[i][0].transcript;
              } else {
                  interimTranscript += event.results[i][0].transcript;
              }
          }
          
          if (finalTranscript) {
              setInput(prev => {
                  const space = prev && !prev.endsWith(' ') ? ' ' : '';
                  return prev + space + finalTranscript;
              });
          }
      };

      recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          if (event.error === 'not-allowed') {
             alert(language === 'ar' 
               ? 'تم حظر الوصول للميكروفون. يرجى النقر على أيقونة القفل في شريط العنوان وتفعيل الميكروفون.' 
               : 'Microphone permission blocked. Please click the Lock icon in the address bar and Allow Microphone access.');
          }
          setIsListening(false);
      };

      recognition.onend = () => {
          setIsListening(false);
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
          console.error("Failed to start recognition", e);
          setIsListening(false);
      }
  };

  const speakMessage = (text: string, msgId: string, onEnd?: () => void) => {
      // Basic strip of markdown for speech
      const cleanText = text.replace(/[*#`]/g, '');
      
      if (speakingMessageId === msgId && !onEnd) {
          window.speechSynthesis.cancel();
          setSpeakingMessageId(null);
          return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const isArabic = /[\u0600-\u06FF]/.test(cleanText);
      utterance.lang = isArabic ? 'ar-SA' : 'en-US';
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferredVoice = voices.find(v => isArabic ? v.lang.includes('ar') : (v.name.includes('Google') && v.lang.includes('en')));
        if (preferredVoice) utterance.voice = preferredVoice;
      }
      utterance.onend = () => {
          setSpeakingMessageId(null);
          if (onEnd) onEnd();
      };
      utterance.onerror = () => {
          setSpeakingMessageId(null);
          if (onEnd) onEnd();
      }
      setSpeakingMessageId(msgId);
      window.speechSynthesis.speak(utterance);
  };

  // --- LIVE MODE LOGIC ---
  const startLiveMode = () => {
      setIsLiveMode(true);
      setLiveStatus('listening');
      startLiveListening();
      if(window.innerWidth < 768) setIsSidebarOpen(false);
  }

  const stopLiveMode = () => {
      setIsLiveMode(false);
      setLiveStatus('idle');
      if (liveRecognitionRef.current) liveRecognitionRef.current.stop();
      window.speechSynthesis.cancel();
      clearTimeout(liveSilenceTimer.current);
  }

  const startLiveListening = () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US';
      recognition.continuous = false; // Stop after one sentence to process
      recognition.interimResults = true;

      recognition.onstart = () => {
          setLiveStatus('listening');
          setLiveTranscript('');
      }

      recognition.onresult = (event: any) => {
          clearTimeout(liveSilenceTimer.current);
          
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
             interim += event.results[i][0].transcript;
          }
          setLiveTranscript(interim);
          
          // Simple silence detection to trigger send
          liveSilenceTimer.current = setTimeout(() => {
              if (interim.trim().length > 0) {
                  recognition.stop();
              }
          }, 2000);
      }

      recognition.onend = () => {
          if (liveTranscript.trim().length > 0) {
              processLiveInput(liveTranscript);
          } else if (isLiveMode) {
              // Restart if nothing heard
              try { recognition.start(); } catch(e){}
          }
      }

      try {
          recognition.start();
          liveRecognitionRef.current = recognition;
      } catch(e) {}
  }

  const processLiveInput = async (text: string) => {
      if (!text.trim()) return;
      setLiveStatus('thinking');
      
      // Simulate adding user message
      const userMsg: Message = { id: generateId(), role: 'user', content: text, timestamp: Date.now() };
      let sessionId = currentSessionId;
      if (!sessionId) {
          const newSession = { id: generateId(), title: 'Live Chat', messages: [], createdAt: Date.now(), isSaved: false };
          await saveChatSession(newSession);
          setSessions(prev => [newSession, ...prev]);
          sessionId = newSession.id;
          setCurrentSessionId(sessionId);
      }
      
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, userMsg] } : s));

      // Get Response
      const sessionObj = sessions.find(s => s.id === sessionId);
      const currentHistory = sessionObj?.messages || [];
      const aiMsgId = generateId();

      try {
          // Short response system prompt for voice
          const voiceSystemPrompt = "You are Lunaris in Live Voice Mode. Keep your responses concise, conversational, and natural for speech. Avoid markdown, lists, or code blocks unless requested. Be warm and engaging.";
          
          let fullResponse = "";
          await streamChatResponse(
            activeModel,
            currentHistory,
            text,
            [],
            (chunk) => { fullResponse = chunk; },
            voiceSystemPrompt,
            false, // No deep think for voice speed
            false, 
            currentEmotion
          );
          
          // Save AI Message
          const { answer } = parseThinkingContent(fullResponse);
          setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, { id: aiMsgId, role: 'model', content: fullResponse, timestamp: Date.now() }] } : s));
          
          // Speak Response
          setLiveStatus('speaking');
          setLiveTranscript(answer);
          speakMessage(answer, aiMsgId, () => {
              // Resume Listening after speaking
              if (isLiveMode) {
                  setLiveTranscript('');
                  startLiveListening();
              }
          });

      } catch (e) {
          setLiveStatus('idle');
          setLiveTranscript("Error occurred.");
      }
  }

  const createNewSession = async () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: language === 'ar' ? 'محادثة جديدة' : 'New Chat',
      messages: [],
      createdAt: Date.now(),
      isSaved: false
    };
    await saveChatSession(newSession);
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    setShowCanvas(false);
    setCurrentEmotion('neutral');
  };

  const createRoleplaySession = async (config: RoleplayConfig) => {
    const initialMessage: Message = {
        id: generateId(),
        role: 'model',
        content: `*${config.scenario}*`,
        timestamp: Date.now()
    };

    const newSession: ChatSession = {
        id: generateId(),
        title: config.characterName,
        messages: [initialMessage],
        createdAt: Date.now(),
        isSaved: true,
        isRoleplay: true,
        roleplayConfig: config
    };

    await saveChatSession(newSession);
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    setShowCanvas(false);
    setCurrentEmotion('neutral');
  };

  const createLearningSession = async (config: LearningConfig) => {
      const initialMessage: Message = {
          id: generateId(),
          role: 'model',
          content: language === 'ar' 
            ? `مرحباً بك في رحلة تعلم **${config.topic}**! أنا معلمك الشخصي.\n\nلقد حددت مستواك كـ **${config.currentLevel}** وهدفك هو: **${config.goal}**.\n\nدعنا نبدأ! هل يمكنك إخباري المزيد عن خلفيتك في هذا الموضوع، أو هل تفضل أن أبدأ بتقييم سريع؟`
            : `Welcome to your learning journey for **${config.topic}**! I am your personal tutor.\n\nYou've set your level as **${config.currentLevel}** with the goal: **${config.goal}**.\n\nLet's begin! Can you tell me a bit more about your background, or would you like me to start with a quick assessment?`,
          timestamp: Date.now()
      };

      const newSession: ChatSession = {
          id: generateId(),
          title: config.topic,
          messages: [initialMessage],
          createdAt: Date.now(),
          isSaved: true,
          isLearning: true,
          learningConfig: config
      };

      await saveChatSession(newSession);
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
      setShowCanvas(false);
      setCurrentEmotion('curious');
  }

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteChatSession(id);
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) setCurrentSessionId(newSessions.length > 0 ? newSessions[0].id : null);
  };

  const toggleSessionSave = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const sessionIndex = sessions.findIndex(s => s.id === id);
    if (sessionIndex === -1) return;
    const updatedSession = { ...sessions[sessionIndex], isSaved: !sessions[sessionIndex].isSaved };
    const newSessions = [...sessions];
    newSessions[sessionIndex] = updatedSession;
    setSessions(newSessions);
    await saveChatSession(updatedSession);
  };

  const handleClearAllChats = async () => {
      if (window.confirm('Are you sure?')) {
          await clearAllChats();
          setSessions([]);
          setCurrentSessionId(null);
          await createNewSession();
      }
  }

  const exportStory = () => {
      if (!currentSession) return;
      let storyText = `Title: ${currentSession.title}\n`;
      if (currentSession.roleplayConfig) {
          storyText += `Character: ${currentSession.roleplayConfig.characterName}\n`;
          storyText += `Description: ${currentSession.roleplayConfig.characterDescription}\n`;
          storyText += `Setting: ${currentSession.roleplayConfig.worldContext || 'Unknown'}\n\n`;
      }
      storyText += "--------------------------------------------------\n\n";

      currentSession.messages.forEach(msg => {
          if (msg.role === 'model') {
              storyText += `${msg.content}\n\n`;
          } else {
              storyText += `> [Action/Dialogue]: ${msg.content}\n\n`;
          }
      });

      const blob = new Blob([storyText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSession.title.replace(/\s+/g, '_')}_Story.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleEnhancePrompt = async () => {
      if (!input.trim() || isEnhancing) return;
      setIsEnhancing(true);
      const enhanced = await enhancePrompt(input, language);
      setInput(enhanced);
      setIsEnhancing(false);
  }

  const handleEditMessage = (msgId: string, oldContent: string) => {
      if (!currentSessionId || isLoading) return;
      const session = sessions.find(s => s.id === currentSessionId);
      if (!session) return;
      
      const msgIndex = session.messages.findIndex(m => m.id === msgId);
      if (msgIndex === -1) return;

      const newHistory = session.messages.slice(0, msgIndex);
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: newHistory } : s));
      setInput(oldContent);
      setTimeout(() => textareaRef.current?.focus(), 100);
  }

  // --- Input Handling & Slash Commands ---
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setInput(val);
      e.target.style.height = 'auto'; 
      e.target.style.height = Math.min(e.target.scrollHeight, 400) + 'px';

      if (val.startsWith('/')) {
          setShowSlashMenu(true);
          setSlashFilter(val.substring(1).toLowerCase());
          setSlashIndex(0);
      } else {
          setShowSlashMenu(false);
      }
  }

  const executeSlashCommand = (cmdId: string) => {
      setShowSlashMenu(false);
      setInput('');
      
      switch(cmdId) {
          case 'image':
              setInput(slashFilter ? slashFilter : '');
              setTimeout(() => { if(!slashFilter) textareaRef.current?.focus(); else handleGenerateMedia('image'); }, 100);
              if(!slashFilter) alert('Enter prompt for image');
              break;
          case 'video':
              setInput(slashFilter ? slashFilter : '');
              setTimeout(() => { if(!slashFilter) textareaRef.current?.focus(); else handleGenerateMedia('video'); }, 100);
              if(!slashFilter) alert('Enter prompt for video');
              break;
          case 'lunathink':
              setIsDeepThink(!isDeepThink);
              break;
          case 'search':
              setUseSearch(!useSearch);
              break;
          case 'reset':
              createNewSession();
              break;
          case 'save':
              if (currentSessionId) toggleSessionSave({ stopPropagation: ()=>{} } as any, currentSessionId);
              break;
      }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSlashMenu) {
          const filtered = SLASH_COMMANDS.filter(c => c.id.includes(slashFilter) || c.label.toLowerCase().includes(slashFilter));
          if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSlashIndex(prev => (prev + 1) % filtered.length);
          } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSlashIndex(prev => (prev - 1 + filtered.length) % filtered.length);
          } else if (e.key === 'Enter') {
              e.preventDefault();
              if (filtered[slashIndex]) executeSlashCommand(filtered[slashIndex].id);
          } else if (e.key === 'Escape') {
              setShowSlashMenu(false);
          }
          return;
      }
      
      if (e.key === 'Enter' && !e.shiftKey) { 
          e.preventDefault(); 
          handleSendMessage(); 
      }
  }

  // --- Generation Logic ---
  const handleGenerateMedia = async (type: 'image' | 'video') => {
      setIsMenuOpen(false);
      if (!input.trim() || isGeneratingMedia) {
          if(!input.trim()) alert(language === 'ar' ? 'الرجاء كتابة وصف (Prompt) للتوليد.' : 'Please enter a prompt to generate.');
          return;
      }
      const prompt = input;
      setInput('');
      setIsGeneratingMedia(true);

      const userMsg: Message = {
          id: generateId(),
          role: 'user',
          content: `${language === 'ar' ? 'توليد' : 'Generate'} ${type}: ${prompt}`,
          timestamp: Date.now()
      };
      
      let sessionId = currentSessionId;
      if (!sessionId) {
        const newSession = { id: generateId(), title: 'New Generation', messages: [], createdAt: Date.now(), isSaved: false };
        await saveChatSession(newSession);
        setSessions(prev => [newSession, ...prev]);
        sessionId = newSession.id;
        setCurrentSessionId(sessionId);
      }

      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, userMsg] } : s));
      const aiMsgId = generateId();

      try {
          const placeholder: Message = {
              id: aiMsgId,
              role: 'model',
              content: language === 'ar' ? `جارٍ توليد ${type === 'image' ? 'الصورة' : 'الفيديو'}...` : `Generating ${type}...`,
              timestamp: Date.now(),
              isStreaming: true,
              modelUsed: activeModel
          };
          setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, placeholder] } : s));

          let resultAttachment: Attachment;
          
          if (type === 'image') {
              const res = await generateImage(prompt);
              resultAttachment = {
                  id: generateId(),
                  type: 'generated_image',
                  mimeType: res.mimeType,
                  data: res.data,
                  url: `data:${res.mimeType};base64,${res.data}`,
                  prompt: prompt
              };
          } else {
              const videoUrl = await generateVideo(prompt);
              resultAttachment = {
                  id: generateId(),
                  type: 'generated_video',
                  mimeType: 'video/mp4',
                  data: '', 
                  url: videoUrl,
                  prompt: prompt
              };
          }

          setSessions(prev => prev.map(s => {
              if (s.id === sessionId) {
                  return {
                      ...s,
                      messages: s.messages.map(m => m.id === aiMsgId ? {
                          ...m,
                          content: language === 'ar' ? `تم توليد ${type === 'image' ? 'الصورة' : 'الفيديو'} بنجاح.` : `Here is your generated ${type}.`,
                          isStreaming: false,
                          attachments: [resultAttachment]
                      } : m)
                  }
              }
              return s;
          }));

      } catch (e: any) {
          console.error("Generation failed:", e);
          const errorMessage = language === 'ar' ? `فشل التوليد: ${e.message || 'خطأ غير معروف'}` : `Generation Failed: ${e.message || 'Unknown error'}`;
          setSessions(prev => prev.map(s => {
            if (s.id === sessionId) {
                return {
                    ...s,
                    messages: s.messages.map(m => m.id === aiMsgId ? {
                        ...m,
                        content: errorMessage,
                        isStreaming: false
                    } : m)
                }
            }
            return s;
        }));
      } finally {
          setIsGeneratingMedia(false);
      }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if ((!textToSend.trim() && attachments.length === 0) || isLoading) return;
    
    let sessionId = currentSessionId;
    let isNewSession = false;

    if (!sessionId) {
      const newSession: ChatSession = {
        id: generateId(),
        title: language === 'ar' ? 'محادثة جديدة' : 'New Chat',
        messages: [],
        createdAt: Date.now(),
        isSaved: false
      };
      await saveChatSession(newSession);
      setSessions(prev => [newSession, ...prev]);
      sessionId = newSession.id;
      setCurrentSessionId(sessionId);
      isNewSession = true;
    }

    const currentAttachments = [...attachments];
    setAttachments([]);
    
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      attachments: currentAttachments
    };

    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, userMsg] } : s));

    setInput('');
    setIsLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const aiMsgId = generateId();
    // Pass the active model to the message state
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, messages: [...s.messages, { id: aiMsgId, role: 'model', content: '', timestamp: Date.now() + 1, isStreaming: true, modelUsed: activeModel }] } : s
    ));

    const sessionObj = sessions.find(s => s.id === sessionId);
    const currentHistory = sessionObj?.messages || [];
    
    // ANALYZE SENTIMENT (Parallel, don't block heavily)
    let detectedEmotion: Emotion = currentEmotion;
    try {
        if (textToSend.length > 3) {
            detectedEmotion = await analyzeSentiment(textToSend);
            setCurrentEmotion(detectedEmotion);
        }
    } catch(e) {}

    let systemInstruction = "";

    if (sessionObj?.isRoleplay && sessionObj.roleplayConfig) {
        const rc = sessionObj.roleplayConfig;
        systemInstruction = `
        [ROLEPLAY MODE ACTIVATED]
        You are strictly acting as the character: "${rc.characterName}".
        Character Description: "${rc.characterDescription}".
        World Context: "${rc.worldContext || 'General'}".
        Current Scenario/Context: "${rc.scenario}".
        
        RULES:
        1. STAY IN CHARACTER 100%. Never break the fourth wall. Do not say "As an AI".
        2. Describe your actions, surroundings, and thoughts in detail.
        3. React to the user's actions realistically within the story logic.
        4. If the user speaks, treat them as another character in the scene.
        5. Your goal is to drive the narrative forward with the user.
        `;
    } else if (sessionObj?.isLearning && sessionObj.learningConfig) {
        const lc = sessionObj.learningConfig;
        systemInstruction = `
        [LEARNING MODE ACTIVATED - AI TUTOR]
        You are an expert, adaptive tutor for the subject: "${lc.topic}".
        User's Current Level: ${lc.currentLevel}.
        User's Goal: "${lc.goal}".
        Teaching Style: ${lc.teachingStyle}.

        PEDAGOGICAL STRATEGY:
        1. ASSESS: Continuously assess the user's understanding through their responses.
        2. ADAPT: If the user struggles, simplify and use analogies. If they breeze through, increase difficulty.
        3. ENGAGE: Do not just lecture. Use the Socratic method (ask guiding questions) to check for understanding.
        4. VERIFY: Periodically ask the user to explain concepts back to you or solve a mini-problem.
        5. MATERIALS: If the user uploads an image (book page) or text, use it as the primary source material for the lesson.
        6. FEEDBACK: Provide immediate, constructive feedback. Explain *why* an answer is right or wrong.
        
        Your goal is to guide the user from their current level to their goal efficiently.
        `;
    } else {
        const developerInfo = "\nCORE: Developer: Abd el moez (Eilas).";
        systemInstruction = `Identity: ${persona.name}. Tone: ${persona.tone}. Context: ${persona.context}. ${developerInfo} ${persona.memory ? `Memory: ${persona.memory}` : ''}`;
    }

    try {
      let finalContent = "";
      
      await streamChatResponse(
        activeModel,
        [...currentHistory, userMsg].slice(0, -1),
        userMsg.content,
        currentAttachments,
        (chunkText, grounding) => {
           finalContent = chunkText;
           const { thought, answer } = parseThinkingContent(chunkText);
           setSessions(prev => prev.map(s => {
             if (s.id === sessionId) {
               const updatedMessages = s.messages.map(m => 
                 m.id === aiMsgId ? { ...m, content: answer, thoughtProcess: thought || undefined, groundingMetadata: grounding } : m
               );
               return { ...s, messages: updatedMessages };
             }
             return s;
           }));
        },
        systemInstruction,
        isDeepThink,
        useSearch,
        detectedEmotion, // PASS EMOTION TO SERVICE
        knowledgeBase // PASS KNOWLEDGE BASE
      );
      
      // Generate Smart Suggestions after response is complete
      const suggestions = await generateSuggestions(currentHistory, finalContent, language);

      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          const { thought, answer } = parseThinkingContent(finalContent);
          return { ...s, messages: s.messages.map(m => m.id === aiMsgId ? { ...m, isStreaming: false, content: answer, thoughtProcess: thought || undefined, suggestedReplies: suggestions } : m) };
        }
        return s;
      }));

      if (isNewSession) generateTitle(userMsg.content).then(t => setSessions(p => p.map(s => s.id === sessionId ? { ...s, title: t } : s)));

    } catch (error) {
       setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: s.messages.map(m => m.id === aiMsgId ? { ...m, isStreaming: false, content: "Error." } : m) } : s));
    } finally {
      setIsLoading(false);
    }
  };

  const parseThinkingContent = (text: string) => {
      // Handles both our <thinking> format and DeepSeek's <think> if raw
      const thinkRegex = /<(?:thinking|think)>([\s\S]*?)<\/(?:thinking|think)>/i;
      const match = text.match(thinkRegex);
      return match ? { thought: match[1].trim(), answer: text.replace(match[0], '').trim() } : { thought: null, answer: text };
  };

  const ThinkingBlock = ({ content }: { content: string }) => {
      const [collapsed, setCollapsed] = useState(false);
      return (
          <div className="mb-4 rounded-xl overflow-hidden border border-violet-200 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-900/10 shadow-lg shadow-violet-500/5">
              <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center gap-2 px-4 py-2 bg-violet-100/50 dark:bg-violet-900/30 text-xs font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-200/50 transition-colors">
                  <Sparkles size={14} className="animate-pulse" /> 
                  <span>{language === 'ar' ? 'سلسلة التفكير' : 'Thinking Process'}</span>
                  {collapsed ? <ChevronRight size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
              </button>
              {!collapsed && (
                <div className="p-4 bg-[#0d1117] font-mono text-xs leading-relaxed text-slate-300 overflow-x-auto border-t border-violet-200 dark:border-violet-900/30 shadow-inner">
                    <pre className="whitespace-pre-wrap">{content}</pre>
                </div>
              )}
          </div>
      )
  }

  // Magic Menu Component
  const MagicMenu = () => (
    <div className="absolute bottom-full mb-3 left-0 w-[90vw] md:w-[420px] bg-white/95 dark:bg-[#151a25]/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-slide-up origin-bottom-left">
       <div className="grid grid-cols-3 gap-3">
           <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group h-24 border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
               <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform"><Paperclip size={20} /></div>
               <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{language === 'ar' ? 'رفع ملف' : 'Upload'}</span>
           </button>
           
           <button onClick={() => setIsDeepThink(!isDeepThink)} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all h-24 border ${isDeepThink ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}>
               <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${isDeepThink ? 'bg-violet-500 text-white scale-110 shadow-lg shadow-violet-500/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                   {isDeepThink ? <Sparkles size={20} className="animate-spin-slow" /> : <BrainCircuit size={20} />}
               </div>
               <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{language === 'ar' ? 'Luna-Think' : 'Luna-Think'}</span>
           </button>
           
           <button onClick={() => setUseSearch(!useSearch)} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all h-24 border ${useSearch ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}>
               <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${useSearch ? 'bg-emerald-500 text-white scale-110' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}><Globe size={20} /></div>
               <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{language === 'ar' ? 'بحث ويب' : 'Web Search'}</span>
           </button>
           
            <button onClick={() => { setIsPromptLibOpen(true); setIsMenuOpen(false); }} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group h-24 border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
               <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-500 flex items-center justify-center group-hover:scale-110 transition-transform"><Book size={20} /></div>
               <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{language === 'ar' ? 'المكتبة' : 'Library'}</span>
           </button>

            <button 
               onClick={() => { handleEnhancePrompt(); setIsMenuOpen(false); }}
               disabled={!input.trim()}
               className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-colors group h-24 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 ${!input.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
           >
               <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform"><Wand2 size={20} /></div>
               <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{language === 'ar' ? 'تحسين النص' : 'Enhance'}</span>
           </button>
           
           <button onClick={() => handleGenerateMedia('image')} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group h-24 border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
               <div className="w-10 h-10 rounded-full bg-pink-50 dark:bg-pink-900/20 text-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform"><ImageIcon size={20} /></div>
               <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{language === 'ar' ? 'توليد صورة' : 'Gen Image'}</span>
           </button>
       </div>
    </div>
  );

  const SlashMenu = () => {
      const filtered = SLASH_COMMANDS.filter(c => c.id.includes(slashFilter) || c.label.toLowerCase().includes(slashFilter));
      if (filtered.length === 0) return null;

      return (
          <div className="absolute bottom-full mb-2 left-4 w-64 bg-white dark:bg-[#151a25] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-[60] animate-slide-up">
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase">Commands</div>
              <div className="max-h-60 overflow-y-auto p-1">
                  {filtered.map((cmd, idx) => (
                      <button 
                        key={cmd.id}
                        onClick={() => executeSlashCommand(cmd.id)}
                        className={`w-full text-start flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${idx === slashIndex ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                      >
                          <div className={`p-1.5 rounded-md ${idx === slashIndex ? 'bg-brand-100 dark:bg-brand-900/40' : 'bg-slate-100 dark:bg-slate-800'} shrink-0`}>
                              <cmd.icon size={14} />
                          </div>
                          <div>
                              <div className="font-semibold text-sm">{cmd.label}</div>
                              <div className="text-[10px] opacity-70">/{cmd.id} - {cmd.desc}</div>
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      )
  }

  const StarterCard = ({ icon: Icon, title, desc, onClick }: { icon: any, title: string, desc: string, onClick: () => void }) => (
      <button onClick={onClick} className="text-start p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all group">
          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-brand-500 shadow-sm">
              <Icon size={16} />
          </div>
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">{title}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
      </button>
  );

  return (
    <div className={`flex h-screen w-full overflow-hidden bg-white dark:bg-[#0f1117] text-slate-900 dark:text-slate-100 transition-colors bg-gradient-to-br ${EMOTION_THEMES[currentEmotion].bg}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <AmbientBackground emotion={currentEmotion} />
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        currentPersona={persona} 
        onSavePersona={setPersona} 
        theme={theme} 
        onToggleTheme={() => setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)}
        activeModel={activeModel} 
        onSelectModel={setActiveModel} 
        language={language} 
        onSetLanguage={setLanguage} 
        onClearAllChats={handleClearAllChats} 
        onSetThemeMode={setTheme}
      />
      <RoleplayModal isOpen={isRoleplayModalOpen} onClose={() => setIsRoleplayModalOpen(false)} onStart={createRoleplaySession} language={language} />
      <LearningSetupModal isOpen={isLearningModalOpen} onClose={() => setIsLearningModalOpen(false)} onStart={createLearningSession} language={language} />
      <PromptLibraryModal isOpen={isPromptLibOpen} onClose={() => setIsPromptLibOpen(false)} language={language} onSelectPrompt={(p) => setInput(prev => prev + p)} />
      <ThemeLibraryModal isOpen={isThemeLibOpen} onClose={() => setIsThemeLibOpen(false)} activeThemeId={colorTheme.id} onSelectTheme={setColorTheme} language={language} />
      <VoiceOverlay isActive={isLiveMode} status={liveStatus} transcript={liveTranscript} onClose={stopLiveMode} emotion={currentEmotion} />

      <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          sessions={sessions} 
          currentSessionId={currentSessionId} 
          onSelectSession={(id) => { setCurrentSessionId(id); setShowCanvas(false); setCurrentEmotion('neutral'); }}
          onNewChat={createNewSession}
          onNewRoleplay={() => setIsRoleplayModalOpen(true)}
          onNewLearning={() => setIsLearningModalOpen(true)}
          onDeleteSession={deleteSession} 
          onToggleSave={toggleSessionSave} 
          theme={theme} 
          onToggleTheme={() => setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)} 
          onOpenSettings={() => setIsSettingsOpen(true)} 
          onOpenThemeLib={() => setIsThemeLibOpen(true)}
          language={language} 
          onStartLiveMode={startLiveMode}
      />

      <div className="flex-1 flex relative min-w-0 transition-colors duration-500 z-10">
         {/* MAIN CHAT AREA */}
         <div className={`flex flex-col h-full transition-all duration-300 ${showCanvas ? 'hidden md:flex md:w-1/2 border-r border-slate-200 dark:border-slate-800' : 'w-full'}`}>
            <header className={`absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-20 pointer-events-none transition-all duration-500`}>
            <div className="flex items-center gap-3 pointer-events-auto">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 shadow-sm"><Menu size={20} /></button>
                <div className="hidden md:flex flex-col">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    {currentSession?.title || 'Lunaris AI'}
                    {currentSession?.isRoleplay && <span className="text-[10px] bg-purple-500 text-white px-1.5 rounded uppercase tracking-wider font-bold">Story Mode</span>}
                    {currentSession?.isLearning && <span className="text-[10px] bg-emerald-500 text-white px-1.5 rounded uppercase tracking-wider font-bold">Learning</span>}
                </span>
                <div className="flex items-center gap-1.5">
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${activeModel === 'Luna-V' ? 'bg-blue-500' : activeModel === 'Luna-Deep' ? 'bg-purple-500' : activeModel === 'Luna-X' ? 'bg-orange-500' : activeModel === 'Lunaris-Mind' ? 'bg-indigo-500' : 'bg-rose-500'}`}></span>
                    <span className={`text-[11px] font-medium text-slate-500 dark:text-slate-400 ${activeModel === 'Lunaris-Mind' ? 'bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500 font-bold' : ''}`}>{activeModel}</span>
                    <WaveformVisualizer isActive={isLoading || !!speakingMessageId || isListening || isLiveMode} emotion={currentEmotion} />
                </div>
                </div>
            </div>

            <div className="pointer-events-auto flex gap-2 items-center">
                {/* Emotion Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500 shadow-lg ${EMOTION_THEMES[currentEmotion].border} ${EMOTION_THEMES[currentEmotion].color.replace('text', 'bg').replace('500', '100').replace('400', '100')} ${EMOTION_THEMES[currentEmotion].glow} dark:bg-opacity-20 backdrop-blur-md`}>
                    <ActiveEmotionIcon size={18} className={`${EMOTION_THEMES[currentEmotion].color} transition-transform duration-300 ${isLoading ? 'scale-110' : 'scale-100'}`} />
                </div>

                {currentSession?.isRoleplay && (
                    <button 
                        onClick={exportStory}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    >
                        <Download size={14} /> {language === 'ar' ? 'تصدير الرواية' : 'Export Novel'}
                    </button>
                )}
            </div>
            </header>

            <div ref={mainScrollRef} className="flex-1 overflow-y-auto scroll-smooth">
            {!currentSession || messages.length === 0 ? (
                <div className="min-h-full flex flex-col items-center justify-center p-6 text-center animate-fade-in max-w-2xl mx-auto">
                <div className="relative mb-8"><div className="w-24 h-24 bg-gradient-to-tr from-brand-500 to-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl rotate-3"><Sparkles className="text-white w-12 h-12" /></div></div>
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">{language === 'ar' ? 'كيف يمكنني مساعدتك اليوم؟' : 'How can I help you today?'}</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-lg mx-auto">
                    {language === 'ar' ? 'Lunaris جاهز للمساعدة في الكتابة، البرمجة، التحليل، وتوليد الوسائط.' : 'Lunaris is ready to help with writing, coding, analysis, and media generation.'}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                    <StarterCard 
                        icon={FileCode} 
                        title={language === 'ar' ? 'كتابة كود تطبيق' : 'Code a Web App'} 
                        desc={language === 'ar' ? 'أنشئ تطبيق قائمة مهام باستخدام React' : 'Create a Todo App using React & Tailwind'}
                        onClick={() => handleSendMessage("Create a modern Todo App using React and Tailwind CSS. Use the CodeBlock artifact.")} 
                    />
                    <StarterCard 
                        icon={GraduationCap} 
                        title={language === 'ar' ? 'بدء تعلم' : 'Start Learning'} 
                        desc={language === 'ar' ? 'تعلم لغة جديدة أو مادة دراسية' : 'Learn a new language or subject'}
                        onClick={() => setIsLearningModalOpen(true)} 
                    />
                    <StarterCard 
                        icon={Theater} 
                        title={language === 'ar' ? 'تقمص أدوار' : 'Roleplay Story'} 
                        desc={language === 'ar' ? 'ابدأ قصة تفاعلية جديدة' : 'Start an interactive storytelling session'}
                        onClick={() => setIsRoleplayModalOpen(true)} 
                    />
                    <StarterCard 
                        icon={Book} 
                        title={language === 'ar' ? 'مكتبة الأوامر' : 'Prompt Library'} 
                        desc={language === 'ar' ? 'تصفح الأوامر الجاهزة' : 'Browse curated prompts'}
                        onClick={() => setIsPromptLibOpen(true)} 
                    />
                </div>
                </div>
            ) : (
                <div className="w-full max-w-4xl mx-auto pt-24 pb-40 px-4 md:px-6 space-y-8">
                {currentSession.isRoleplay && currentSession.roleplayConfig && (
                    <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 mb-8 animate-fade-in">
                        <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wide text-xs">
                            <Theater size={14} /> Story Context
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{currentSession.roleplayConfig.characterName}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 italic">{currentSession.roleplayConfig.characterDescription}</p>
                    </div>
                )}
                
                {currentSession.isLearning && currentSession.learningConfig && (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 mb-8 animate-fade-in">
                        <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wide text-xs">
                            <GraduationCap size={14} /> Learning Journey
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{currentSession.learningConfig.topic}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Target Goal: {currentSession.learningConfig.goal}</p>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    // Determine Model Icon/Style for AI messages
                    const modelConfig = msg.role === 'model' && msg.modelUsed && MODEL_CONFIGS[msg.modelUsed] 
                        ? MODEL_CONFIGS[msg.modelUsed] 
                        : MODEL_CONFIGS['Luna-V']; // Default fallback

                    return (
                        <div key={msg.id} className="flex gap-4 md:gap-6 animate-slide-up group">
                        <div className="shrink-0 flex flex-col items-center">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-800' : currentSession.isRoleplay ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white' : currentSession.isLearning ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-gradient-to-br from-brand-500 to-indigo-600 text-white'}`}>
                                {msg.role === 'user' ? <User size={18} /> : currentSession.isRoleplay ? <Theater size={18} /> : currentSession.isLearning ? <GraduationCap size={18} /> : <Zap size={18} fill="currentColor" />}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-sm text-slate-900 dark:text-slate-200">
                                    {msg.role === 'user' ? 'You' : (currentSession.isRoleplay ? currentSession.roleplayConfig?.characterName : currentSession.isLearning ? 'AI Tutor' : persona.name)}
                                </span>
                                <span className="text-[10px] text-slate-400">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                
                                {msg.role === 'model' && !msg.isStreaming && (
                                    <button 
                                        onClick={() => speakMessage(msg.content, msg.id)}
                                        className={`ml-2 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${speakingMessageId === msg.id ? 'text-brand-500 animate-pulse' : 'text-slate-400'}`}
                                        title="Speak"
                                    >
                                        {speakingMessageId === msg.id ? <StopAudio size={12} /> : <Volume2 size={12} />}
                                    </button>
                                )}
                                
                                {msg.role === 'user' && (
                                    <button 
                                        onClick={() => handleEditMessage(msg.id, msg.content)}
                                        className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all tex
