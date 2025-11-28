import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ChatSession, PromptItem, KnowledgeItem } from '../types';

interface LunarisDB extends DBSchema {
  chats: { key: string; value: ChatSession; indexes: { 'by-date': number }; };
  prompts: { key: string; value: PromptItem; };
  knowledge: { key: string; value: KnowledgeItem; };
}

const DB_NAME = 'lunaris-ai-db';
const CHAT_STORE = 'chats';
const PROMPT_STORE = 'prompts';
const KNOWLEDGE_STORE = 'knowledge';

let dbPromise: Promise<IDBPDatabase<LunarisDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<LunarisDB>(DB_NAME, 3, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(CHAT_STORE)) {
          const store = db.createObjectStore(CHAT_STORE, { keyPath: 'id' });
          store.createIndex('by-date', 'createdAt');
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains(PROMPT_STORE)) {
           db.createObjectStore(PROMPT_STORE, { keyPath: 'id' });
        }
        if (oldVersion < 3 && !db.objectStoreNames.contains(KNOWLEDGE_STORE)) {
           db.createObjectStore(KNOWLEDGE_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const saveChatSession = async (session: ChatSession) => {
  const db = await initDB();
  await db.put(CHAT_STORE, session);
};

export const getChatSessions = async (): Promise<ChatSession[]> => {
  const db = await initDB();
  const sessions = await db.getAllFromIndex(CHAT_STORE, 'by-date');
  return sessions.reverse();
};

export const deleteChatSession = async (id: string) => {
  const db = await initDB();
  await db.delete(CHAT_STORE, id);
};

export const clearAllChats = async () => {
  const db = await initDB();
  await db.clear(CHAT_STORE);
};

export const exportDatabase = async (): Promise<string> => {
    const sessions = await getChatSessions();
    const prompts = await getPrompts();
    const knowledge = await getKnowledge();
    return JSON.stringify({ sessions, prompts, knowledge }, null, 2);
};

export const importDatabase = async (jsonString: string): Promise<boolean> => {
    try {
        const data = JSON.parse(jsonString);
        const sessions = Array.isArray(data) ? data : data.sessions || [];
        const prompts = data.prompts || [];
        const knowledge = data.knowledge || [];
        
        const db = await initDB();
        const tx = db.transaction([CHAT_STORE, PROMPT_STORE, KNOWLEDGE_STORE], 'readwrite');
        
        for (const session of sessions) await tx.objectStore(CHAT_STORE).put(session);
        for (const prompt of prompts) await tx.objectStore(PROMPT_STORE).put(prompt);
        if (knowledge.length > 0) {
            for (const item of knowledge) await tx.objectStore(KNOWLEDGE_STORE).put(item);
        }
        await tx.done;
        return true;
    } catch (e) {
        console.error("Import failed", e);
        return false;
    }
}

export const savePrompt = async (prompt: PromptItem) => {
    const db = await initDB();
    await db.put(PROMPT_STORE, prompt);
}

export const getPrompts = async (): Promise<PromptItem[]> => {
    const db = await initDB();
    return await db.getAll(PROMPT_STORE);
}

export const deletePrompt = async (id: string) => {
    const db = await initDB();
    await db.delete(PROMPT_STORE, id);
}

export const saveKnowledge = async (item: KnowledgeItem) => {
    const db = await initDB();
    await db.put(KNOWLEDGE_STORE, item);
}

export const getKnowledge = async (): Promise<KnowledgeItem[]> => {
    const db = await initDB();
    return await db.getAll(KNOWLEDGE_STORE);
}

export const deleteKnowledge = async (id: string) => {
    const db = await initDB();
    await db.delete(KNOWLEDGE_STORE, id);
}
