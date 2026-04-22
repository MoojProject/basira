import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { Dashboard } from './components/Dashboard';
import { FeaturesSection } from './components/FeaturesSection';
import { WhyBasiraSection } from './components/WhyBasiraSection';

import { UploadArea } from './components/UploadArea';
import { AnalysisSummary } from './components/AnalysisSummary';
import { ClauseList } from './components/ClauseList';
import { ContractChat } from './components/ContractChat';
import { AdvisorChat } from './components/AdvisorChat';
import { AnalyzingProgress } from './components/AnalyzingProgress';
import { AuthModal } from './components/AuthModal';
import { ContractDraftModal } from './components/ContractDraftModal';

// Data & Services
import type { AnalysisResult } from './data/mockData';
import { mockContractChatMessages } from './data/mockData';
import { uploadContract, analyzeContract } from './services/api';
import { UploadCloudIcon, CheckCircle2Icon } from 'lucide-react';

// Hooks
import { useAuth } from './hooks/useAuth';

type ViewState = 'landing' | 'upload' | 'analyzing' | 'results' | 'general-chat';

function Toast({
  message,
  isVisible,
  onClose,
}: {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-eclipse-2 border border-eclipse-3 shadow-xl rounded-full px-6 py-3 flex items-center gap-3"
        >
          <CheckCircle2Icon className="w-5 h-5 text-safe" />
          <span className="text-sm font-medium text-cream">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function App() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const showNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const handleLogin = (name: string, email: string) => {
    const newUser = { name, email };
    localStorage.setItem('basira_user', JSON.stringify(newUser));
    window.location.reload();
  };

  const handleLogout = () => {
    logout();
    showNotification('تم تسجيل الخروج بنجاح');
    handleNavigate('landing');
  };

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalyze = async (file: File) => {
    setSelectedFile(file);
    setCurrentView('analyzing');

    try {
      const uploadRes = await uploadContract(file);

      const resolvedFileId =
        uploadRes.fileId && uploadRes.fileId.trim()
          ? uploadRes.fileId
          : 'guest-analysis';

      const resolvedSessionId =
        uploadRes.sessionId && uploadRes.sessionId.trim()
          ? uploadRes.sessionId
          : null;

      setFileId(resolvedFileId);
      setSessionId(resolvedSessionId);

      const result = await analyzeContract(resolvedFileId, uploadRes.rawResult);
      setAnalysisResult(result);

      localStorage.setItem(
        'basira_last_analysis',
        JSON.stringify({
          result,
          fileId: resolvedFileId,
          sessionId: resolvedSessionId,
          fileName: file.name,
        })
      );

      setCurrentView('results');
    } catch (error) {
      console.error('Analysis failed', error);
      setCurrentView('upload');
      alert((error instanceof Error ? error.message : null) || 'حدث خطأ أثناء تحليل الملف. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleViewResult = async (contractId: string) => {
    setCurrentView('analyzing');
    try {
      const token = localStorage.getItem('basira_token');
      const BASE_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${BASE_URL}/api/contracts/${contractId}/detail`, {
        headers: { Authorization: `Bearer ${token || ''}` },
      });

      if (!res.ok) throw new Error('فشل جلب التحليل');

      const data = await res.json();
      const result = await analyzeContract(data.contract_id, data);

      setFileId(data.contract_id);
      setSessionId(data.session_id || null);
      setAnalysisResult(result);
      setSelectedFile({ name: data.original_filename } as File);
      setCurrentView('results');
    } catch (error) {
      console.error('Failed to load result', error);
      setCurrentView('landing');
      alert('حدث خطأ أثناء تحميل التحليل.');
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'landing':
        return (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col min-h-screen"
          >
            {user ? (
              <Dashboard
                user={user}
                onUpload={() => handleNavigate('upload')}
                onGeneralChat={() => handleNavigate('general-chat')}
                onViewResult={handleViewResult}
                onOpenDraft={() => setShowDraftModal(true)}
              />
            ) : (
              <>
                <HeroSection
                  onUpload={() => handleNavigate('upload')}
                  onGeneralChat={() => handleNavigate('general-chat')}
                  user={null}
                />
                <FeaturesSection />
                <WhyBasiraSection />
                {/* صفحة الأسعار — تظهر فقط قبل تسجيل الدخول */}
              </>
            )}
          </motion.div>
        );

      case 'upload':
        return (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-grow flex items-center justify-center py-20 px-4"
          >
            <UploadArea onAnalyze={handleAnalyze} />
          </motion.div>
        );

      case 'analyzing':
        return (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col items-center justify-center py-24 px-4"
          >
            <AnalyzingProgress />
          </motion.div>
        );

      case 'results':
        if (!analysisResult || !fileId) return null;

        return (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-grow py-10 px-4 sm:px-8 max-w-7xl mx-auto w-full"
          >
            <div className="mb-10">
              <h1 className="text-4xl font-extrabold font-heading text-cream mb-3">
                نتائج تحليل العقد
              </h1>
              <p className="text-cream-dim text-lg">
                تم تحليل الملف: {selectedFile?.name}
              </p>
            </div>

            <AnalysisSummary result={analysisResult} />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <ClauseList clauses={analysisResult.clauses} />
              </div>
              <div className="lg:col-span-2">
                <div className="sticky top-24">
                  <ContractChat
                    fileId={fileId}
                    sessionId={sessionId}
                    analysisResult={analysisResult}
                    initialMessages={mockContractChatMessages}
                    onOpenAuth={() => setShowAuthModal(true)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-10 mb-4">
              <button
                onClick={() => {
                  setAnalysisResult(null);
                  setFileId(null);
                  setSessionId(null);
                  setSelectedFile(null);
                  handleNavigate('upload');
                }}
                className="flex items-center gap-2 px-8 py-3 border border-matcha text-matcha hover:bg-matcha hover:text-eclipse rounded-xl font-heading font-bold transition-all duration-300"
              >
                <UploadCloudIcon className="w-5 h-5" />
                تحليل عقد جديد
              </button>
            </div>
          </motion.div>
        );

      case 'general-chat':
        return (
          <motion.div
            key="general-chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-grow py-12 px-4 sm:px-6 lg:px-8 w-full"
          >
            <AdvisorChat
              user={user}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-arabic bg-eclipse text-cream selection:bg-matcha/30">
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        user={user}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onOpenDraft={() => setShowDraftModal(true)}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuth={handleLogin}
      />

      <ContractDraftModal
        isOpen={showDraftModal}
        onClose={() => setShowDraftModal(false)}
      />

      <main className="flex-grow flex flex-col">
        <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
      </main>

      <Footer />

      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}