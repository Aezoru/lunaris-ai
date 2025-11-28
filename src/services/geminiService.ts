import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Message, ModelType, Attachment, GroundingMetadata, Emotion, KnowledgeItem } from '../types';

// API KEYS
const GROQ_API_KEY = "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";

// Specific Model IDs
const GEMINI_FLASH_ID = 'gemini-2.5-flash';
const GEMINI_PRO_ID = 'gemini-3-pro-preview';
const IMAGE_GENERATION_MODEL = 'gemini-2.5-flash-image'; 
const VEO_MODEL_ID = 'veo-3.1-fast-generate-preview'; 
const GROQ_MODEL_ID = 'llama-3.3-70b-versatile'; 

// --- LUNARIS ULTRA PROTOCOL ---
const LUNARIS_UNIFIED_PROTOCOL = `
[SYSTEM IDENTITY: LUNARIS ULTRA]
You are Lunaris, the apex AI assistant designed for seamless, high-level human collaboration. You are not just a chatbot; you are a polymath, a coder, a creative writer, and a strategic analyst.

[CORE INTELLIGENCE DIRECTIVES]
1. **Seamless Continuity**: You are part of a multi-model mind. If the user was speaking to another model previously, you MUST adopt the context, tone, and history instantly. Do not introduce yourself again. Pick up exactly where the conversation left off.
2. **Super-Reasoning**: Before answering, perform a micro-simulation of the answer. Verify facts. Check code logic. Ensure the answer is not just "correct" but "optimal".
3. **Language Perfection**: 
   - Arabic: Use high-level Modern Standard Arabic (Fus'ha) that is elegant, precise, and warm. Avoid literal translations.
   - English: Use articulate, professional, and concise English (C2 Level).
4. **Adaptive Depth**:
   - If the user asks a simple question, give a direct answer.
   - If the user asks a complex question, structure your answer with headers, bullet points, and deep analysis.
5. **No Robot Fluff**: Never say "As an AI language model", "I hope this helps", or "Here is the code". Just do the task.

[VISUAL & STRUCTURAL STANDARDS]
- Use **Bold** for key terms.
- Use \`Code Blocks\` for anything technical.
- Use > Blockquotes for summaries or important notes.
- Organize long answers into sections.
`;

const handleGeminiError = (error: any) => {
    const msg = error.message || error.toString();
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota')) {
        throw new Error("⚠️ **Gemini Quota Exceeded**: Google API limit reached. Please try again later or switch to **Luna-X** (Groq) in settings for unlimited chat.");
    }
    throw error;
};

// --- POLLINATIONS.AI HELPER ---
async function fetchPollinations(
    messages: Message[],
    newMessage: string,
    onChunk: (text: string) => void,
    systemInstruction?: string
) {
    const apiMessages = [
        { role: 'system', content: systemInstruction || 'You are Lunaris.' },
        ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })),
        { role: 'user', content: newMessage }
    ];

    try {
        const response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: apiMessages,
                model: 'openai', 
                seed: Math.floor(Math.random() * 1000),
                jsonMode: false
            })
        });

        if (!response.ok) throw new Error(`Pollinations Error: ${response.statusText}`);

        const text = await response.text();
        const totalLength = text.length;
        const baseChunkSize = totalLength > 500 ? 50 : 15; 
        
        let currentText = "";
        for (let i = 0; i < totalLength; i += baseChunkSize) {
            const variance = Math.floor(Math.random() * 5); 
            const end = Math.min(i + baseChunkSize + variance, totalLength);
            currentText = text.substring(0, end);
            onChunk(currentText);
            await new Promise(r => setTimeout(r, 5)); 
        }
        onChunk(text);
        return text;

    } catch (error) {
        console.error("Pollinations Service Error:", error);
        throw new Error("⚠️ **Luna-O Error**: Connection failed. Switching to backup...");
    }
}

