import { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { TranscriptTurn, ConversationStatus, VoiceName } from '../types';
import { encode, decode, decodeAudioData } from '../services/audioUtils';

type LiveSession = Awaited<ReturnType<GoogleGenAI['live']['connect']>>;

const voiceEngineMap: Record<VoiceName, string> = {
  Miguel: 'Zephyr',
  Ismael: 'Charon',
  Diego: 'Fenrir',
  Andrea: 'Kore',
  Sonia: 'Puck',
  Angela: 'Aoede',
};

const useLiveConversation = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [status, setStatus] = useState<ConversationStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const connectionLockRef = useRef(false);
  const sessionGenerationRef = useRef(0);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const isMutedRef = useRef(false);
  const playbackRateRef = useRef(1);

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const audioChainRef = useRef<Promise<void>>(Promise.resolve());

  const waitingFirstCoachTurnRef = useRef(false);

  const clearOutputAudio = useCallback(() => {
    audioSourcesRef.current.forEach((source) => {
      try { source.stop(); } catch (_) {}
    });
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    audioChainRef.current = Promise.resolve();
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      isMutedRef.current = next;
      return next;
    });
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const safeRate = Math.max(0.5, Math.min(2, rate || 1));
    playbackRateRef.current = safeRate;
    audioSourcesRef.current.forEach((source) => {
      try {
        source.playbackRate.value = safeRate;
      } catch (_) {}
    });
  }, []);

  const nudgeAiToContinue = useCallback((text?: string) => {
    sessionPromiseRef.current?.then((session) => {
      try {
        session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: text || 'Continúa la conversación con una respuesta breve.' }] }],
          turnComplete: true,
        });
      } catch (_) {}
    });
  }, []);

  const stopSession = useCallback(() => {
    const pendingSession = sessionPromiseRef.current;
    connectionLockRef.current = false;
    sessionGenerationRef.current += 1;

    sessionPromiseRef.current = null;

    if (pendingSession) {
      pendingSession.then(s => s.close()).catch(() => {});
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
    }

    clearOutputAudio();

    setIsSessionActive(false);
    setStatus('idle');
    setIsMuted(false);
    isMutedRef.current = false;
    waitingFirstCoachTurnRef.current = false;
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
  }, [clearOutputAudio]);

  const createPcmBlob = (inputData: Float32Array): Blob => {
    const l = inputData.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const queueAudioChunk = useCallback((base64Audio: string, generation: number) => {
    audioChainRef.current = audioChainRef.current.then(async () => {
      if (generation !== sessionGenerationRef.current) return;
      const outputCtx = outputAudioContextRef.current;
      if (!outputCtx) return;

      if (outputCtx.state === 'suspended') {
        await outputCtx.resume();
      }

      const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
      if (generation !== sessionGenerationRef.current) return;

      const source = outputCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRateRef.current;
      source.connect(outputCtx.destination);

      source.onended = () => {
        audioSourcesRef.current.delete(source);
        if (audioSourcesRef.current.size === 0) {
          setStatus('listening');
        }
      };

      const startAt = Math.max(nextStartTimeRef.current, outputCtx.currentTime + 0.01);
      source.start(startAt);
      nextStartTimeRef.current = startAt + (audioBuffer.duration / playbackRateRef.current);
      audioSourcesRef.current.add(source);
    }).catch(() => {});
  }, []);

  const startSession = useCallback(async (systemInstruction: string, voice: VoiceName, playbackRate: number) => {
    if (connectionLockRef.current || sessionPromiseRef.current) return;
    connectionLockRef.current = true;
    const generation = ++sessionGenerationRef.current;

    setStatus('connecting');
    setTranscript([]);
    playbackRateRef.current = playbackRate;

    try {
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      await inputCtx.resume();
      await outputCtx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const connectPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            if (generation !== sessionGenerationRef.current) return;
            connectionLockRef.current = false;
            setIsSessionActive(true);
            setStatus('listening');
            waitingFirstCoachTurnRef.current = true;

            sessionPromiseRef.current?.then((session) => {
              try {
                session.sendClientContent({
                  turns: [{ role: 'user', parts: [{ text: 'Inicia con saludo breve, declara explícitamente si eres cliente o asesor, y arranca una llamada realista según el contexto.' }] }],
                  turnComplete: true,
                });
              } catch (_) {}
            });

            window.setTimeout(() => {
              if (generation !== sessionGenerationRef.current) return;
              waitingFirstCoachTurnRef.current = false;
            }, 500);

            if (inputAudioContextRef.current?.state === 'closed') return;

            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(1024, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (event) => {
              if (isMutedRef.current) return;
              if (waitingFirstCoachTurnRef.current) return;

              const inputData = event.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);

              sessionPromiseRef.current?.then((session) => {
                try {
                  session.sendRealtimeInput({ media: pcmBlob });
                } catch (_) {}
              });
            };

            const outputMuteNode = inputAudioContextRef.current.createGain();
            outputMuteNode.gain.value = 0;

            source.connect(scriptProcessor);
            scriptProcessor.connect(outputMuteNode);
            outputMuteNode.connect(inputAudioContextRef.current.destination);
          },

          onmessage: async (message: LiveServerMessage) => {
            if (generation !== sessionGenerationRef.current) return;

            if (message.serverContent?.interrupted) {
              clearOutputAudio();
              currentOutputTranscriptionRef.current = '';
              setStatus('listening');
              return;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.find((p: any) => p?.inlineData?.data)?.inlineData?.data;
            if (base64Audio) {
              // desbloquea mic apenas llega la primera voz del coach
              if (waitingFirstCoachTurnRef.current) {
                waitingFirstCoachTurnRef.current = false;
              }
              setStatus('speaking');
              queueAudioChunk(base64Audio, generation);
            }

            if (message.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const finalInput = currentInputTranscriptionRef.current.trim();
              const finalOutput = currentOutputTranscriptionRef.current.trim();

              setTranscript(prev => {
                const next = [...prev];
                if (finalInput) next.push({ speaker: 'user', text: finalInput });
                if (finalOutput) next.push({ speaker: 'ai', text: finalOutput });
                return next;
              });

              if (waitingFirstCoachTurnRef.current && finalOutput.length > 0) {
                waitingFirstCoachTurnRef.current = false;
              }

              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
            }
          },

          onerror: () => {
            if (generation !== sessionGenerationRef.current) return;
            connectionLockRef.current = false;
            stopSession();
          },

          onclose: () => {
            if (generation !== sessionGenerationRef.current) return;
            connectionLockRef.current = false;
            stopSession();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceEngineMap[voice] || 'Zephyr' } } },
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });

      sessionPromiseRef.current = connectPromise;

      connectPromise.catch(() => {
        if (generation !== sessionGenerationRef.current) return;
        connectionLockRef.current = false;
        stopSession();
      });
    } catch {
      connectionLockRef.current = false;
      setStatus('idle');
    }
  }, [queueAudioChunk, clearOutputAudio, stopSession]);

  return {
    isSessionActive,
    status,
    setStatus,
    transcript,
    setTranscript,
    startSession,
    stopSession,
    isMuted,
    toggleMute,
    setPlaybackRate,
    nudgeAiToContinue,
  };
};

export default useLiveConversation;
