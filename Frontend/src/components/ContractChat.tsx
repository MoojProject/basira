import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  SendIcon,
  Loader2Icon,
  BotIcon,
  UserIcon,
  AlertCircleIcon,
  LockIcon,
  MicIcon,
  MicOffIcon,
} from 'lucide-react';
import type { ChatMessage, AnalysisResult } from '../data/mockData';
import { contractChatSuggestions } from '../data/mockData';
import { askAboutContract, getContractHistory } from '../services/api';
import { SuggestedQuestions } from './SuggestedQuestions';
 
interface ContractChatProps {
  fileId: string;
  sessionId?: string | null;
  analysisResult: AnalysisResult;
  initialMessages: ChatMessage[];
  onOpenAuth: () => void;
}
 
export function ContractChat({
  fileId,
  sessionId,
  analysisResult,
  initialMessages,
  onOpenAuth,
}: ContractChatProps) {
  const userName = localStorage.getItem('basira_user')
    ? JSON.parse(localStorage.getItem('basira_user')!).name
    : null;
 
  const welcomeMessage: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: userName
      ? `أهلاً ${userName}! أنا هنا لمساعدتك في فهم عقدك. اسأل أي سؤال.`
      : 'أهلاً! أنا هنا لمساعدتك في فهم عقدك. اسأل أي سؤال.',
    timestamp: new Date(),
  };
 
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    recognition.onresult = (e: any) => {
      setInput((prev) => prev + e.results[0][0].transcript);
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
 
  const isGuestMode = !sessionId;
 
  useEffect(() => {
    if (!sessionId) return;
    getContractHistory(sessionId).then((history) => {
      const chatHistory = history.slice(1);
      if (chatHistory.length > 0) {
        setMessages(chatHistory);
      }
    });
  }, [sessionId]);
 
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
 
  useEffect(() => {
    scrollToBottom();
  }, [messages, error]);
 
  const handleSend = async (text: string) => {
    if (isGuestMode) return;
    if (!text.trim() || isLoading) return;
 
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
 
    try {
      const responseMsg = await askAboutContract(
        fileId,
        text,
        analysisResult,
        sessionId ?? undefined
      );
      setMessages((prev) => [...prev, responseMsg]);
    } catch (err) {
      console.error('Failed to get response', err);
      setError('عذراً، حدث خطأ أثناء الاتصال بالمستشار. يرجى المحاولة مرة أخرى.');
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setInput(text);
    } finally {
      setIsLoading(false);
    }
  };
 
  if (isGuestMode) {
    return (
      <div className="bg-eclipse-2 rounded-2xl shadow-lg border border-eclipse-3 flex flex-col h-[700px]">
        <div className="px-6 py-4 border-b border-eclipse-3 bg-eclipse/50 rounded-t-2xl flex items-center gap-3">
          <div className="bg-matcha/20 p-2.5 rounded-lg border border-matcha/30">
            <BotIcon className="w-5 h-5 text-matcha-light" />
          </div>
          <div>
            <h3 className="font-extrabold font-heading text-cream text-lg">
              اسأل عن هذا العقد
            </h3>
            <p className="text-xs text-cream-muted mt-1">
              هذه الميزة مخصصة للحسابات المسجلة
            </p>
          </div>
        </div>
 
        <div className="flex-1 px-6 py-6 bg-eclipse/30 flex items-center justify-center">
          <div className="w-full max-w-md text-center bg-matcha/5 border border-matcha/20 rounded-2xl p-8">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-matcha/10 border border-matcha/30 flex items-center justify-center">
              <LockIcon className="w-6 h-6 text-matcha" />
            </div>
 
            <h4 className="text-xl font-extrabold font-heading text-cream mb-3">
              أنشئ حسابك للسؤال عن عقدك
            </h4>
 
            <p className="text-sm text-cream-dim leading-7 mb-6">
              يمكنك تحليل العقد كضيف، لكن لطرح أسئلة مخصصة عن عقدك وحفظ المحادثة
              يلزم إنشاء حساب.
            </p>
 
            <div className="space-y-3 text-right bg-eclipse/50 border border-eclipse-3 rounded-xl p-4 mb-6">
              <p className="text-sm text-cream">بعد إنشاء الحساب يمكنك:</p>
              <ul className="text-sm text-cream-dim space-y-2">
                <li>• السؤال عن البنود الخطيرة والمهمة</li>
                <li>• متابعة المحادثة مع المستشار القانوني</li>
                <li>• حفظ التحليل والرجوع له لاحقًا</li>
              </ul>
            </div>
 
            <button
              onClick={onOpenAuth}
              className="w-full py-3 px-5 bg-matcha text-eclipse rounded-xl font-heading font-extrabold hover:bg-matcha-light transition-colors shadow-md"
            >
              أنشئ حسابك الآن
            </button>
 
            <p className="text-xs text-cream-muted mt-4">
              سجّل دخولك ثم أعد تحليل العقد لتفعيل المحادثة الخاصة به.
            </p>
          </div>
        </div>
 

      </div>
    );
  }
 
  return (
    <div className="bg-eclipse-2 rounded-2xl shadow-lg border border-eclipse-3 flex flex-col h-[700px]">
      <div className="px-6 py-4 border-b border-eclipse-3 bg-eclipse/50 rounded-t-2xl flex items-center gap-3">
        <div className="bg-matcha/20 p-2.5 rounded-lg border border-matcha/30">
          <BotIcon className="w-5 h-5 text-matcha-light" />
        </div>
        <div>
          <h3 className="font-extrabold font-heading text-cream text-lg">
            اسأل عن هذا العقد
          </h3>
          <p className="text-xs text-cream-muted mt-1">
            مساعدك القانوني جاهز للإجابة بناءً على التحليل
          </p>
        </div>
      </div>
 
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3 bg-eclipse/30">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${
                msg.role === 'user'
                  ? 'bg-eclipse-3 border-eclipse-3'
                  : 'bg-matcha border-matcha-dim text-eclipse'
              }`}
            >
              {msg.role === 'user' ? (
                <UserIcon className="w-4 h-4 text-cream" />
              ) : (
                <BotIcon className="w-4 h-4" />
              )}
            </div>
            <div
              className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-eclipse-3 text-cream rounded-tr-sm'
                  : 'bg-eclipse border border-matcha-dim/50 text-cream-dim rounded-tl-sm whitespace-pre-wrap'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
 
        {isLoading && (
          <div className="flex gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-matcha border border-matcha-dim text-eclipse flex items-center justify-center">
              <BotIcon className="w-4 h-4" />
            </div>
            <div className="bg-eclipse border border-matcha-dim/50 p-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
              <Loader2Icon className="w-4 h-4 text-matcha animate-spin" />
              <span className="text-sm text-cream-muted">جاري التفكير...</span>
            </div>
          </div>
        )}
 
        {error && (
          <div className="flex gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-danger/20 border border-danger/30 text-danger flex items-center justify-center">
              <AlertCircleIcon className="w-4 h-4" />
            </div>
            <div className="bg-danger/10 border border-danger/20 p-3 rounded-2xl rounded-tl-sm text-sm text-danger">
              {error}
            </div>
          </div>
        )}
 
        <div ref={messagesEndRef} />
      </div>
 
      <div className="px-6 py-4 border-t border-eclipse-3 bg-eclipse/50 rounded-b-2xl">
        <SuggestedQuestions questions={contractChatSuggestions} onSelect={handleSend} />
        <div className="relative mt-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder={isRecording ? '🎤 جارٍ الاستماع…' : 'اكتب سؤالك هنا...'}
            className={`w-full bg-eclipse border rounded-xl py-2.5 pr-4 pl-20 text-cream placeholder-cream-muted focus:outline-none transition-all text-sm ${
              isRecording
                ? 'border-warn focus:border-warn focus:ring-1 focus:ring-warn'
                : 'border-eclipse-3 focus:border-matcha focus:ring-1 focus:ring-matcha'
            }`}
            disabled={isLoading}
          />
          {/* زر المايك */}
          <button
            onClick={isRecording ? stopVoiceInput : startVoiceInput}
            disabled={isLoading}
            title={isRecording ? 'إيقاف' : 'إدخال صوتي'}
            className={`absolute left-11 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
              isRecording
                ? 'text-warn animate-pulse'
                : 'text-cream-muted hover:text-cream hover:bg-eclipse-3'
            }`}
          >
            {isRecording ? <MicOffIcon className="w-4 h-4" /> : <MicIcon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isLoading}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 bg-matcha text-eclipse rounded-lg hover:bg-matcha-light disabled:opacity-50 disabled:hover:bg-matcha transition-colors"
          >
            <SendIcon className="w-4 h-4 rtl:-scale-x-100" />
          </button>
        </div>
      </div>
    </div>
  );
}