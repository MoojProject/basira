import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  SendIcon,
  Loader2Icon,
  BotIcon,
  UserIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  LockIcon,
  MicIcon,
  MicOffIcon,
} from 'lucide-react';
import type { ChatMessage } from '../data/mockData';
import { generalChatSuggestions } from '../data/mockData';
import { askGeneralQuestion } from '../services/api';
import { SuggestedQuestions } from './SuggestedQuestions';

interface GeneralChatProps {
  advisorGreeting?: string;
  advisorName?: string;
  suggestions?: string[];
  user?: any;
  onOpenAuth?: () => void;
  namespace?: string;

}

const GUEST_QUESTION_LIMIT = 3;
const GUEST_COUNT_KEY = 'basira_guest_general_chat_count';

export function GeneralChat({
  advisorGreeting,
  advisorName,
  suggestions,
  user,
  onOpenAuth,
  namespace,
}: GeneralChatProps) {
  const initialMessages: ChatMessage[] = [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        advisorGreeting ||
        'مرحبًا! أنا المستشار القانوني الذكي. اسألني عن أي موضوع يخص عقود العمل، الإيجار، أو السرية في السعودية.',
      timestamp: new Date(),
    },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestQuestionCount, setGuestQuestionCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── إدخال صوتي ──
  const startVoiceInput = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => prev + transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, []);

  const stopVoiceInput = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const isGuest = !user;
  const remainingGuestQuestions = Math.max(
    0,
    GUEST_QUESTION_LIMIT - guestQuestionCount
  );
  const guestLimitReached = isGuest && guestQuestionCount >= GUEST_QUESTION_LIMIT;

  useEffect(() => {
    const stored = localStorage.getItem(GUEST_COUNT_KEY);
    const parsed = stored ? Number(stored) : 0;
    setGuestQuestionCount(Number.isNaN(parsed) ? 0 : parsed);
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.removeItem(GUEST_COUNT_KEY);
      setGuestQuestionCount(0);
      setError(null);
    }
  }, [user]);

  const headerTitle = advisorName
    ? `${advisorName} — المستشار القانوني`
    : 'المستشار القانوني الذكي';

  const headerSubtitle = advisorName
    ? `محادثة مع ${advisorName}`
    : 'اسأل عن أي موضوع يخص عقود العمل، الإيجار، أو السرية في السعودية';

  const limitMessage = useMemo(() => {
    if (!isGuest) return null;
    if (guestLimitReached) {
      return 'وصلت للحد المجاني للتجربة. أنشئ حسابك لمتابعة المحادثة مع المستشارين القانونيين.';
    }
    return `متبقي لك ${remainingGuestQuestions} ${
      remainingGuestQuestions === 1 ? 'سؤال' : 'أسئلة'
    } في التجربة المجانية.`;
  }, [isGuest, guestLimitReached, remainingGuestQuestions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, error]);

  const handleLimitReached = () => {
    setError(
      'وصلت للحد المجاني للتجربة. أنشئ حسابك لمتابعة المحادثة مع المستشارين القانونيين.'
    );
    if (onOpenAuth) {
      onOpenAuth();
    }
  };

  const incrementGuestCount = () => {
    const next = guestQuestionCount + 1;
    setGuestQuestionCount(next);
    localStorage.setItem(GUEST_COUNT_KEY, String(next));
    return next;
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    if (isGuest && guestLimitReached) {
      handleLimitReached();
      return;
    }

    setError(null);

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let guestCountAfterSend = guestQuestionCount;

    try {
      if (isGuest) {
        guestCountAfterSend = incrementGuestCount();
      }

      const responseMsg = await askGeneralQuestion(text, [], namespace || 'both');
      setMessages((prev) => [...prev, responseMsg]);

      if (isGuest && guestCountAfterSend >= GUEST_QUESTION_LIMIT) {
        setTimeout(() => {
          setError(
            'استخدمت كامل الأسئلة المجانية. أنشئ حسابك للمتابعة مع المستشارين القانونيين.'
          );
        }, 100);
      }
    } catch (err) {
      console.error('Failed to get response', err);

      if (isGuest) {
        const rolledBack = Math.max(0, guestCountAfterSend - 1);
        setGuestQuestionCount(rolledBack);
        localStorage.setItem(GUEST_COUNT_KEY, String(rolledBack));
      }

      setError(
        'عذراً، حدث خطأ أثناء الاتصال بالمستشار. يرجى المحاولة مرة أخرى.'
      );
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setInput(text);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSuggestedQuestion = (question: string) => {
    if (guestLimitReached) {
      handleLimitReached();
      return;
    }
    handleSend(question);
  };

  return (
    <div className="max-w-4xl mx-auto w-full bg-eclipse-2 rounded-2xl shadow-xl border border-eclipse-3 flex flex-col h-[700px]">
      <div className="p-6 border-b border-eclipse-3 bg-eclipse/80 rounded-t-2xl flex items-center gap-4">
        <div className="bg-matcha/20 p-3 rounded-xl border border-matcha/30">
          <ShieldCheckIcon className="w-6 h-6 text-matcha-light" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold font-heading text-cream">
            {headerTitle}
          </h2>
          <p className="text-cream-dim text-sm mt-1">{headerSubtitle}</p>
        </div>
      </div>

      {isGuest && (
        <div className="px-6 py-4 border-b border-eclipse-3 bg-matcha/5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-cream">تجربة مجانية</p>
              <p
                className={`text-sm mt-1 ${
                  guestLimitReached ? 'text-danger' : 'text-cream-dim'
                }`}
              >
                {limitMessage}
              </p>
            </div>

            {guestLimitReached && (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 bg-matcha text-eclipse rounded-xl font-heading font-bold hover:bg-matcha-light transition-colors"
              >
                أنشئ حسابك
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-eclipse/30">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm border ${
                msg.role === 'user'
                  ? 'bg-eclipse-3 border-eclipse-3'
                  : 'bg-matcha border-matcha-dim text-eclipse'
              }`}
            >
              {msg.role === 'user' ? (
                <UserIcon className="w-5 h-5 text-cream" />
              ) : (
                <BotIcon className="w-5 h-5" />
              )}
            </div>

            <div
              className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                msg.role === 'user'
                  ? 'bg-eclipse-3 text-cream rounded-tr-sm'
                  : 'bg-eclipse border border-matcha-dim/50 text-cream-dim rounded-tl-sm whitespace-pre-wrap leading-relaxed'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-matcha border border-matcha-dim text-eclipse flex items-center justify-center shadow-sm">
              <BotIcon className="w-5 h-5" />
            </div>
            <div className="bg-eclipse border border-matcha-dim/50 p-4 rounded-2xl rounded-tl-sm flex items-center gap-3 shadow-sm">
              <Loader2Icon className="w-5 h-5 text-matcha animate-spin" />
              <span className="text-sm font-medium text-cream-muted">
                جاري البحث في المراجع القانونية...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-danger/20 border border-danger/30 text-danger flex items-center justify-center shadow-sm">
              {guestLimitReached ? (
                <LockIcon className="w-5 h-5" />
              ) : (
                <AlertCircleIcon className="w-5 h-5" />
              )}
            </div>
            <div className="bg-danger/10 border border-danger/20 p-4 rounded-2xl rounded-tl-sm text-sm text-danger shadow-sm">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 border-t border-eclipse-3 bg-eclipse/50 rounded-b-2xl">
        <SuggestedQuestions
          questions={suggestions || generalChatSuggestions}
          onSelect={handleGuestSuggestedQuestion}
        />

        <div className="relative mt-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder={
              isRecording
                ? '🎤 جارٍ الاستماع…'
                : guestLimitReached
                ? 'أنشئ حسابك لمتابعة المحادثة...'
                : 'اكتب سؤالك أو اضغط المايك...'
            }
            className={`w-full bg-eclipse border rounded-xl py-4 pr-4 pl-28 text-cream placeholder-cream-muted focus:outline-none transition-all text-base ${
              isRecording
                ? 'border-warn focus:border-warn focus:ring-1 focus:ring-warn'
                : 'border-eclipse-3 focus:border-matcha focus:ring-1 focus:ring-matcha'
            }`}
            disabled={isLoading || guestLimitReached}
          />

          {/* زر المايك */}
          <button
            onClick={isRecording ? stopVoiceInput : startVoiceInput}
            disabled={isLoading || guestLimitReached}
            title={isRecording ? 'إيقاف التسجيل' : 'إدخال صوتي'}
            className={`absolute left-14 top-1/2 -translate-y-1/2 p-3 rounded-lg transition-colors disabled:opacity-50 ${
              isRecording
                ? 'bg-warn/20 text-warn hover:bg-warn/30 animate-pulse'
                : 'text-cream-muted hover:text-cream hover:bg-eclipse-3'
            }`}
          >
            {isRecording ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
          </button>

          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isLoading || guestLimitReached}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-matcha text-eclipse rounded-lg hover:bg-matcha-light disabled:opacity-50 disabled:hover:bg-matcha transition-colors"
          >
            <SendIcon className="w-5 h-5 rtl:-scale-x-100" />
          </button>
        </div>

        {isGuest && guestLimitReached && (
          <button
            onClick={onOpenAuth}
            className="mt-4 w-full py-3 px-5 bg-matcha text-eclipse rounded-xl font-heading font-extrabold hover:bg-matcha-light transition-colors shadow-md"
          >
            أنشئ حسابك لمتابعة المحادثة
          </button>
        )}
      </div>
    </div>
  );
}