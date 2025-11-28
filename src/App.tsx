import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Mic, MicOff, Loader2, ArrowUp, X, FileText, Paperclip, 
  Volume2, VolumeX, Pencil, Lightbulb, Sparkles, ChevronDown, ChevronRight,
  User, BookOpen, Heart, Smile, Meh, Frown, Angry, Settings,
  MessageSquare, History, Trash2, Plus, LogOut,
} from 'lucide-react';
import { generateId, saveChatSession, deleteChatSession, getChatSessions, generateTitle, analyzeSentiment, generateSuggestions, generateImage, generateVideo } from '@/lib/api';
import { streamChatResponse } from '@/lib/stream';
import { ChatSession, Message, Attachment, Emotion, RoleplayConfig, LearningConfig } from '@/types';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import CanvasPanel from '@/components/CanvasPanel';
import MagicMenu from '@/components/MagicMenu';
import SlashMenu from '@/components/SlashMenu';
import { EMOTION_THEMES, MODEL_CONFIGS } from '@/lib/constants';

// Define the main component props
interface AppProps {
  initialLanguage: 'ar' | 'en';
  initialPersona: any; // Replace 'any' with a proper type if available
}

const App: React.FC<AppProps> = ({ initialLanguage, initialPersona }) => {
  // --- State Management ---
  const [language, setLanguage] = useState<'ar' | 'en'>(initialLanguage);
  const [persona, setPersona] = useState(initialPersona);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [isDeepThink, setIsDeepThink] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [activeModel, setActiveModel] = useState('Lunaris-Mind');
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');
  const [showCanvas, setShowCanvas] = useState(false);
  const [canvasContent, setCanvasContent] = useState('');
  const [canvasType, setCanvasType] = useState<'code' | 'mermaid' | 'd2' | 'plantuml'>('code');
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<string | null>(null); // For RAG

  // --- Live Mode State ---
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');

  // --- Refs ---
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const liveRecognitionRef = useRef<any>(null);
  const liveSilenceTimer = useRef<any>(null);

  // --- Derived State ---
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const modelConfig = MODEL_CONFIGS[activeModel] || MODEL_CONFIGS['Lunaris-Mind'];

  // --- Effects ---
  useEffect(() => {
    const loadSessions = async () => {
      const loadedSessions = await getChatSessions();
      setSessions(loadedSessions);
      if (loadedSessions.length > 0) {
        setCurrentSessionId(loadedSessions[0].id);
      }
    };
    loadSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages.length]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    if (isLiveMode) {
        // Stop all other listening/speaking when live mode starts
        if (isListening) toggleListening();
        if (speakingMessageId) window.speechSynthesis.cancel();
    } else {
        // Cleanup live mode resources
        if (liveRecognitionRef.current) liveRecognitionRef.current.stop();
        clearTimeout(liveSilenceTimer.current);
    }
  }, [isLiveMode]);

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
            ? `أهلاً بك في وضع التعلم! أنا معلمك الخبير في **${config.topic}**. هدفنا هو أن تصل إلى **${config.goal}** من مستواك الحالي **${config.currentLevel}**. لنبدأ!`
            : `Welcome to Learning Mode! I'm your expert tutor in **${config.topic}**. Our goal is for you to reach **${config.goal}** from your current level **${config.currentLevel}**. Let's begin!`,
        timestamp: Date.now()
    };

    const newSession: ChatSession = {
        id: generateId(),
        title: language === 'ar' ? `تعلم: ${config.topic}` : `Learn: ${config.topic}`,
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
    setCurrentEmotion('neutral');
  };

  const selectSession = (id: string) => {
    setCurrentSessionId(id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    setShowCanvas(false);
  };

  const deleteSession = async (id: string) => {
    await deleteChatSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(sessions.length > 1 ? sessions.filter(s => s.id !== id)[0]?.id || null : null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    if (value.startsWith('/')) {
        setShowSlashMenu(true);
    } else {
        setShowSlashMenu(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEditMessage = (msgId: string, content: string) => {
    if (!currentSessionId) return;
    
    // 1. Remove the edited message and all subsequent messages
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;

    const msgIndex = session.messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    const newMessages = session.messages.slice(0, msgIndex);

    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: newMessages } : s));
    
    // 2. Set the content of the edited message back to the input field
    setInput(content);
    
    // 3. Scroll to the bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleGenerateMedia = async (type: 'image' | 'video', prompt: string) => {
      if (isGeneratingMedia) return;
      setIsGeneratingMedia(true);
      
      const userMsg: Message = {
          id: generateId(),
          role: 'user',
          content: language === 'ar' ? `توليد ${type === 'image' ? 'صورة' : 'فيديو'} بالوصف: ${prompt}` : `Generate ${type} with prompt: ${prompt}`,
          timestamp: Date.now(),
          isMediaGeneration: true
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
                  <div className="p-4 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                      {content}
                  </div>
              )}
          </div>
      );
  };
  // --- JSX Rendering ---
  return (
    <div className={`flex h-screen overflow-hidden ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
      
      {/* Sidebar */}
      <div className={`flex-shrink-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : language === 'ar' ? 'translate-x-full' : '-translate-x-full'} md:translate-x-0 flex flex-col z-40 absolute md:relative h-full`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <h1 className="text-xl font-bold text-brand-600 dark:text-brand-400 flex items-center gap-2">
            <MessageSquare size={24} /> Lunaris AI
          </h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-slate-500 dark:text-slate-400 hover:text-brand-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <button 
            onClick={createNewSession} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/30"
          >
            <Plus size={20} />
            {language === 'ar' ? 'محادثة جديدة' : 'New Chat'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
            <History size={14} /> {language === 'ar' ? 'السجل' : 'History'}
          </h2>
          {sessions.map(session => (
            <div 
              key={session.id} 
              onClick={() => selectSession(session.id)}
              className={`p-3 rounded-xl cursor-pointer transition-all group relative ${currentSessionId === session.id ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-semibold' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <p className="text-sm truncate pr-8">{session.title}</p>
              <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                  title={language === 'ar' ? 'حذف' : 'Delete'}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <User size={16} />
              <span>{language === 'ar' ? 'المستخدم' : 'User'}</span>
            </div>
            <span className="font-medium">Abd el moez</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Settings size={16} />
              <span>{language === 'ar' ? 'الإعدادات' : 'Settings'}</span>
            </div>
            <button className="text-brand-600 hover:text-brand-700 font-medium">
              {language === 'ar' ? 'تعديل' : 'Edit'}
            </button>
          </div>
          <button className="w-full flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
            <LogOut size={16} />
            {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col relative transition-all duration-300 ${showCanvas ? 'md:w-1/2' : 'md:w-full'}`}>
        
        {/* Header */}
        <header className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-1 text-slate-500 dark:text-slate-400 hover:text-brand-600">
              <MessageSquare size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px] md:max-w-none">
              {currentSession?.title || (language === 'ar' ? 'محادثة جديدة' : 'New Chat')}
            </h2>
            {currentSession?.isRoleplay && <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">{language === 'ar' ? 'لعب أدوار' : 'Roleplay'}</span>}
            {currentSession?.isLearning && <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{language === 'ar' ? 'تعلم' : 'Learning'}</span>}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Live Mode Toggle */}
            <button 
                onClick={isLiveMode ? stopLiveMode : startLiveMode}
                className={`p-2 rounded-full transition-all ${isLiveMode ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                title={language === 'ar' ? 'وضع البث المباشر' : 'Live Mode'}
            >
                <Mic size={20} />
            </button>

            {/* Model Selector */}
            <select 
                value={activeModel} 
                onChange={(e) => setActiveModel(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 rounded-lg p-2 focus:ring-brand-500 focus:border-brand-500"
            >
                {Object.keys(MODEL_CONFIGS).map(key => (
                    <option key={key} value={key}>{MODEL_CONFIGS[key].label}</option>
                ))}
            </select>
          </div>
        </header>

        {/* Live Mode Status Bar */}
        {isLiveMode && (
            <div className={`flex-shrink-0 p-2 text-center text-sm font-medium transition-all duration-300 ${liveStatus === 'listening' ? 'bg-green-500 text-white' : liveStatus === 'thinking' ? 'bg-yellow-500 text-slate-900' : liveStatus === 'speaking' ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                {liveStatus === 'listening' && (
                    <div className="flex items-center justify-center gap-2">
                        <Mic size={16} className="animate-pulse" />
                        {language === 'ar' ? `استماع... ${liveTranscript}` : `Listening... ${liveTranscript}`}
                    </div>
                )}
                {liveStatus === 'thinking' && (
                    <div className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        {language === 'ar' ? 'تفكير...' : 'Thinking...'}
                    </div>
                )}
                {liveStatus === 'speaking' && (
                    <div className="flex items-center justify-center gap-2">
                        <Volume2 size={16} className="animate-bounce" />
                        {language === 'ar' ? `تحدث: ${liveTranscript}` : `Speaking: ${liveTranscript}`}
                    </div>
                )}
                {liveStatus === 'idle' && (
                    <div className="flex items-center justify-center gap-2">
                        <MicOff size={16} />
                        {language === 'ar' ? 'وضع البث المباشر متوقف' : 'Live Mode Idle'}
                    </div>
                )}
            </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 dark:bg-slate-900/90">
            {!currentSession ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
                    <MessageSquare size={48} className="mb-4 text-brand-500" />
                    <h3 className="text-xl font-semibold">{language === 'ar' ? 'أهلاً بك في Lunaris AI' : 'Welcome to Lunaris AI'}</h3>
                    <p className="mt-2">{language === 'ar' ? 'ابدأ محادثة جديدة أو اختر واحدة من السجل.' : 'Start a new chat or select one from the history.'}</p>
                </div>
            ) : (
                <div className="pb-32">
                {currentSession.messages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    const modelConfig = MODEL_CONFIGS[msg.modelUsed || 'Lunaris-Mind'] || MODEL_CONFIGS['Lunaris-Mind'];
                    
                    return (
                        <div 
                            key={msg.id} 
                            className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}
                            dir={language === 'ar' ? 'rtl' : 'ltr'}
                        >
                            <div className={`max-w-3xl p-4 rounded-xl shadow-md transition-all ${isUser 
                                ? 'bg-brand-600 text-white rounded-br-none' 
                                : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700'
                            }`}>
                                
                                {/* Header/Actions */}
                                <div className={`flex items-center ${isUser ? 'justify-end' : 'justify-start'} mb-2 text-xs font-semibold ${isUser ? 'text-brand-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {isUser ? (
                                        <div className="flex items-center gap-1">
                                            <User size={14} />
                                            <span>{language === 'ar' ? 'أنت' : 'You'}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            <modelConfig.icon size={14} />
                                            <span>{modelConfig.label}</span>
                                        </div>
                                    )}
                                    
                                    {/* Actions */}
                                    {!isUser && !msg.isStreaming && (
                                        <button 
                                            onClick={() => speakMessage(msg.content, msg.id)}
                                            className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-slate-400 hover:text-brand-500"
                                            title={speakingMessageId === msg.id ? (language === 'ar' ? 'إيقاف الصوت' : 'Stop Speaking') : (language === 'ar' ? 'قراءة الرسالة' : 'Read Message')}
                                        >
                                            {speakingMessageId === msg.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                        </button>
                                    )}
                                    
                                    {msg.role === 'user' && (
                                        <button 
                                            onClick={() => handleEditMessage(msg.id, msg.content)}
                                            className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400 hover:text-brand-500"
                                            title={language === 'ar' ? 'تعديل الرسالة' : 'Edit Message'}
                                        >
                                            <Pencil size={12} />
                                        </button>
                                    )}
                                </div>
                                
                                {msg.attachments?.map(att => (
                                    <div key={att.id} className="mb-3 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 w-fit">
                                        {att.type === 'image' && <img src={att.url} className="max-w-[200px] object-cover" />}
                                        {att.type === 'generated_image' && (
                                            <div className="relative group">
                                                <img src={att.url} className="max-w-[300px] md:max-w-[400px] object-cover rounded-lg shadow-lg" />
                                                <a href={att.url} download="generated_lunaris.png" className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-md text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs">
                                                    <ArrowUp size={12} className="rotate-180" /> Save
                                                </a>
                                            </div>
                                        )}
                                        {att.type === 'generated_video' && <video src={att.url} controls className="max-w-[300px] rounded-lg shadow-lg" />}
                                        {att.type === 'audio' && <audio src={att.url} controls className="max-w-[250px]" />}
                                        {att.type === 'file' && (
                                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                <div className="p-2 bg-white dark:bg-slate-700 rounded-lg text-brand-500"><FileText size={20} /></div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 max-w-[200px] truncate">{att.name}</p>
                                                    <p className="text-xs text-slate-400 uppercase">{att.mimeType.split('/')[1] || 'FILE'}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {msg.thoughtProcess && <ThinkingBlock content={msg.thoughtProcess} />}
                                
                                {msg.role === 'model' 
                                    ? <MarkdownRenderer content={msg.content} groundingMetadata={msg.groundingMetadata} isRTL={language === 'ar'} onOpenCanvas={handleOpenCanvas} />
                                    : <div className="text-[15px] md:text-base text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-medium">{msg.content}</div>
                                }
                                
                                {/* MODEL BADGE */}
                                {msg.role === 'model' && msg.modelUsed && !msg.isStreaming && (
                                    <div className="mt-2 flex">
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${modelConfig.color} border border-transparent dark:border-white/5`}>
                                            <modelConfig.icon size={10} strokeWidth={3} />
                                            {msg.modelUsed === 'Lunaris-Mind' ? 'Lunaris Mind (Auto)' : modelConfig.label}
                                        </div>
                                    </div>
                                )}

                                {msg.suggestedReplies && msg.suggestedReplies.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3 animate-fade-in">
                                        {msg.suggestedReplies.map((reply, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSendMessage(reply)}
                                                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:border-brand-200 dark:hover:border-brand-800 transition-all text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
                                            >
                                                <Lightbulb size={12} className="text-brand-500" />
                                                {reply}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                {msg.isStreaming && <div className="flex gap-1 mt-2"><span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce delay-100"></span><span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce delay-200"></span></div>}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} className="h-4" />
                </div>
            )}
            </div>

            {/* Input Area */}
            <div className={`absolute bottom-6 ${showCanvas ? 'left-0 right-0 md:right-auto md:w-full' : 'left-0 right-0'} px-4 z-30 pointer-events-none`}>
            <div className="max-w-3xl mx-auto pointer-events-auto relative">
                
                {/* Slash Menu */}
                {showSlashMenu && <SlashMenu />}

                {attachments.length > 0 && (
                    <div className="flex gap-2 mb-2 overflow-x-auto bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-md p-2 rounded-xl border border-slate-200 dark:border-slate-700/50 w-fit">
                        {attachments.map((att) => (
                        <div key={att.id} className="relative w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg border flex items-center justify-center shrink-0 overflow-hidden">
                            {att.type === 'image' ? <img src={att.url} className="w-full h-full object-cover" /> : 
                            att.type === 'file' ? <FileText size={20} className="text-brand-500" /> : <Paperclip size={16} />}
                            <button onClick={() => removeAttachment(att.id)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10} /></button>
                        </div>
                        ))}
                    </div>
                )}

                <div className="flex items-end gap-2">
                    <div className="relative">
                        {isMenuOpen && (
                            <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                            <MagicMenu />
                            </>
                        )}
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)} 
                            className={`p-3.5 rounded-2xl transition-all shadow-md ${isMenuOpen || isDeepThink || useSearch ? 'bg-brand-600 text-white shadow-brand-500/30' : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                        >
                            <Plus size={24} className={`transition-transform duration-300 ${isMenuOpen ? 'rotate-45' : ''}`} />
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,audio/*,.pdf,.txt,.csv,.js,.py,.json" onChange={handleFileUpload} />
                    </div>

                    <div className={`flex-1 relative bg-white dark:bg-[#1E293B] rounded-2xl border transition-all duration-500 shadow-xl dark:shadow-none backdrop-blur-sm ${currentSession?.isRoleplay ? 'border-purple-200 dark:border-purple-900/40 shadow-purple-500/10' : currentSession?.isLearning ? 'border-emerald-200 dark:border-emerald-900/40 shadow-emerald-500/10' : `${EMOTION_THEMES[currentEmotion].border} ${EMOTION_THEMES[currentEmotion].ring} ${EMOTION_THEMES[currentEmotion].glow}`}`}>
                        <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={isGeneratingMedia ? "Describe media..." : (language === 'ar' ? "تحدث مع Lunaris... (جرب / للأوامر)" : "Message Lunaris... (Try / for commands)")}
                        className={`w-full max-h-[400px] bg-transparent border-none outline-none resize-none py-3.5 px-4 text-slate-900 dark:text-slate-100 placeholder-slate-400 min-h-[56px] ${language === 'ar' ? 'pl-12' : 'pr-12'}`} 
                        rows={1}
                        dir="auto"
                        />
                        
                        <div className={`absolute bottom-2 ${language === 'ar' ? 'left-2' : 'right-2'} flex items-center gap-1`}>
                            <button 
                                onClick={toggleListening} 
                                className={`p-2 rounded-lg transition-colors ${isListening ? 'text-red-500 animate-pulse bg-red-50 dark:bg-red-900/20' : 'text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                                title={language === 'ar' ? 'تحويل الصوت لنص' : 'Voice to Text'}
                            >
                                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={() => handleSendMessage()} 
                        disabled={(!input.trim() && attachments.length === 0) || isLoading || isGeneratingMedia} 
                        className={`p-3.5 rounded-2xl flex items-center justify-center transition-all shadow-md ${(!input.trim() && attachments.length === 0) || isLoading || isGeneratingMedia ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : currentSession?.isRoleplay ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/30' : currentSession?.isLearning ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30' : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/30'}`}
                    >
                        {isLoading || isGeneratingMedia ? <Loader2 size={24} className="animate-spin" /> : <ArrowUp size={24} />}
                    </button>
                </div>
            </div>
            </div>
         </div>

         {/* CANVAS PANEL */}
         {showCanvas && (
             <div className="absolute inset-0 z-50 md:relative md:z-auto md:w-1/2 h-full shadow-2xl md:shadow-none">
                 <CanvasPanel content={canvasContent} type={canvasType} onClose={() => setShowCanvas(false)} />
             </div>
         )}
      </div>
    </div>
  );
};

export default App;