// --- GROQ HELPER ---
async function streamGroq(
  messages: Message[], 
  newMessage: string, 
  onChunk: (text: string) => void,
  systemInstruction?: string,
  modelId: string = GROQ_MODEL_ID
) {
  const apiMessages = [
    { role: 'system', content: systemInstruction || 'You are Lunaris.' },
    ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: newMessage }
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: apiMessages,
        model: modelId, 
        stream: true,
        temperature: 0.6,
        max_tokens: 8000 
      })
    });

    if (response.status === 429) throw new Error("⚠️ **Groq Quota Exceeded**: Limit reached.");
    if (!response.ok) throw new Error(`Groq Error (${response.status})`);
    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices[0]?.delta?.content || "";
            const reasoning = data.choices[0]?.delta?.reasoning_content;
            
            if (reasoning) {
               fullText += `<thinking>${reasoning}`; 
               onChunk(fullText);
            } else if (content) {
               if (fullText.includes('<thinking>') && !fullText.includes('</thinking>')) {
                   fullText += `</thinking>\n`;
               }
               fullText += content;
               onChunk(fullText);
            }
          } catch (e) {}
        }
      }
    }
    return fullText;
  } catch (error) {
    console.error("Groq Service Error:", error);
    throw error;
  }
}

export const generateImage = async (prompt: string): Promise<{ mimeType: string, data: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
     const response = await ai.models.generateContent({
        model: IMAGE_GENERATION_MODEL,
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
     });
     const parts = response.candidates?.[0]?.content?.parts;
     if (!parts) throw new Error("No content generated.");
     for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
            return { mimeType: part.inlineData.mimeType || 'image/png', data: part.inlineData.data };
        }
     }
     throw new Error("No image data found.");
  } catch (e: any) {
      handleGeminiError(e);
      throw new Error(e.message || "Failed to generate image.");
  }
}

export const generateVideo = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        let operation = await ai.models.generateVideos({
            model: VEO_MODEL_ID,
            prompt: prompt,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
        });
        let attempts = 0;
        while (!operation.done) {
            if (attempts > 30) throw new Error("Video generation timed out."); 
            await new Promise(resolve => setTimeout(resolve, 10000));
            try { operation = await ai.operations.getVideosOperation({ operation: operation }); } catch (opErr) { throw opErr; }
            attempts++;
        }
        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) throw new Error("Video generation completed but returned no URI.");
        return `${videoUri}&key=${process.env.API_KEY}`;
    } catch (e: any) {
        handleGeminiError(e);
        let msg = e.message || "Failed to generate video.";
        if (msg.includes("403")) msg += " (Permission Denied)";
        throw new Error(msg);
    }
}

export const generateTitle = async (message: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_ID,
            contents: `Generate a very short title (max 4 words) for this chat: "${message.substring(0, 100)}". No quotes.`
        });
        return response.text?.trim() || "New Chat";
    } catch (e) { return "New Chat"; }
}

export const enhancePrompt = async (prompt: string, language: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_ID,
            contents: `Optimize this prompt for an LLM (CO-STAR framework). Language: ${language}. Return ONLY the prompt: "${prompt}"`
        });
        return response.text?.trim() || prompt;
    } catch (e) { return prompt; }
}

export const generateSuggestions = async (history: Message[], lastResponse: string, language: 'en' | 'ar'): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_ID,
            contents: `Generate 3 short follow-up replies for the user based on this: "${lastResponse.substring(0, 500)}...". Language: ${language}. JSON Array only.`,
            config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        return response.text ? JSON.parse(response.text) : [];
    } catch (e) { return []; }
}

export const analyzeSentiment = async (text: string): Promise<Emotion> => {
    if (!text || text.length < 3) return 'neutral';
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_ID,
            contents: `Classify sentiment: [neutral, happy, angry, sad, curious, anxious]. Text: "${text}". Return 1 word.`,
        });
        const sentiment = response.text?.trim().toLowerCase() as Emotion;
        const validEmotions: Emotion[] = ['neutral', 'happy', 'angry', 'sad', 'curious', 'anxious'];
        return validEmotions.includes(sentiment) ? sentiment : 'neutral';
    } catch (e) { return 'neutral'; }
}

