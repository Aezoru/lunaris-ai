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
                                        className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400 hover:text-brand-500"
                                        title={language === 'ar' ? 'ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø±Ø³Ø§Ù„Ø©' : 'Edit Message'}
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
                        placeholder={isGeneratingMedia ? "Describe media..." : (language === 'ar' ? "ØªØ­Ø¯Ø« Ù…Ø¹ Lunaris... (Ø¬Ø±Ø¨ / Ù„Ù„Ø£ÙˆØ§Ù…Ø±)" : "Message Lunaris... (Try / for commands)")}
                        className={`w-full max-h-[400px] bg-transparent border-none outline-none resize-none py-3.5 px-4 text-slate-900 dark:text-slate-100 placeholder-slate-400 min-h-[56px] ${language === 'ar' ? 'pl-12' : 'pr-12'}`} 
                        rows={1}
                        dir="auto"
                        />
                        
                        <div className={`absolute bottom-2 ${language === 'ar' ? 'left-2' : 'right-2'} flex items-center gap-1`}>
                            <button 
                                onClick={toggleListening} 
                                className={`p-2 rounded-lg transition-colors ${isListening ? 'text-red-500 animate-pulse bg-red-50 dark:bg-red-900/20' : 'text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                                title={language === 'ar' ? 'ØªØ­ÙˆÙŠÙ„ Ø§Ù„ØµÙˆØª Ù„Ù†Øµ' : 'Voice to Text'}
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
