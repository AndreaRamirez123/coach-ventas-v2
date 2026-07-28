
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { PracticeMode, TranscriptTurn, VoiceName, UploadedFile, AiRole, User, EvaluationResult, Theme, Report } from '../types';
import useLiveConversation from '../hooks/useLiveConversation';
import { decode, decodeAudioData } from '../services/audioUtils';
import Controls from './Controls';
import Transcript from './Transcript';
import StatusIndicator from './StatusIndicator';
import TextInput from './TextInput';
import EvaluationModal from './EvaluationModal';
import Header from './Header';
import Sidebar from './Sidebar';
import { useLanguage } from '../context/LanguageContext';

interface SalesSimulatorProps {
  currentUser: User;
  documents: UploadedFile[];
  onLogout: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onSaveReport: (report: Report) => void;
  companyId: string;
  companyBrand?: { name: string; logoDataUrl?: string; primaryColor?: string; secondaryColor?: string; };
}

const CHAT_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
const EVAL_MODEL = 'gemini-2.5-flash';
const RUNTIME_API_KEY = (import.meta as any)?.env?.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY || '';

const withTimeout = async <T,>(promise: Promise<T>, ms = 12000): Promise<T> => {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
};

const generateChatWithFallback = async (ai: GoogleGenAI, params: any): Promise<any> => {
  let lastError: any = null;
  for (const model of CHAT_MODELS) {
    try {
      return await withTimeout(ai.models.generateContent({ ...params, model }), 12000);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('No chat model available');
};

const pickVariant = (arr: string[], seed: string) => {
  const n = Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  return arr[n % arr.length];
};

const localCoachReply = (msg: string, role: AiRole, company?: string, turnCount = 0) => {
  const m = (msg || '').toLowerCase();
  const c = company || 'la empresa';
  const seed = `${m}-${role}-${turnCount}-${Date.now()}`;

  if (role === 'Cliente') {
    if (m.includes('precio') || m.includes('valor') || m.includes('cuánto')) {
      return pickVariant([
        'Como cliente: dame precio final, qué incluye y forma de pago.',
        'Como cliente: necesito inversión total y opciones de pago antes de seguir.',
        'Como cliente: aclárame el costo completo y si hay cargos adicionales.'
      ], seed);
    }
    if (m.includes('tiempo') || m.includes('entrega') || m.includes('cuándo')) {
      return pickVariant([
        'Como cliente: ¿en qué fecha exacta empiezan y cuándo veo resultados?',
        'Como cliente: necesito cronograma claro de implementación.',
        'Como cliente: dime tiempos reales de entrega y puesta en marcha.'
      ], seed);
    }
    return pickVariant([
      `Como cliente de ${c}: me interesa, pero aún no veo suficiente valor para decidir hoy.`,
      `Como cliente de ${c}: suena bien, pero necesito más evidencia para avanzar.`,
      `Como cliente de ${c}: tengo dudas; convénceme con beneficios concretos.`
    ], seed);
  }

  if (m.includes('hola') || m.includes('buenas')) {
    return pickVariant([
      `Como asesor de ${c}: gracias por escribir. ¿Qué objetivo comercial quieres resolver hoy?`,
      `Como asesor de ${c}: bienvenido. Cuéntame tu situación y te propongo un plan de acción.`,
      `Como asesor de ${c}: perfecto, iniciemos. ¿Cuál es tu prioridad ahora mismo?`
    ], seed);
  }
  if (m.includes('ok') || m.includes('listo') || m.includes('dale')) {
    return pickVariant([
      `Perfecto. Como asesor de ${c}, empecemos con diagnóstico rápido y cierro con siguiente paso.`,
      `Excelente. Como asesor de ${c}, voy a estructurar propuesta corta y acción inmediata.`,
      `Listo. Como asesor de ${c}, primero definimos objetivo y luego oferta concreta.`
    ], seed);
  }
  return pickVariant([
    `Como asesor de ${c}: con lo que me dices, te recomiendo un plan corto con cierre accionable.`,
    `Como asesor de ${c}: veo oportunidad en ajustar mensaje, propuesta y cierre comercial.`,
    `Como asesor de ${c}: vamos a concretar diagnóstico, oferta y próximo paso hoy.`
  ], seed);
};

const RANDOM_TOPICS = [

    "Venta de Seguros de Vida a un padre primerizo",
    "Cliente furioso por cobro indebido en tarjeta de crédito",
    "Venta de Software SaaS a una pequeña empresa",
    "Agente inmobiliario mostrando un departamento costoso",
    "Venta de auto usado con detalles mecánicos",
    "Cliente indeciso comprando un plan de gimnasio anual",
    "Negociación de precio por servicios de consultoría",
    "Venta de paquete turístico de lujo a pareja joven",
    "Soporte técnico para internet lento (cliente frustrado)",
    "Venta de cursos de inglés online",
    "Venta de paneles solares a un dueño de casa escéptico",
    "Cliente solicitando reembolso por un producto defectuoso",
    "Ofreciendo un upgrade de tarjeta de crédito a un cliente actual",
    "Venta de servicios de marketing digital a un negocio local",
    "Retención de cliente que quiere cancelar su suscripción de TV cable",
    "Venta de equipo médico especializado a un administrador de hospital",
    "Resolución de queja por retraso en entrega de paquete importante",
    "Venta de membresía premium en un club de golf exclusivo",
    "Ofreciendo servicios de ciberseguridad tras una brecha de datos",
    "Venta de maquinaria industrial pesada con financiamiento"
];

export default function SalesSimulator({ 
    currentUser, 
    documents, 
    onLogout, 
    theme, 
    onToggleTheme, 
    onSaveReport,
    companyId,
    companyBrand
}: SalesSimulatorProps): React.ReactElement {
  const { language, t } = useLanguage();
  const isEnglish = language === 'en';

  const [mode, setMode] = useState<PracticeMode>(() => (localStorage.getItem('sales_sim_mode') as PracticeMode) || 'Lección Práctica');
  const [aiRole, setAiRole] = useState<AiRole>(() => (localStorage.getItem('sales_sim_aiRole') as AiRole) || 'Asesor');
  const [voice, setVoice] = useState<VoiceName>(() => {
      const saved = localStorage.getItem('sales_sim_voice');
      const legacyMap: Record<string, VoiceName> = {
        Zephyr: 'Miguel',
        Charon: 'Ismael',
        Fenrir: 'Diego',
        Kore: 'Andrea',
        Puck: 'Sonia',
        Aoede: 'Angela',
      };
      if (saved && legacyMap[saved]) return legacyMap[saved];
      return (saved as VoiceName) || 'Miguel';
  });
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
      const saved = localStorage.getItem('sales_sim_playbackRate');
      return saved ? parseFloat(saved) : 1;
  });
  const [error, setError] = useState<string | null>(null);
  const [isAiReplyingToText, setIsAiReplyingToText] = useState(false);
  
  // Free Mode State
  const [useFreeMode, setUseFreeMode] = useState<boolean>(() => {
      const saved = localStorage.getItem('sales_sim_useFreeMode');
      return saved ? saved === 'true' : false;
  });
  const [customTopic, setCustomTopic] = useState<string>(() => localStorage.getItem('sales_sim_customTopic') || '');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const [showCoachHint, setShowCoachHint] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
      localStorage.setItem('sales_sim_mode', mode);
      localStorage.setItem('sales_sim_aiRole', aiRole);
      localStorage.setItem('sales_sim_voice', voice);
      localStorage.setItem('sales_sim_playbackRate', playbackRate.toString());
      localStorage.setItem('sales_sim_useFreeMode', useFreeMode.toString());
      localStorage.setItem('sales_sim_customTopic', customTopic);
      localStorage.setItem('sales_sim_showTranscript', showTranscript.toString());
  }, [mode, aiRole, voice, playbackRate, useFreeMode, customTopic, showTranscript]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const onBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setInstallPromptEvent(e);
      };
      window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as any);
      return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as any);
    } catch (_) {
      return;
    }
  }, []);

  useEffect(() => {
    const key = `sales_sim_tutorial_seen_${currentUser.id}`;
    const seen = localStorage.getItem(key) === 'true';
    if (!seen) {
      setShowTutorial(true);
      setTutorialStep(0);
      localStorage.setItem(key, 'true');
    }
  }, [currentUser.id]);



  // Evaluation State
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Timer State
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  const ttsAudioContextRef = useRef<AudioContext | null>(null);

  const {
    isSessionActive,
    status,
    setStatus,
    transcript,
    setTranscript,
    startSession,
    stopSession: stopLiveSession,
    isMuted,
    toggleMute,
    setPlaybackRate: setLivePlaybackRate,
    nudgeAiToContinue
  } = useLiveConversation();

  useEffect(() => {
    setLivePlaybackRate(playbackRate);
  }, [playbackRate, setLivePlaybackRate]);

  const [isChatActive, setIsChatActive] = useState(false);
  const isAnySessionActive = isSessionActive || isChatActive || status === 'connecting';

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isAnySessionActive) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (_) {
        wakeLockRef.current = null;
      }
    };

    const releaseWakeLock = async () => {
      try {
        await wakeLockRef.current?.release?.();
      } catch (_) {}
      wakeLockRef.current = null;
    };

    if (isAnySessionActive) requestWakeLock();
    else releaseWakeLock();

    const onVisibility = () => {
      try {
        if (document.visibilityState === 'visible' && isAnySessionActive && !wakeLockRef.current) {
          requestWakeLock();
        }
      } catch (_) {}
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      releaseWakeLock();
    };
  }, [isAnySessionActive]);

  // Switch to Free Mode automatically if no docs
  useEffect(() => {
      if (documents.length === 0) {
          setUseFreeMode(true);
      }
  }, [documents]);

  useEffect(() => {
    if (mode === 'Simulador de Chat') {
      setShowTranscript(true);
    } else {
      setShowTranscript(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!isAnySessionActive) {
      setShowCoachHint(false);
      return;
    }

    setShowCoachHint(true);
    const timer = window.setTimeout(() => setShowCoachHint(false), 7000);
    return () => window.clearTimeout(timer);
  }, [isAnySessionActive]);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (isAnySessionActive && timeLeft > 0) {
        interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleStopAndEvaluate();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    } else if (!isAnySessionActive) {
        setTimeLeft(300);
    }
    return () => clearInterval(interval);
  }, [isAnySessionActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRandomTopic = () => {
      const random = RANDOM_TOPICS[Math.floor(Math.random() * RANDOM_TOPICS.length)];
      setCustomTopic(random);
      setUseFreeMode(true);
  };

  const getSystemInstruction = useCallback((currentMode: PracticeMode, currentRole: AiRole, docs: UploadedFile[], isFree: boolean, topic: string) => {
    const langLabel = isEnglish ? 'English' : 'Spanish';

    let contextContent = "";
    if (isFree) {
        contextContent = isEnglish
          ? `SCENARIO CONTEXT (FREE TOPIC): "${topic}". Use your creativity to simulate this scenario realistically.`
          : `CONTEXTO DEL ESCENARIO (TEMA LIBRE): "${topic}". Usa tu creatividad para simular este escenario de forma realista.`;
    } else {
        const MAX_DOC_CHARS = 3500;
        const MAX_TOTAL_CHARS = 12000;
        let used = 0;
        const safeDocs = docs.map((doc) => {
          const raw = (doc.content || '').slice(0, MAX_DOC_CHARS);
          const room = Math.max(0, MAX_TOTAL_CHARS - used);
          const clipped = raw.slice(0, room);
          used += clipped.length;
          return `--- DOC: ${doc.name} ---\n${clipped}${doc.content && doc.content.length > clipped.length ? '\n[...contenido recortado para respuesta rápida...]' : ''}\n`;
        }).filter(Boolean);

        contextContent = `BASE DE CONOCIMIENTO (resumida para latencia y estabilidad):\n` + safeDocs.join('\n');
    }

    let modeInstruction = '';
    if (isEnglish) {
      switch(currentMode) {
        case 'Lección Práctica':
          modeInstruction = 'COACH MODE: Evaluate in real time. In each response mention 1 thing the user did well or poorly and one actionable micro-recommendation. If they correct themselves, acknowledge it explicitly.';
          break;
        case 'Simulador de Llamada':
          modeInstruction = 'REALISTIC MODE: Do not give advice, stay 100% in character. Quick, spoken responses.';
          break;
        case 'Simulador de Chat':
          modeInstruction = 'CHAT MODE: Concise responses in instant messaging style.';
          break;
      }
    } else {
      switch(currentMode) {
        case 'Lección Práctica':
          modeInstruction = 'MODO COACH: Debes evaluar en tiempo real. En cada respuesta menciona 1 cosa bien o mal del usuario y una micro-recomendación accionable. Si corrige bien, reconócelo explícitamente.';
          break;
        case 'Simulador de Llamada':
          modeInstruction = 'MODO REALISTA: No des consejos, actúa 100% en personaje. Respuestas rápidas y habladas.';
          break;
        case 'Simulador de Chat':
          modeInstruction = 'MODO CHAT: Respuestas concisas estilo mensajería instantánea.';
          break;
      }
    }

    const roleInstruction = isEnglish
      ? (currentRole === 'Asesor'
          ? 'You are the Expert Salesperson. Guide the user. NEVER act as a client.'
          : 'You are the Client. Raise realistic objections, interrupt if natural, be difficult when the context calls for it. NEVER act as advisor.')
      : (currentRole === 'Asesor'
          ? 'Tú eres el Vendedor Experto. Guía al usuario. NUNCA actúes como cliente.'
          : 'Tú eres el Cliente. Pon objeciones realistas, interrumpe si es natural, sé difícil si el contexto lo amerita. NUNCA actúes como asesor.');

    return isEnglish ? `
GOLDEN RULE: Respond conversationally, humanly and briefly (1-2 sentences). Avoid any robotic tone.
You are a real-time commercial training AI. Prioritize fluency and agile responses, no monologues.
LANGUAGE: Always respond in ${langLabel}.

${contextContent}

SETUP:
- Company: ${companyBrand?.name || 'Client Company'}
- Mode: ${currentMode}
- AI Role: ${currentRole}
- User: ${currentUser.name}

${roleInstruction}
${modeInstruction}

CRITICAL INSTRUCTIONS:
1. Always respond in 1 or 2 sentences maximum.
2. Keep latency low: think just enough and respond directly.
3. Use natural, warm, conversational English.
4. If you are the client, react emotionally to the user.
5. Do not use lists or text formatting: sound like a real conversation.
6. If mode is Practice Lesson, always include short performance feedback (good/bad) + what to do next in the following sentence.
7. ALWAYS maintain the selected role (${currentRole}) throughout the session, without mixing characters.
8. If the user says "Activate Coach mode", pause briefly, deliver immediate feedback on how the conversation is going and clarify doubts before continuing.
9. After the greeting, explicitly state your role in first person: "I am the client" or "I am the advisor".
10. Immediately start a realistic call scenario using the available context: if there are company documents, use them; if it is a free topic, use that topic without deviating.

START NOW! Begin with a brief greeting, then declare the role (${currentRole}) and start the call with a concrete situation from the scenario.
    ` : `
REGLA DE ORO: Responde de forma conversacional, humana y breve (1-2 oraciones). Evita cualquier tono robótico.
Eres una IA de entrenamiento comercial en tiempo real. Prioriza fluidez y respuestas ágiles, sin monólogos.
IDIOMA: Siempre responde en ${langLabel}.

${contextContent}

CONFIGURACIÓN:
- Empresa: ${companyBrand?.name || 'Empresa del cliente'}
- Modo: ${currentMode}
- Rol IA: ${currentRole}
- Usuario: ${currentUser.name}

${roleInstruction}
${modeInstruction}

INSTRUCCIÓN CRÍTICA:
1. Responde en 1 o 2 oraciones máximo SIEMPRE.
2. Mantén latencia baja: piensa lo justo y responde directo.
3. Usa lenguaje natural colombiano neutral, cálido y muy conversacional.
4. Si eres cliente, reacciona emocionalmente al usuario.
5. No uses listas ni formatos de texto: suena como conversación real.
6. Si el modo es Lección Práctica, siempre incluye feedback corto del desempeño (bien/mal) + qué hacer en la siguiente frase.
7. Mantén SIEMPRE el rol seleccionado (${currentRole}) durante toda la sesión, sin mezclar personajes.
8. Si el usuario dice "Activa el modo Coach", haz una pausa corta, entrega feedback inmediato de cómo va la charla y aclara dudas antes de continuar.
9. Después del saludo, debes decir explícitamente tu rol en primera persona: "Soy el cliente" o "Soy el asesor".
10. Inicia de inmediato un escenario realista de llamada usando el contexto disponible: si hay documentos de empresa, úsalo; si es tema libre, usa ese tema sin desviarte.

¡EMPIEZA AHORA! Debes iniciar con un saludo breve, luego declarar el rol (${currentRole}) y arrancar la llamada con una situación concreta del escenario.
    `;
  }, [currentUser, companyBrand, isEnglish]);

  const buildHeuristicEvaluation = (safeTranscript: TranscriptTurn[]): EvaluationResult => {
    const userTurns = safeTranscript.filter(t => t.speaker === 'user');
    const aiTurns = safeTranscript.filter(t => t.speaker === 'ai');
    const userText = userTurns.map(t => t.text.toLowerCase()).join(' ');
    const userChars = userTurns.reduce((acc, t) => acc + t.text.length, 0);
    const questions = (userText.match(/\?/g) || []).length;

    const hasGreeting = /(hola|buenas|mucho gusto|encantado)/i.test(userText);
    const hasDiscovery = /(qué|como|cuánto|cuando|dónde|necesita|objetivo|problema|presupuesto)/i.test(userText);
    const hasObjectionHandling = /(entiendo|comprendo|sin embargo|déjame|permíteme|resolvemos|garantía)/i.test(userText);
    const hasClose = /(te parece|agendamos|cerramos|siguiente paso|confirmamos|procedemos|firma|pago)/i.test(userText);

    const apertura = Math.max(20, Math.min(95, 35 + (hasGreeting ? 25 : 0) + Math.min(20, questions * 2)));
    const descubrimiento = Math.max(20, Math.min(95, 30 + (hasDiscovery ? 30 : 0) + Math.min(25, questions * 3)));
    const manejoObjeciones = Math.max(20, Math.min(95, 30 + (hasObjectionHandling ? 35 : 0) + Math.min(20, aiTurns.length * 2)));
    const claridad = Math.max(20, Math.min(95, 35 + Math.min(30, Math.floor(userChars / 120))));
    const cierre = Math.max(20, Math.min(95, 25 + (hasClose ? 40 : 0) + (userTurns.length >= 4 ? 10 : 0)));

    const score = Math.round((apertura + descubrimiento + manejoObjeciones + claridad + cierre) / 5);

    return {
      score,
      feedback: isEnglish
        ? `Automatic call evaluation: ${score}/100. Your performance improves when you ask more discovery questions and close with a clear next step.`
        : `Evaluación automática real de la llamada: ${score}/100. Tu desempeño mejora cuando haces más preguntas de descubrimiento y cierras con siguiente paso claro.`,
      strengths: isEnglish ? [
        apertura >= 60 ? 'Good conversation opening' : 'Commercial opening intent',
        claridad >= 60 ? 'Clear and understandable communication' : 'Messages with commercial intent',
        descubrimiento >= 60 ? 'You asked questions to understand the client' : 'Active participation in the call',
      ] : [
        apertura >= 60 ? 'Buen inicio de conversación' : 'Intención de apertura comercial',
        claridad >= 60 ? 'Comunicación entendible' : 'Mensajes con intención comercial',
        descubrimiento >= 60 ? 'Hiciste preguntas para entender al cliente' : 'Participación activa en la llamada',
      ],
      improvements: isEnglish ? [
        descubrimiento < 70 ? 'Ask more diagnostic questions before presenting' : 'Dig deeper into client pain and urgency',
        manejoObjeciones < 70 ? 'Validate objections and respond with concrete evidence' : 'Reinforce proof/benefits when facing objections',
        cierre < 70 ? 'Close with a concrete action (schedule/payment/confirmation)' : 'Define next step and commitment date',
      ] : [
        descubrimiento < 70 ? 'Haz más preguntas de diagnóstico antes de ofrecer' : 'Profundiza en dolores y urgencia del cliente',
        manejoObjeciones < 70 ? 'Valida objeciones y responde con prueba concreta' : 'Refuerza evidencia/beneficios ante objeciones',
        cierre < 70 ? 'Cierra con una acción concreta (agenda/pago/confirmación)' : 'Define próximo paso y fecha de compromiso',
      ],
      closingStatus: cierre >= 75 ? 'Cerrada' : (cierre >= 55 ? 'En Proceso' : 'No Cerrada'),
      metrics: { apertura, descubrimiento, manejoObjeciones, claridad, cierre },
    };
  };

  const handleStopAndEvaluate = async () => {
    if (!isAnySessionActive && transcript.length === 0) return;

    if (isSessionActive) stopLiveSession();
    if (isChatActive) setIsChatActive(false);

    setIsEvaluating(true);
    setStatus('evaluating');
    try {
        const safeTranscript = transcript.length > 0
          ? transcript
          : [{ speaker: 'ai', text: 'Sesión sin transcripción disponible.' } as TranscriptTurn];

        const ai = new GoogleGenAI({ apiKey: RUNTIME_API_KEY });
        const prompt = isEnglish ? `
        Act as a Sales Quality Supervisor.
        Analyze the following transcript:
        ${JSON.stringify(safeTranscript)}

        Evaluate with this rubric (0-100 per category):
        - apertura
        - descubrimiento
        - manejoObjeciones
        - claridad
        - cierre

        Rules:
        - The global score must be the average of the 5 categories, rounded.
        - Deduct points for lack of active listening, absence of questions, or weak closing.
        - Write feedback, strengths, and improvements in ENGLISH, actionable and based on the call.

        Return ONLY JSON with this exact schema:
        {
            "score": (number 0-100),
            "feedback": (brief text in English),
            "strengths": (array of 3 strings in English),
            "improvements": (array of 3 strings in English),
            "closingStatus": ("Cerrada" | "No Cerrada" | "En Proceso"),
            "metrics": {
              "apertura": (0-100),
              "descubrimiento": (0-100),
              "manejoObjeciones": (0-100),
              "claridad": (0-100),
              "cierre": (0-100)
            }
        }
        ` : `
        Actúa como un Supervisor de Calidad de Ventas.
        Analiza la siguiente transcripción:
        ${JSON.stringify(safeTranscript)}

        Evalúa con esta rúbrica (0-100 por categoría):
        - apertura
        - descubrimiento
        - manejoObjeciones
        - claridad
        - cierre

        Reglas:
        - La calificación global (score) debe ser el promedio de las 5 categorías, redondeado.
        - Debes descontar puntos si hay poca escucha activa, ausencia de preguntas, o cierre débil.
        - Feedback en español, accionable y basado en la llamada.

        Devuelve SOLO JSON con este esquema exacto:
        {
            "score": (número 0-100),
            "feedback": (texto breve),
            "strengths": (array de 3 strings),
            "improvements": (array de 3 strings),
            "closingStatus": ("Cerrada" | "No Cerrada" | "En Proceso"),
            "metrics": {
              "apertura": (0-100),
              "descubrimiento": (0-100),
              "manejoObjeciones": (0-100),
              "claridad": (0-100),
              "cierre": (0-100)
            }
        }
        `;

        const response = await ai.models.generateContent({
            model: EVAL_MODEL,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
              maxOutputTokens: 300,
            }
        });

        const heuristic = buildHeuristicEvaluation(safeTranscript);
        const raw = JSON.parse(response.text || '{}') as any;
        const metrics = {
          apertura: Math.max(0, Math.min(100, Number(raw?.metrics?.apertura ?? heuristic.metrics?.apertura ?? 50) || (heuristic.metrics?.apertura ?? 50))),
          descubrimiento: Math.max(0, Math.min(100, Number(raw?.metrics?.descubrimiento ?? heuristic.metrics?.descubrimiento ?? 50) || (heuristic.metrics?.descubrimiento ?? 50))),
          manejoObjeciones: Math.max(0, Math.min(100, Number(raw?.metrics?.manejoObjeciones ?? heuristic.metrics?.manejoObjeciones ?? 50) || (heuristic.metrics?.manejoObjeciones ?? 50))),
          claridad: Math.max(0, Math.min(100, Number(raw?.metrics?.claridad ?? heuristic.metrics?.claridad ?? 50) || (heuristic.metrics?.claridad ?? 50))),
          cierre: Math.max(0, Math.min(100, Number(raw?.metrics?.cierre ?? heuristic.metrics?.cierre ?? 50) || (heuristic.metrics?.cierre ?? 50))),
        };
        const derivedScore = Math.round((metrics.apertura + metrics.descubrimiento + metrics.manejoObjeciones + metrics.claridad + metrics.cierre) / 5);

        const normalized: EvaluationResult = {
          score: Math.max(0, Math.min(100, Number(raw?.score ?? derivedScore) || derivedScore)),
          feedback: (raw?.feedback || heuristic.feedback || (isEnglish ? 'No feedback generated.' : 'Sin feedback generado.')).toString(),
          strengths: Array.isArray(raw?.strengths) && raw.strengths.length > 0
            ? raw.strengths.map((s: any) => String(s)).slice(0, 3)
            : (heuristic.strengths || (isEnglish
                ? ['Willingness to practice', 'Session participation', 'Intent to improve']
                : ['Buena disposición a practicar', 'Participación en la sesión', 'Intención de mejorar'])),
          improvements: Array.isArray(raw?.improvements) && raw.improvements.length > 0
            ? raw.improvements.map((s: any) => String(s)).slice(0, 3)
            : (heuristic.improvements || (isEnglish
                ? ['Speaking clarity', 'Objection handling', 'Call closing']
                : ['Claridad al hablar', 'Manejo de objeciones', 'Cierre de llamada'])),
          closingStatus: raw?.closingStatus === 'Cerrada' || raw?.closingStatus === 'No Cerrada' || raw?.closingStatus === 'En Proceso'
            ? raw.closingStatus
            : (heuristic.closingStatus || 'En Proceso'),
          metrics,
        };

        setEvaluation(normalized);
        
        // SAVE REPORT
        const fullTranscript = safeTranscript.map(t => `${t.speaker}: ${t.text}`).join('\n');
        const report: Report = {
            ...normalized,
            id: `rep${Date.now()}`,
            userId: currentUser.id,
            userName: currentUser.name,
            companyId: companyId,
            date: new Date().toLocaleString(),
            durationSeconds: 300 - timeLeft,
            transcriptSample: fullTranscript.slice(0, 1200),
            transcriptFull: fullTranscript
        };
        onSaveReport(report);

    } catch (e) {
        console.error("Evaluation failed", e);
        const safeTranscript = transcript.length > 0
          ? transcript
          : [{ speaker: 'ai', text: 'Sesión sin transcripción disponible.' } as TranscriptTurn];
        const fallback: EvaluationResult = buildHeuristicEvaluation(safeTranscript);
        setEvaluation(fallback);
        const fullTranscript = safeTranscript.map(t => `${t.speaker}: ${t.text}`).join('\n');
        onSaveReport({
          ...fallback,
          id: `rep${Date.now()}`,
          userId: currentUser.id,
          userName: currentUser.name,
          companyId: companyId,
          date: new Date().toLocaleString(),
          durationSeconds: 300 - timeLeft,
          transcriptSample: fullTranscript.slice(0, 1200),
          transcriptFull: fullTranscript
        });
    } finally {
        setIsEvaluating(false);
        setStatus('idle');
    }
  };

  const handleStartConversation = useCallback(async () => {
    if (!useFreeMode && documents.length === 0) {
      setError('No hay documentos cargados. Sube archivos o usa el Modo Tema Libre.');
      return;
    }
    if (useFreeMode && !customTopic.trim()) {
        setError('Por favor escribe un tema o elige uno aleatorio.');
        return;
    }
    setError(null);

    if (mode === 'Simulador de Chat') {
        if (!RUNTIME_API_KEY) {
          setError('Falta configurar API de Gemini en producción (VITE_GEMINI_API_KEY).');
          return;
        }

        setIsChatActive(true);
        setStatus('idle');
        
        setIsAiReplyingToText(true);
        try {
            const ai = new GoogleGenAI({ apiKey: RUNTIME_API_KEY });
            const systemInstruction = getSystemInstruction(mode, aiRole, documents, useFreeMode, customTopic);
            const chatStartPrompt = isEnglish
              ? "Start the conversation with a brief greeting, then explicitly state if you are the client or advisor, and begin the call with a real scenario using the company context or free topic."
              : "Inicia la conversación con saludo breve, luego di explícitamente si eres cliente o asesor, y arranca la llamada en un escenario real usando el contexto de empresa o tema libre.";
            const response = await generateChatWithFallback(ai, {
                contents: chatStartPrompt,
                config: {
                  systemInstruction,
                  temperature: 0.8,
                  maxOutputTokens: 90,
                },
            });
            if (response.text) {
                setTranscript([{ speaker: 'ai', text: response.text }]);
            }
        } catch (err: any) {
            console.error(err);
            setError(null);
            setTranscript([{ speaker: 'ai', text: localCoachReply('iniciar conversación', aiRole, companyBrand?.name, transcript.length) }]);
        } finally {
            setIsAiReplyingToText(false);
        }
    } else {
        const systemInstruction = getSystemInstruction(mode, aiRole, documents, useFreeMode, customTopic);
        startSession(systemInstruction, voice, playbackRate);
    }
  }, [documents, mode, aiRole, voice, playbackRate, startSession, getSystemInstruction, useFreeMode, customTopic, companyBrand]);

  const handleSendText = useCallback(async (message: string) => {
    if (!message.trim() || isAiReplyingToText || !isChatActive) return;
    
    setIsAiReplyingToText(true);
    const newUserTurn: TranscriptTurn = { speaker: 'user', text: message };
    setTranscript(prev => [...prev, newUserTurn]);
    setStatus('thinking');

    try {
      const ai = new GoogleGenAI({ apiKey: RUNTIME_API_KEY });
      const systemInstruction = getSystemInstruction(mode, aiRole, documents, useFreeMode, customTopic);
      const recentTurns = [...transcript, newUserTurn].slice(-8);
      const history = recentTurns.map(turn => ({
          role: turn.speaker === 'user' ? 'user' : 'model',
          parts: [{ text: turn.text }]
      }));
      
      const response = await generateChatWithFallback(ai, {
        contents: history,
        config: {
          systemInstruction,
          temperature: 0.65,
          maxOutputTokens: 80,
        },
      });

      let aiTextResponse = (response.text || '').trim();

      // Fallback si el modelo no retorna texto en el primer intento
      if (!aiTextResponse) {
        const retry = await generateChatWithFallback(ai, {
          contents: [{ role: 'user', parts: [{ text: message }] }],
          config: {
            systemInstruction,
            temperature: 0.6,
            maxOutputTokens: 90,
          },
        });
        aiTextResponse = (retry.text || '').trim();
      }

      if (aiTextResponse) {
        setTranscript(prev => [...prev, { speaker: 'ai', text: aiTextResponse }]);
      } else {
        setTranscript(prev => [...prev, { speaker: 'ai', text: 'Estoy aquí. Reformulo: cuéntame en una frase qué necesitas y te respondo de inmediato.' }]);
      }
      setStatus('idle');
    } catch (err: any) {
      console.error(err);
      setStatus('idle');
      setError(null);
      setTranscript(prev => [...prev, { speaker: 'ai', text: localCoachReply(message, aiRole, companyBrand?.name, prev.length) }]);
    } finally {
      setIsAiReplyingToText(false);
    }
  }, [isAiReplyingToText, isChatActive, mode, aiRole, documents, transcript, getSystemInstruction, setStatus, setTranscript, useFreeMode, customTopic, companyBrand]);

  const bgClass = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
  const cardClass = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm';
  const overlayClass = theme === 'dark' ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200';
  const tabActiveClass = theme === 'dark' ? 'bg-cyan-900/50 text-cyan-400 border-cyan-500' : 'bg-cyan-50 text-cyan-700 border-cyan-500';
  const tabInactiveClass = theme === 'dark' ? 'text-gray-400 border-transparent hover:text-gray-200' : 'text-gray-500 border-transparent hover:text-gray-700';

  const canStart = (useFreeMode && customTopic.length > 0) || (!useFreeMode && documents.length > 0);

  const handleInstallApp = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    try {
      await installPromptEvent.userChoice;
    } catch (_) {}
    setInstallPromptEvent(null);
  };

  const handleToggleMute = () => {
    const willMute = !isMuted;
    toggleMute();
    if (willMute && mode !== 'Simulador de Chat' && isAnySessionActive) {
      nudgeAiToContinue('Mi micrófono está silenciado. Continúa la conversación y dame seguimiento breve.');
    }
  };

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${bgClass}`}>
      <Header theme={theme} onToggleTheme={onToggleTheme} brand={companyBrand}>
         <div className="flex items-center space-x-4">
             <button 
                onClick={() => setIsSidebarOpen(true)}
                className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-200 text-gray-700'}`}
                title={t.settings}
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
             </button>
             <div className={`hidden md:flex items-center px-3 py-1 rounded-full text-xs ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                {currentUser.name}
             </div>
         </div>
         
         <div className={`text-2xl font-mono font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-cyan-500'}`}>
            {formatTime(timeLeft)}
         </div>

         <button 
            onClick={onLogout} 
            className={`text-sm transition-all duration-200 active:scale-95 px-4 py-1.5 rounded-full font-semibold ${
                currentUser.role === 'admin' 
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm' 
                    : theme === 'dark' ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 shadow-sm' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 shadow-sm'
            }`}
        >
            {currentUser.role === 'admin' ? t.backToAdmin : t.logout}
         </button>
      </Header>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        theme={theme}
        useFreeMode={useFreeMode}
        onUseFreeModeChange={setUseFreeMode}
        selectedVoice={voice}
        onVoiceChange={setVoice}
        showTranscript={showTranscript}
        onShowTranscriptChange={(show) => {
          if (mode === 'Simulador de Chat' && !show) return;
          setShowTranscript(show);
        }}
        disableVoicePreview={isAnySessionActive}
        onOpenTutorial={() => { setIsSidebarOpen(false); setTutorialStep(0); setShowTutorial(true); }}
      />

      <div className="flex-grow flex flex-col p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 max-w-4xl mx-auto w-full">
        {error && <div className="bg-red-500/20 text-red-400 border border-red-500/50 p-3 rounded text-sm">{error}</div>}



        {/* Scenario Configuration Area (Only when inactive) */}
        {!isAnySessionActive && (
            <div className={`p-4 rounded-2xl border ${cardClass}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider opacity-70">
                        {useFreeMode ? t.freeCoach : t.companyCoach}
                    </h3>
                </div>

                {useFreeMode ? (
                    <div className="flex flex-col md:flex-row gap-3">
                        <input 
                            type="text"
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            placeholder={t.topicPlaceholder}
                            className={`flex-grow p-3 rounded-xl border outline-none focus:ring-2 focus:ring-cyan-500 ${theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}
                        />
                        <button 
                            onClick={handleRandomTopic}
                            className={`px-4 py-3 rounded-2xl font-semibold text-sm whitespace-nowrap transition-all duration-200 active:scale-95 shadow-sm ${theme === 'dark' ? 'bg-fuchsia-900/30 text-fuchsia-400 hover:bg-fuchsia-900/50' : 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200'}`}
                        >
                            {t.randomTopic}
                        </button>
                    </div>
                ) : null}
            </div>
        )}

        {/* Chat Area */}
        {showTranscript ? (
            <div className={`flex flex-col rounded-2xl overflow-hidden border ${cardClass} relative resize-y min-h-[36vh] h-[45vh] sm:min-h-[40vh] sm:h-[50vh] flex-grow shadow-lg transition-shadow`}>
                 <div className={`absolute top-0 left-0 right-0 backdrop-blur text-center py-1 text-xs z-10 border-b cursor-row-resize ${overlayClass} ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {mode === 'Simulador de Chat' ? t.chatModeHint : (isEnglish ? '⏱ Session limited to 5 minutes • Drag bottom edge to resize' : '⏱ Sesión limitada a 5 minutos • Arrastra el borde inferior para ajustar tamaño')}
                 </div>
                 
                 <div className="flex-grow overflow-y-auto mt-6 custom-scrollbar">
                    <Transcript transcript={transcript} theme={theme} />
                 </div>
                 
                 <TextInput onSend={handleSendText} disabled={isAiReplyingToText || !isChatActive} theme={theme} />
            </div>
        ) : (
            <div className="min-h-[140px] sm:min-h-[170px] flex items-center justify-center">
                <StatusIndicator status={status} theme={theme} large={true} />
            </div>
        )}

        {/* Controls */}
        <div className={`flex flex-col items-center space-y-4 pb-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
           {isEvaluating ? (
               <div className="text-fuchsia-500 animate-pulse font-bold">{t.generating}</div>
           ) : (
               showTranscript && <StatusIndicator status={status} theme={theme} />
           )}

           {showCoachHint && (
             <div className={`text-xs px-3 py-2 rounded-full border ${theme === 'dark' ? 'text-cyan-300 border-cyan-700 bg-cyan-900/20' : 'text-cyan-700 border-cyan-200 bg-cyan-50'}`}>
               {t.coachHint}
             </div>
           )}
           
           <Controls
             isSessionActive={isAnySessionActive}
             onStart={handleStartConversation}
             onStop={handleStopAndEvaluate}
             selectedMode={mode}
             onModeChange={setMode}
             selectedRole={aiRole}
             onRoleChange={setAiRole}
             playbackRate={playbackRate}
             onPlaybackRateChange={setPlaybackRate}
             isFileUploaded={canStart}
             theme={theme}
             isMuted={isMuted}
             onToggleMute={handleToggleMute}
           />
        </div>
      </div>

      {evaluation && (
          <EvaluationModal 
            result={evaluation} 
            onClose={() => {
                setEvaluation(null);
                setTranscript([]);
                setTimeLeft(300);
            }} 
            theme={theme}
          />
      )}

      {showTutorial && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-5 ${cardClass}`}>
            <div className="text-xs opacity-70 mb-2">Tutorial ({tutorialStep + 1}/5)</div>
            {tutorialStep === 0 && <p className="text-sm">{t.tutStep0}</p>}
            {tutorialStep === 1 && <p className="text-sm">{t.tutStep1}</p>}
            {tutorialStep === 2 && <p className="text-sm">{t.tutStep2}</p>}
            {tutorialStep === 3 && <p className="text-sm">{t.tutStep3}</p>}
            {tutorialStep === 4 && <p className="text-sm">{t.tutStep4}</p>}

            <div className="flex justify-between mt-5 gap-2">
              <button className="px-3 py-2 rounded-lg border text-sm" onClick={() => setShowTutorial(false)}>{t.skip}</button>
              <div className="flex gap-2">
                {tutorialStep > 0 && <button className="px-3 py-2 rounded-lg border text-sm" onClick={() => setTutorialStep(s => Math.max(0, s - 1))}>{t.back}</button>}
                {tutorialStep < 4 ? (
                  <button className="px-3 py-2 rounded-lg brand-gradient-bg text-white text-sm" onClick={() => setTutorialStep(s => Math.min(4, s + 1))}>{t.next}</button>
                ) : (
                  <button className="px-3 py-2 rounded-lg brand-gradient-bg text-white text-sm" onClick={() => setShowTutorial(false)}>{t.understood}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
