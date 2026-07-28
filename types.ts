
export type PracticeMode = 'Lección Práctica' | 'Simulador de Llamada' | 'Simulador de Chat';

export type AiRole = 'Asesor' | 'Cliente';

export type VoiceName = 'Miguel' | 'Ismael' | 'Diego' | 'Andrea' | 'Sonia' | 'Angela';

export interface TranscriptTurn {
  speaker: 'user' | 'ai';
  text: string;
}

export type ConversationStatus = 'idle' | 'listening' | 'speaking' | 'connecting' | 'thinking' | 'evaluating';

export interface UploadedFile {
  name: string;
  content: string;
  type: string;
}

// Auth & Admin Types
export type UserRole = 'admin' | 'user';

export interface Company {
  id: string;
  name: string;
  documents: UploadedFile[];
  logoDataUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  cedula: string;
  role: UserRole;
  companyId?: string; // If undefined AND role is admin, it's a Super Admin
}

export interface EvaluationMetrics {
  apertura: number;
  descubrimiento: number;
  manejoObjeciones: number;
  claridad: number;
  cierre: number;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  closingStatus: 'Cerrada' | 'No Cerrada' | 'En Proceso';
  metrics?: EvaluationMetrics;
}

export interface Report extends EvaluationResult {
    id: string;
    userId: string;
    userName: string;
    companyId: string;
    date: string;
    durationSeconds: number;
    transcriptSample?: string;
    transcriptFull?: string;
}

export type Theme = 'dark' | 'light';
