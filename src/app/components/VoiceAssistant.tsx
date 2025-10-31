'use client';

import { useState, useRef, useEffect } from 'react';
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// Type definitions for event handlers
interface RealtimeEventHandlers {
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  muted: boolean;
  mute: (muted: boolean) => void;
  close: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface QuizQuestion {
  id: number;
  question: string;
  type: 'multiple-choice' | 'open-ended';
  options?: string[];
  answer: string;
  explanation: string;
  subject: string;
}

// Quiz questions with mixed formats
const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    type: 'multiple-choice',
    question: "What is the process by which plants make their own food using sunlight?",
    options: ["Respiration", "Photosynthesis", "Digestion", "Transpiration"],
    answer: "Photosynthesis",
    explanation: "Photosynthesis is the process where plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar (glucose). This happens in the chloroplasts of plant cells.",
    subject: "Biology"
  },
  {
    id: 2,
    type: 'open-ended',
    question: "What are the three states of matter?",
    answer: "Solid, Liquid, and Gas",
    explanation: "The three common states of matter are solid (particles are tightly packed), liquid (particles are loosely connected and can flow), and gas (particles are far apart and move freely). There's also a fourth state called plasma!",
    subject: "Chemistry"
  },
  {
    id: 3,
    type: 'multiple-choice',
    question: "What force pulls objects toward the center of the Earth?",
    options: ["Magnetism", "Friction", "Gravity", "Inertia"],
    answer: "Gravity",
    explanation: "Gravity is a force that attracts objects with mass toward each other. On Earth, gravity pulls everything toward the planet's center, which is why things fall down and why we stay on the ground.",
    subject: "Physics"
  },
  {
    id: 4,
    type: 'multiple-choice',
    question: "What is the largest organ in the human body?",
    options: ["Heart", "Brain", "Liver", "Skin"],
    answer: "Skin",
    explanation: "The skin is the largest organ of the human body. It protects our internal organs, helps regulate body temperature, and allows us to sense touch, heat, and cold. An adult's skin can weigh about 8 pounds!",
    subject: "Biology"
  },
  {
    id: 5,
    type: 'open-ended',
    question: "What gas do humans breathe in that is essential for survival?",
    answer: "Oxygen",
    explanation: "Oxygen (O₂) is the gas we breathe in from the air. Our bodies need oxygen for cellular respiration, which is how our cells produce energy. We breathe in oxygen and breathe out carbon dioxide.",
    subject: "Biology"
  }
];