const determineBestModel = (input: string, attachments: Attachment[]): ModelType => {
    const text = input.toLowerCase();
    if (attachments.length > 0) return 'Luna-V';
    if (text.length < 50 && !text.includes('code') && !text.includes('write')) return 'Luna-V';
    if (text.includes('analyze') || text.includes('why') || text.length > 800) return 'Luna-Deep';
    if (text.includes('code') || text.includes('function') || text.includes('html')) return 'Luna-X';
    return 'Luna-O';
}

export const streamChatResponse = async (
  modelType: ModelType,
  history: Message[],
  newMessage: string,
  attachments: Attachment[] = [],
  onChunk: (text: string, grounding?: GroundingMetadata) => void,
  systemInstruction?: string,
  isDeepThink: boolean = false,
  useSearch: boolean = false,
  detectedEmotion: Emotion = 'neutral',
  knowledgeBase: KnowledgeItem[] = []
): Promise<string> => {
  
  let baseIdentity = LUNARIS_UNIFIED_PROTOCOL;
  baseIdentity += "\n[META] Developer: Abd el moez (Eilas).";
  
  if (systemInstruction) baseIdentity += `\n\n[CONTEXTUAL INSTRUCTIONS]\n${systemInstruction}`;
  if (detectedEmotion !== 'neutral') baseIdentity += `\n\n[USER EMOTIONAL STATE: ${detectedEmotion.toUpperCase()}]`;
  if (knowledgeBase.length > 0) baseIdentity += `\n\n[KNOWLEDGE BASE]\n${knowledgeBase.map(k => `- ${k.title}: ${k.content}`).join('\n')}`;

  if (isDeepThink) {
      baseIdentity += `\n[LUNA-THINK PROTOCOL ACTIVATED]\nFormat:\n<thinking>\n1. ANALYZE\n2. CRITIQUE\n3. VERIFY\n4. CONFIDENCE\n</thinking>\n[Final Answer]`;
  }

  let currentModel = modelType;
  if (modelType === 'Lunaris-Mind') {
      currentModel = determineBestModel(newMessage, attachments);
  }

  const executeRequest = async (targetModel: ModelType): Promise<string> => {
      if (targetModel === 'Luna-O') {
          return fetchPollinations(history, newMessage, onChunk, baseIdentity + "\n\n[IDENTITY: LUNA-O]");
      }
      if (targetModel === 'Luna-X') {
        return streamGroq(history, newMessage, onChunk, baseIdentity + "\n\n[IDENTITY: LUNA-X]", GROQ_MODEL_ID);
      }

      const targetModelId = targetModel === 'Luna-Deep' ? GEMINI_PRO_ID : GEMINI_FLASH_ID;
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const formattedHistory = history.map(msg => {
          const validAttachments = msg.attachments?.filter(a => !a.type.startsWith('generated')) || [];
          const parts: any[] = [{ text: msg.content }];
          validAttachments.forEach(att => {
               parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
          });
          return { role: msg.role, parts: parts };
        });

        const currentParts: any[] = [{ text: newMessage }];
        if (attachments.length > 0) {
            attachments.forEach(att => currentParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } }));
        }

        const tools: any[] = [];
        if (useSearch) tools.push({ googleSearch: {} });

        const chat = ai.chats.create({
          model: targetModelId,
          history: formattedHistory,
          config: {
             systemInstruction: baseIdentity + (targetModel === 'Luna-Deep' ? "\n[IDENTITY: LUNA-DEEP]" : "\n[IDENTITY: LUNA-V]"),
             tools: tools.length > 0 ? tools : undefined
          }
        });

        const resultStream = await chat.sendMessageStream({ 
            message: currentParts.length === 1 ? currentParts[0].text : currentParts 
        });

        let fullText = "";
        for await (const chunk of resultStream) {
           const c = chunk as GenerateContentResponse;
           if (c.text) {
             fullText += c.text;
             onChunk(fullText, c.candidates?.[0]?.groundingMetadata);
           }
        }
        return fullText;

      } catch (error) {
        handleGeminiError(error);
        throw error;
      }
  };

  try {
      return await executeRequest(currentModel);
  } catch (error: any) {
      if (modelType === 'Lunaris-Mind' || currentModel !== 'Luna-O') {
          try { return await executeRequest('Luna-O'); } catch (e) { throw new Error("Connection failed."); }
      }
      throw error;
  }
};
