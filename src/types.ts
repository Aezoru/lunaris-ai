export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'generated_image' | 'generated_video';
  mimeType: string;
  data: string;
  url?: string;
  prompt?: string;
  name?: string;
}

export interface GroundingChunk {
  web?: { uri: string; title: string; };
}

export interface GroundingMetadata {
  groundingChunks: GroundingChunk[];
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  attachments?: Attachment[];
  thoughtProcess?: string;
  groundingMetadata?: GroundingMetadata;
  suggestedReplies?: string[];
  modelUsed?: ModelType;
}

export interface RoleplayConfig {
  characterName: string;
  characterDescription: string;
  scenario: string;
  worldContext?: string;
}

export interface LearningConfig {
  topic: string;
  currentLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  goal: string;
  teachingStyle: 'Socratic' | 'Direct' | 'Practical'; 
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  isSaved?: boolean;
  isRoleplay?: boolean;
  roleplayConfig?: RoleplayConfig;
  isLearning?: boolean;
  learningConfig?: LearningConfig;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  DYNAMIC = 'dynamic',
}

export interface ColorTheme {
  id: string;
  name: string;
  colors: Record<number, string>;
}

export type ModelType = 'Luna-V' | 'Luna-X' | 'Luna-Deep' | 'Luna-O' | 'Lunaris-Mind';
export type Language = 'en' | 'ar';
export type Emotion = 'neutral' | 'happy' | 'angry' | 'sad' | 'curious' | 'anxious';

export interface Persona {
  name: string;
  tone: string;
  style: string;
  context: string;
  memory: string;
}

export interface PromptItem {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  isSystem?: boolean;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isPro?: boolean;
  lastSync?: number;
}