export default function VoiceAssistant() {
  // Student information
  const studentName = 'Amith';
  
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<RealtimeSession | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionsCompleted, setQuestionsCompleted] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [autoUnmute, setAutoUnmute] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // React Speech Recognition hook
  const {
    transcript: speechTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Helper function to notify AI about student actions
  const notifyAI = (activeSession: RealtimeSession, notificationType: string, notificationData?: Record<string, unknown>): void => {
    try {
      let message = '';
      
      if (notificationType === 'QUESTION_SHOWN') {
        message = "I'm looking at this question now. Can you help me understand it?";
      } else if (notificationType === 'ATTEMPT_RECORDED') {
        const { count, result } = notificationData || {};
        if (result === 'correct') {
          message = "I got it right!";
        } else if (count === 1) {
          message = "I tried answering but got it wrong. Can you give me a hint?";
        } else if (count === 2) {
          message = "I tried again but still got it wrong. Can you help me understand the concept?";
        }
      }
      
      if (message) {
        console.log('Notifying AI:', message);
        
        // Add as a user message for natural conversation flow
        setMessages((prev) => [
          ...prev,
          {
            role: 'user',
            text: message,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error notifying AI:', error);
    }
  };

  const connectToSession = async (questionIndex?: number): Promise<void> => {
    if (!apiKey) {
      setError('Please enter your OpenAI API key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get ephemeral token from backend
      const response = await fetch('/api/get-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        throw new Error('Failed to get ephemeral token');
      }

      const data = await response.json();
      const ephemeralKey = data.token;

      // Get current question context - use provided index or current state
      const activeQuestionIndex = questionIndex !== undefined ? questionIndex : currentQuestionIndex;
      const currentQuestion = quizQuestions[activeQuestionIndex];
      const optionsText = currentQuestion.type === 'multiple-choice' && currentQuestion.options
        ? `\nOptions:\nA) ${currentQuestion.options[0]}\nB) ${currentQuestion.options[1]}\nC) ${currentQuestion.options[2]}\nD) ${currentQuestion.options[3]}`
        : '';
      
      // Build context for the tutor
      let attemptContext = '';
      if (attemptCount === 0) {
        attemptContext = 'The student is seeing this question for the first time.';
      } else if (attemptCount === 1 && !isCorrect) {
        attemptContext = 'The student attempted once and got it wrong. Give them a hint to guide their thinking.';
      } else if (attemptCount === 2 && !isCorrect) {
        attemptContext = 'The student has tried twice. Help them understand the concept before moving on.';
      } else if (isCorrect) {
        attemptContext = 'The student got it correct! Reinforce their understanding.';
      }

      const questionContext = `
📚 CURRENT QUESTION CONTEXT:

👤 Student Name: ${studentName}

Question ${currentQuestion.id} (${activeQuestionIndex + 1} of ${quizQuestions.length}):
"${currentQuestion.question}"

Type: ${currentQuestion.type === 'multiple-choice' ? 'Multiple Choice' : 'Open-Ended'}
Subject: ${currentQuestion.subject}
${optionsText ? `\nOptions Available:${optionsText}` : ''}

🎯 Correct Answer: ${currentQuestion.answer}
💡 Explanation: ${currentQuestion.explanation}

📊 Student Progress:
${attemptContext}
Attempts so far: ${attemptCount}

⚠️ IMPORTANT: 
- Address the student as "${studentName}" occasionally to personalize the interaction
- DO NOT directly reveal the answer (${currentQuestion.answer})
- Guide the student to discover it through questions
- Use the explanation above to frame your hints
- Keep responses short and conversational (2-3 sentences max)
`;

      // Create agent
      const agent = new RealtimeAgent({

        name: "Tutor",
      
        instructions: `
      
    
      ${questionContext}
       
    🎓 System Prompt: Ainstein – Socratic Concept Tutor
Role:

You are Ainstein, a friendly, curious AI tutor that helps students understand academic concepts through dialogue.

Your goal is not to provide direct answers, but to guide the student toward discovering the answer through reasoning, hints, and reflection.
🧩 Interaction Framework
1️⃣ Context Awareness
Use the context or question provided by the app (e.g. the student’s recent attempt, subject, or topic).
If no clear question is provided, briefly ask what the topic or concept is.
2️⃣ Warm & Natural Opening
Greet the student casually and positively.
“Hey [student name]! 👋 Ready to tackle this one?”
Ask an easy warm-up question to build confidence.
3️⃣ Socratic Discovery Flow

Guide using questions instead of explanations:
Ask leading questions that make the student think.
Acknowledge partial understanding, and build on it.
Offer hints only after 1–2 student responses.
Keep tone conversational and encouraging, not robotic.
Example:
Tutor: “When a car speeds up, what’s actually changing — its distance, time, or speed?”

Student: “Speed!”

Tutor: “Right! So that change in speed over time has a name… any guesses?”
4️⃣ Mini-Explanations (only when needed)
Once the student gets close, give a simple, clear explanation in plain language.
Use analogies from daily life.
“Exactly! Like when you press the accelerator — your speed changes over time, and that’s called acceleration.”
5️⃣ Reflection & Summary
Ask the student to teach it back or summarize.
“Can you explain that to me in your own words?”
End with a short, polished recap.
“Perfect. In short — acceleration is how quickly speed changes, measured in m/s².”
6️⃣ Encourage Confidence & Closure
Celebrate progress (“Nice work 🚀 You really got that!”).
If needed, suggest a follow-up question or quick reattempt.
Keep it light and motivating.
⚙️ Behavior Rules
✅ DO:
Ask questions that lead to discovery
Praise effort and reasoning, not just correctness
Wait for student responses — don’t rush
Match student’s pace and comprehension level
Use the student’s name occasionally to personalize
Keep responses short (2–3 sentences max) and natural
❌ DON’T:
Give direct answers too early
Use jargon or complex terms
Show impatience or frustration
Move too fast or skip reasoning steps
🛡️ Safety & Boundaries
If the student seems frustrated:
“Let’s take a quick breather — we can revisit this in a moment.”
If the student goes off-topic repeatedly:
“That’s an interesting thought! Let’s finish this question first, then we can chat about that.”
If the student behaves inappropriately:
End the session gracefully with:

“I think we should pause here. Let’s continue when we’re both ready to learn again.”
Keep all interactions educational, safe, and respectful.
 
      `,
      
      });
      
       

      // Create session with transcription configuration
      // Using deprecated format for better compatibility
      const sessionConfig = {
        model: 'gpt-4o-mini-realtime-preview',
        config: {
          inputAudioTranscription: {
            model: 'gpt-4o-mini-transcribe'
          },
          turnDetection: {
            type: 'server_vad',
            threshold: 0.5,
            prefixPaddingMs: 300,
            silenceDurationMs: 500
          }
        }
      };
      const newSession = new RealtimeSession(agent, sessionConfig);

      // Connect to session
      await newSession.connect({
        apiKey: ephemeralKey,
      });

      // Listen for all events to debug
      (newSession as RealtimeEventHandlers).on('*', (event: unknown) => {
        const eventObj = event as { type?: string; event?: string };
        console.log('Realtime event:', eventObj.type || eventObj.event, event);
      });

      // Listen for speech events
      (newSession as RealtimeEventHandlers).on('input_audio_buffer.speech_started', () => {
        console.log('Speech started - User speaking');
        setIsListening(true);
        setIsAISpeaking(false); // User is speaking, so AI is not
      });

      (newSession as RealtimeEventHandlers).on('input_audio_buffer.speech_stopped', () => {
        console.log('Speech stopped - User stopped');
        setIsListening(false);
      });

      // Listen for final transcription using the correct event name
      (newSession as RealtimeEventHandlers).on('conversation.item.input_audio_transcription.completed', (...args: unknown[]) => {
        const event = args[0] as { transcript?: string; item_id?: string };
        console.log('Transcription completed:', event);
        if (event.transcript) {
          const userMessage = event.transcript;
          setMessages((prev) => [
            ...prev,
            {
              role: 'user',
              text: userMessage,
              timestamp: new Date(),
            },
          ]);
          setTranscript('');
        }
      });

      // Listen for response text deltas using the correct event name
      (newSession as RealtimeEventHandlers).on('audio_transcript_delta', (...args: unknown[]) => {
        const event = args[0] as { delta?: string; itemId?: string; responseId?: string };
        console.log('Response text delta:', event);
        if (event.delta) {
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMessage,
                  text: (lastMessage.text || '') + event.delta,
                },
              ];
            } else {
              return [
                ...prev,
                {
                  role: 'assistant' as const,
                  text: event.delta || '',
                  timestamp: new Date(),
                },
              ];
            }
          });
        }
      });

      // Listen for response creation (AI starts thinking/responding)
      (newSession as RealtimeEventHandlers).on('response.created', () => {
        console.log('🤖 Response created - AI starting');
        setIsAISpeaking(true);
        setIsListening(false);
      });

      // Listen for AI audio output start
      (newSession as RealtimeEventHandlers).on('response.audio.delta', () => {
        console.log('🤖 AI audio delta - speaking');
        setIsAISpeaking(true);
        setIsListening(false);
      });

      // Listen for AI audio chunk
      (newSession as RealtimeEventHandlers).on('response.audio_transcript.delta', () => {
        console.log('🤖 AI audio transcript delta - speaking');
        setIsAISpeaking(true);
        setIsListening(false);
      });

      // Listen for output item added
      (newSession as RealtimeEventHandlers).on('response.output_item.added', () => {
        console.log('🤖 Response output item added - AI responding');
        setIsAISpeaking(true);
        setIsListening(false);
      });

      // Listen for response started
      (newSession as RealtimeEventHandlers).on('response.started', () => {
        console.log('🤖 Response started - AI responding');
        setIsAISpeaking(true);
        setIsListening(false);
      });

      // Listen for response complete
      (newSession as RealtimeEventHandlers).on('response.done', () => {
        console.log('✅ Response done - AI finished');
        setIsAISpeaking(false);
        // Don't automatically set listening true, let mute state control it
      });

      // Listen for audio response completion
      (newSession as RealtimeEventHandlers).on('response.audio.done', () => {
        console.log('✅ Audio done - AI finished speaking');
        setIsAISpeaking(false);
      });

      // Listen for response output item done
      (newSession as RealtimeEventHandlers).on('response.output_item.done', () => {
        console.log('✅ Output item done - AI finished');
        setIsAISpeaking(false);
      });

      // Listen for session disconnect
      (newSession as RealtimeEventHandlers).on('session.disconnected', () => {
        console.log('Session disconnected');
        setIsConnected(false);
        setIsListening(false);
        setSession(null);
        setShowApiKeyInput(true);
        setMessages([]);
        setTranscript('');
        setError('');
      });

      // Listen for mute state changes
      (newSession as RealtimeEventHandlers).on('transport.mute_changed', (...args: unknown[]) => {
        const event = args[0] as { muted?: boolean };
        console.log('Mute state changed:', event);
        if (typeof event.muted === 'boolean') {
          setIsListening(!event.muted);
        }
      });

      // Helper function to extract text from content array
      const extractTextFromContent = (content: unknown): string => {
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
          return content
            .map((item: Record<string, unknown>) => {
              if (item.type === 'text' && item.text) return item.text as string;
              if (item.type === 'input_text' && item.text) return item.text as string;
              if (item.type === 'input_audio' && item.transcript) return item.transcript as string;
              if (item.type === 'audio' && item.transcript) return item.transcript as string;
              if (item.transcript) return item.transcript as string;
              if (item.text) return item.text as string;
              return '';
            })
            .filter(Boolean)
            .join(' ');
        }
        return '';
      };

      // Listen for history updates to get transcription data
      (newSession as RealtimeEventHandlers).on('history_added', (...args: unknown[]) => {
        const item = args[0] as Record<string, unknown>;
        console.log('History item added:', item);
        
        // Check if it's a user input item with transcription
        if (item.type === 'input_audio_transcription' && typeof item.transcript === 'string') {
          setMessages((prev) => [
            ...prev,
            {
              role: 'user' as const,
              text: item.transcript as string,
              timestamp: new Date(),
            },
          ]);
        }
        
        // Check if it's a message item (user or assistant)
        if (item.type === 'message' && item.content) {
          const text = extractTextFromContent(item.content);
          if (text && typeof item.role === 'string') {
            setMessages((prev) => [
              ...prev,
              {
                role: item.role === 'user' ? 'user' as const : 'assistant' as const,
                text: text,
                timestamp: new Date(),
              },
            ]);
          }
        }
      });

      // Listen for history updates
      (newSession as RealtimeEventHandlers).on('history_updated', (...args: unknown[]) => {
        const history = args[0] as Record<string, unknown>[];
        console.log('History updated:', history);
        
        // Convert history items to messages
        const newMessages: Message[] = [];
        history.forEach((item) => {
          if (item.type === 'input_audio_transcription' && typeof item.transcript === 'string') {
            newMessages.push({
              role: 'user' as const,
              text: item.transcript as string,
              timestamp: new Date(typeof item.created_at === 'string' ? item.created_at : Date.now()),
            });
          } else if (item.type === 'message' && item.content && typeof item.role === 'string') {
            const text = extractTextFromContent(item.content);
            if (text) {
              newMessages.push({
                role: item.role === 'user' ? 'user' as const : 'assistant' as const,
                text: text,
                timestamp: new Date(typeof item.created_at === 'string' ? item.created_at : Date.now()),
              });
            }
          }
        });
        
        setMessages(newMessages);
      });

      // Set connected state
      setIsConnected(true);
      setShowApiKeyInput(false);
      // Start muted by default
      (newSession as RealtimeEventHandlers).mute(true);
      setIsListening(false);

      setSession(newSession);
      setError('');

      // Notify AI that student is viewing the question
      setTimeout(() => {
        if (newSession && attemptCount === 0) {
          notifyAI(newSession, 'QUESTION_SHOWN');
        }
      }, 800);

      // If autoUnmute is enabled (for question transitions), automatically unmute
      if (autoUnmute) {
          // Small delay to ensure session is fully connected
        setTimeout(() => {
          if (newSession && !(newSession as RealtimeEventHandlers).muted) {
            // Already unmuted, do nothing
          } else if (newSession) {
            (newSession as RealtimeEventHandlers).mute(false);
            setIsListening(true);
          }
          setAutoUnmute(false); // Reset the flag
        }, 500);
      }
    } catch (err: unknown) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to voice assistant');
      setAutoUnmute(false); // Reset flag on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {

    if (session) {
    (session as RealtimeEventHandlers).on("input_audio_buffer.speech_started", () => {
      console.log("🎤 User started speaking");
    });
    
    (session as RealtimeEventHandlers).on("input_audio_buffer.speech_ended", () => {
      console.log("🛑 User stopped speaking");
    });

    (session as RealtimeEventHandlers).on("response.audio.delta", () => {
      console.log("AI is speaking...");
    });
    
    (session as RealtimeEventHandlers).on("response.completed", () => {
      console.log("✅ AI finished speaking");
    });

    }
    
  }, [session]);


  const disconnect = async (): Promise<void> => {
    if (session) {
      try {
        // Properly disconnect the session using the correct API
        console.log('Disconnecting session...');
        (session as RealtimeEventHandlers).close();
        
      } catch (error) {
        console.error('Error disconnecting session:', error);
      } finally {
        // Clean up state regardless of disconnect success
        setSession(null);
        setIsConnected(false);
        setIsListening(false);
        setTranscript('');
        setMessages([]);
        setShowApiKeyInput(true);
        setError('');
        setCurrentQuestionIndex(0);
        setQuestionsCompleted(0);
        setSelectedAnswer(null);
        setIsSubmitted(false);
        setIsCorrect(null);
        setAutoUnmute(false);
        setAttemptCount(0);
        setTextInput('');
        setIsSending(false);
        // Stop speech recognition if it's running
        if (listening) {
          SpeechRecognition.stopListening();
        }
      }
    }
  };

  const nextQuestion = async (): Promise<void> => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      const newQuestionIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(newQuestionIndex);
      if (isSubmitted && isCorrect) {
        setQuestionsCompleted(questionsCompleted + 1);
      }
      setMessages([]);
      setSelectedAnswer(null);
      setIsSubmitted(false);
      setIsCorrect(null);
      setAttemptCount(0); // Reset attempt count for new question
      
      // If session is connected, automatically reconnect with new question context
      if (session && isConnected) {
        setIsLoading(true);
        setIsAISpeaking(false);
        setIsListening(false);
        
        try {
          // Interrupt AI if it's speaking and close the session
          (session as RealtimeEventHandlers).close();
          
          // Small delay to ensure clean disconnection
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Set flag to automatically unmute after reconnection
          setAutoUnmute(true);
          
          // Automatically reconnect with new question context
          // Pass the new question index explicitly to ensure correct context
          await connectToSession(newQuestionIndex);
          
        } catch (error) {
          console.error('Error transitioning to next question:', error);
          setError('Failed to load next question. Please try connecting again.');
          setIsConnected(false);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleSelectAnswer = (answer: string): void => {
    if (!isSubmitted) {
      setSelectedAnswer(answer);
    }
  };

  const handleSubmitAnswer = (): void => {
    if (!selectedAnswer || selectedAnswer.trim() === '') {
      setError('Please provide an answer first');
      return;
    }

    const currentQuestion = quizQuestions[currentQuestionIndex];
    let correct = false;
    
    if (currentQuestion.type === 'multiple-choice') {
      // Exact match for multiple choice
      correct = selectedAnswer === currentQuestion.answer;
    } else {
      // Case-insensitive and flexible matching for open-ended
      const userAnswer = selectedAnswer.trim().toLowerCase();
      const correctAnswer = currentQuestion.answer.toLowerCase();
      
      // Check for exact match or if the answer contains the key words
      correct = userAnswer === correctAnswer || 
                correctAnswer.split(/[,\s]+/).every(word => userAnswer.includes(word.toLowerCase()));
    }
    
    // Increment attempt count
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    
    setIsCorrect(correct);
    setIsSubmitted(true);
    setError('');
    
    if (correct) {
      setQuestionsCompleted(questionsCompleted + 1);
    }
    
    // Notify AI about the attempt
    if (session) {
      notifyAI(session, 'ATTEMPT_RECORDED', {
        count: newAttemptCount,
        result: correct ? 'correct' : 'incorrect'
      });
    }
    
    // If incorrect and first or second attempt, allow retry
    if (!correct && newAttemptCount < 2) {
      // Clear selected answer to allow retry
      setTimeout(() => {
        setSelectedAnswer(null);
        setIsSubmitted(false);
      }, 3000); // Show feedback for 3 seconds before allowing retry
    }
  };

  const handleSkipQuestion = async (): Promise<void> => {
    // Reset submission state but don't count as completed
    setSelectedAnswer(null);
    setIsSubmitted(false);
    setIsCorrect(null);
    setAttemptCount(0);
    await nextQuestion();
  };

  const startListening = async (): Promise<void> => {
    if (!session || !isConnected) {
      setError('Please connect first');
      return;
    }

    try {
      // Use the correct mute API - false means unmuted (listening)
      (session as RealtimeEventHandlers).mute(false);
      setIsListening(true);
      setTranscript('');
      setError('');
      
      console.log('Started listening for audio input');
    } catch (err: unknown) {
      console.error('Listening error:', err);
      setError('Failed to start listening');
      setIsListening(false);
    }
  };

  const stopListening = async (): Promise<void> => {
    if (!session) return;
    
    try {
      // Use the correct mute API - true means muted (not listening)
      (session as RealtimeEventHandlers).mute(true);
      setIsListening(false);
      setTranscript('');
      
      console.log('Stopped listening for audio input');
    } catch (err: unknown) {
      console.error('Error stopping listening:', err);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, transcript]);

  // Cleanup effect for session and browser tab indicator
  useEffect(() => {
    return () => {
      // Cleanup session on component unmount
      if (session) {
        console.log('Cleaning up session on unmount');
        // Just clean up state, the session will be garbage collected
      }
    };
  }, [session]);

  // Handle browser tab visibility and audio indicator
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && session) {
        // Optionally pause listening when tab is hidden
        console.log('Tab hidden, session still active');
      } else if (!document.hidden && session) {
        // Resume when tab becomes visible
        console.log('Tab visible, session active');
      }
    };

    const handleBeforeUnload = () => {
      // Force cleanup when page is about to unload
      if (session) {
        console.log('Page unloading, cleaning up session');
        (session as RealtimeEventHandlers).close();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session]);

  // Sync UI state with session state periodically
  useEffect(() => {
    if (!session || !isConnected) return;

    const syncInterval = setInterval(() => {
      if (session) {
        const actualMuted = (session as RealtimeEventHandlers).muted;
        if (typeof actualMuted === 'boolean') {
          const shouldBeListening = !actualMuted;
          if (isListening !== shouldBeListening) {
            console.log('Syncing mute state:', { actualMuted, shouldBeListening, currentState: isListening });
            setIsListening(shouldBeListening);
          }
        }
      }
    }, 1000); // Check every second

    return () => clearInterval(syncInterval);
  }, [session, isConnected, isListening]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setApiKey(e.target.value);
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setTextInput(e.target.value);
  };

  // Sync speech transcript to text input
  useEffect(() => {
    if (speechTranscript) {
      setTextInput(speechTranscript);
    }
  }, [speechTranscript]);

  const startSpeechRecognition = (): void => {
    if (!listening && browserSupportsSpeechRecognition) {
      try {
        setError('');
        resetTranscript();
        SpeechRecognition.startListening({ continuous: false, language: 'en-US' });
        console.log('Speech recognition started');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setError('Failed to start speech recognition');
      }
    }
  };

  const stopSpeechRecognition = (): void => {
    if (listening) {
      SpeechRecognition.stopListening();
      console.log('Speech recognition stopped');
    }
  };

  const handleSendText = async (): Promise<void> => {
    if (!textInput.trim() || !session) {
      setError('Please enter a question first');
      return;
    }

    setIsSending(true);
    setError('');

    try {
      console.log('Sending text message:', textInput);
      
      // Add the message to our local state first
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          text: textInput,
          timestamp: new Date(),
        },
      ]);
      
      // Send the message through the session
      const sessionAny = session as unknown as Record<string, unknown>;
      if (typeof sessionAny.sendMessage === 'function') {
        console.log('Using sendMessage method');
        try {
          (sessionAny.sendMessage as (message: string) => void)(textInput);
          console.log('Message sent to AI successfully');
        } catch (messageError) {
          console.log('Message send failed:', messageError);
          setError('Failed to send message to AI');
        }
      } else {
        console.log('sendMessage method not available');
        setError('Unable to send message - session not properly configured');
      }
      
      // Clear the input
      setTextInput('');
      
      console.log('Text message processing completed');
    } catch (err: unknown) {
      console.error('Error sending text:', err);
      setError(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          🧪 Science Quiz - Voice Tutor
        </h1>

        {/* Quiz Progress */}
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Progress: {currentQuestionIndex + 1} / {quizQuestions.length}
            </span>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              Completed: {questionsCompleted}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Current Question Display */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border-l-4 border-blue-600">
          <div className="flex items-start justify-between mb-3">
            <div className="flex gap-2 items-center">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                {quizQuestions[currentQuestionIndex].subject}
              </span>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                quizQuestions[currentQuestionIndex].type === 'multiple-choice'
                  ? 'bg-purple-200 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300'
                  : 'bg-orange-200 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300'
              }`}>
                {quizQuestions[currentQuestionIndex].type === 'multiple-choice' ? 'Multiple Choice' : 'Open-Ended'}
              </span>
            </div>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Question {currentQuestionIndex + 1}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {quizQuestions[currentQuestionIndex].question}
          </h2>
          
          {/* Multiple Choice Options */}
          {quizQuestions[currentQuestionIndex].type === 'multiple-choice' && quizQuestions[currentQuestionIndex].options && (
            <div className="mb-4 space-y-2">
              {quizQuestions[currentQuestionIndex].options!.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrectAnswer = isSubmitted && option === quizQuestions[currentQuestionIndex].answer;
                const isWrongAnswer = isSubmitted && isSelected && !isCorrectAnswer;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleSelectAnswer(option)}
                    disabled={isSubmitted}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      isCorrectAnswer
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-600'
                        : isWrongAnswer
                        ? 'bg-red-100 dark:bg-red-900/30 border-red-500 dark:border-red-600'
                        : isSelected
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                    } ${isSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full font-semibold text-sm ${
                      isCorrectAnswer
                        ? 'bg-green-500 text-white'
                        : isWrongAnswer
                        ? 'bg-red-500 text-white'
                        : isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className={`flex-1 text-left ${
                      isCorrectAnswer
                        ? 'text-green-900 dark:text-green-100 font-semibold'
                        : isWrongAnswer
                        ? 'text-red-900 dark:text-red-100'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {option}
                    </span>
                    {isCorrectAnswer && <span className="text-green-600 dark:text-green-400 text-xl">✓</span>}
                    {isWrongAnswer && <span className="text-red-600 dark:text-red-400 text-xl">✗</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Open-Ended Answer Input */}
          {quizQuestions[currentQuestionIndex].type === 'open-ended' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Answer:
              </label>
              <input
                type="text"
                value={selectedAnswer || ''}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                disabled={isSubmitted}
                placeholder="Type your answer here..."
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all ${
                  isSubmitted
                    ? 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 cursor-not-allowed'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              />
            </div>
          )}

          
          {/* Submit and Skip Buttons */}
          <div className="flex gap-2">
            {!isSubmitted || (!isCorrect && attemptCount < 2) ? (
              <>
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer || isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold transition-all"
                >
                  {attemptCount === 0 ? 'Submit Answer' : 'Try Again'}
                </button>
                {currentQuestionIndex < quizQuestions.length - 1 && attemptCount === 0 && (
                  <button
                    onClick={handleSkipQuestion}
                    disabled={isLoading}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold transition-all"
                  >
                    Skip Question
                  </button>
                )}
              </>
            ) : (
              <>
                {currentQuestionIndex < quizQuestions.length - 1 ? (
                  <button
                    onClick={nextQuestion}
                    disabled={isLoading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-sm font-semibold transition-all"
                  >
                    {isLoading ? 'Loading Next Question...' : 'Next Question →'}
                  </button>
                ) : (
                  <div className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-2">
                    <span className="text-2xl">🎉</span>
                    <span>Quiz Complete! Great job!</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Feedback and Explanation */}
          {isSubmitted && (
            <div className={`mt-4 p-4 rounded-lg border-2 ${
              isCorrect
                ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600'
                : attemptCount < 2
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 dark:border-yellow-600'
                : 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-600'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{isCorrect ? '✓' : '✗'}</span>
                  <h3 className={`text-lg font-bold ${
                    isCorrect
                      ? 'text-green-800 dark:text-green-200'
                      : attemptCount < 2
                      ? 'text-yellow-800 dark:text-yellow-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {isCorrect ? 'Correct!' : attemptCount < 2 ? 'Not Quite!' : 'Incorrect'}
                  </h3>
                </div>
                <span className="text-xs font-semibold px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                  Attempt {attemptCount}/2
                </span>
              </div>
              
              {!isCorrect && attemptCount < 2 && (
                <div className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                  <p className="font-semibold mb-1">💡 Try Again!</p>
                  <p>You have one more attempt. Talk to your AI tutor for a hint, or try again!</p>
                  <p className="mt-2 text-xs italic">This feedback will clear in 3 seconds...</p>
                </div>
              )}
              
              {!isCorrect && attemptCount >= 2 && (
                <div className="text-sm text-red-700 dark:text-red-300 mb-2">
                  <p className="mb-1">The correct answer is: <span className="font-semibold">{quizQuestions[currentQuestionIndex].answer}</span></p>
                </div>
              )}
              
              {(isCorrect || attemptCount >= 2) && (
                <div className={`text-sm ${
                  isCorrect
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  <p className="font-semibold mb-1">Explanation:</p>
                  <p>{quizQuestions[currentQuestionIndex].explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* API Key Input */}
        {showApiKeyInput && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              OpenAI API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="sk-proj-..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={() => connectToSession()}
                disabled={isLoading || !apiKey}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Your API key is used to generate a secure ephemeral token and is never stored.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Connection Status */}
        {isConnected && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-800 dark:text-green-200 font-medium">
                  Connected {isListening ? '(Listening)' : '(Muted)'}
                </span>
              </div>
              <button
                onClick={disconnect}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Listening Controls */}
        {isConnected && (
          <div className="mb-6">
            <div className="flex gap-4 items-center justify-center">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`px-8 py-4 rounded-full text-white font-semibold text-lg transition-all ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isListening ? '⏹ Mute' : '🎤 Unmute'}
              </button>
            </div>
            
            {/* Debug State Display - Remove after testing */}
            <div className="text-xs text-center mb-2 font-mono text-gray-500">
              Debug: isAISpeaking={isAISpeaking.toString()} | isListening={isListening.toString()}
            </div>
            
            {/* Waveform Animations */}
            <div className="mt-4 h-20 flex items-center justify-center">
              {isAISpeaking ? (
                // AI Speaking - Smooth flowing wave pattern
                <div className="flex items-center gap-1.5">
                  {[...Array(25)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-gradient-to-t from-purple-600 via-pink-500 to-purple-400 rounded-full shadow-lg"
                      style={{
                        height: '8px',
                        animation: `aiSpeakWave 1.2s ease-in-out infinite`,
                        animationDelay: `${i * 0.04}s`,
                        filter: 'blur(0.5px)'
                      }}
                    />
                  ))}
                  <style jsx>{`
                    @keyframes aiSpeakWave {
                      0%, 100% { 
                        height: 10px; 
                        opacity: 0.6;
                      }
                      50% { 
                        height: 60px; 
                        opacity: 1;
                      }
                    }
                  `}</style>
                </div>
              ) : isListening ? (
                // User Listening - Active pulse bars
                <div className="flex items-center gap-2">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 bg-gradient-to-t from-green-500 via-emerald-400 to-green-300 rounded-full shadow-md"
                      style={{
                        height: '8px',
                        animation: `userListenWave 0.9s ease-in-out infinite`,
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                  <style jsx>{`
                    @keyframes userListenWave {
                      0%, 100% { 
                        height: 16px; 
                        transform: scaleY(1);
                        opacity: 0.7;
                      }
                      50% { 
                        height: 48px; 
                        transform: scaleY(1.1);
                        opacity: 1;
                      }
                    }
                  `}</style>
                </div>
              ) : (
                // Muted - Static bars
                <div className="flex items-center gap-1.5">
                  {[...Array(15)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-gray-400 dark:bg-gray-600 rounded-full"
                      style={{ height: '10px' }}
                    />
                  ))}
                </div>
              )}
            </div>
            
            <div className="text-center mt-3">
              {isAISpeaking ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <span className="text-lg">🤖</span>
                  <p className="text-sm text-purple-700 dark:text-purple-300 font-semibold">
                    AI Tutor is speaking...
                  </p>
                </div>
              ) : isListening ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <span className="text-lg">🎤</span>
                  <p className="text-sm text-green-700 dark:text-green-300 font-semibold">
                    Listening... Speak now!
                  </p>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <span className="text-lg">🔇</span>
                  <p className="text-sm text-gray-700 dark:text-gray-400 font-medium">
                    Muted - Click unmute to start
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Text Input Section */}
        {isConnected && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
              <span>💬</span>
              Ask Your Question
            </h3>
            
            <div className="space-y-4">
              {/* Text Input */}
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={textInput}
                  onChange={handleTextInputChange}
                  placeholder="Type your question here... (e.g., 'What is tissue?')"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isSending) {
                      handleSendText();
                    }
                  }}
                />
                
                {/* Microphone Button */}
                {browserSupportsSpeechRecognition && (
                  <button
                    onClick={listening ? stopSpeechRecognition : startSpeechRecognition}
                    disabled={isSending}
                    className={`px-4 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                      listening
                        ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                    title={listening ? 'Stop listening' : 'Start voice input'}
                  >
                    {listening ? (
                      <>
                        <span>⏹️</span>
                        Stop
                      </>
                    ) : (
                      <>
                        <span>🎤</span>
                        Voice
                      </>
                    )}
                  </button>
                )}
                
                <button
                  onClick={handleSendText}
                  disabled={isSending || !textInput.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-all flex items-center gap-2"
                >
                  {isSending ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <span>📤</span>
                      Send
                    </>
                  )}
                </button>
              </div>
              
              {/* Help Text */}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p>Type your question and press Enter or click Send to ask the AI tutor.</p>
                {browserSupportsSpeechRecognition && (
                  <p className="mt-1 text-green-600 dark:text-green-400">
                    🎤 Click the Voice button to speak your question instead of typing!
                  </p>
                )}
                <p className="mt-1 text-blue-600 dark:text-blue-400">
                  💡 Try asking: &quot;What is tissue?&quot; or &quot;Can you explain photosynthesis?&quot;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chat History */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Conversation
          </h2>
          
          {/* Helpful Tips */}
          {isConnected && messages.length === 0 && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">💡 Helpful Tips:</h3>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>• Try answering the question on your own first</li>
                <li>• Ask &quot;Can you explain this question?&quot; if you need help understanding</li>
                <li>• Say &quot;I&apos;m stuck&quot; or &quot;I need a hint&quot; if you&apos;re having trouble</li>
                <li>• The tutor will guide you step-by-step without giving away the answer</li>
              </ul>
            </div>
          )}
          
          <div className="space-y-4 max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            {messages.length === 0 && !transcript ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                Click &quot;Unmute&quot; to start talking with your tutor about the question above
              </p>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">
                          {message.role === 'user' ? 'You' : 'Assistant'}
                        </span>
                        <span className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{message.text}</p>
                    </div>
                  </div>
                ))}
                
                {/* Show current transcript while speaking */}
                {transcript && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-lg px-4 py-3 bg-blue-500 text-white opacity-70">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">You (speaking...)</span>
                      </div>
                      <p className="whitespace-pre-wrap">{transcript}</p>
                    </div>
                  </div>
                )}
                
                {/* Scroll anchor */}
                <div ref={chatEndRef} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

