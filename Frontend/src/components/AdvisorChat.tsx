import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BriefcaseIcon,
  HomeIcon,
  LockIcon,
  ZapIcon,
  HistoryIcon,
} from 'lucide-react';
import { GeneralChat } from './GeneralChat';

interface Advisor {
  id: string;
  name: string;
  specialty: string;
  icon: React.ElementType;
  greeting: string;
  namespace: string;
}

const advisors: Advisor[] = [
  {
    id: 'sara',
    name: 'سارة',
    namespace: 'rent',
    specialty: 'مستشارة عقود الإيجار',
    icon: BriefcaseIcon,
    greeting:
      'مرحبًا، أنا سارة. متخصصة في عقود الإيجار السكني والتجاري وأنظمة إيجار. كيف أقدر أساعدك؟',
  },
  {
    id: 'mohammed',
    name: 'محمد',
    namespace: 'labor',
    specialty: 'مستشار بنود العمل',
    icon: HomeIcon,
    greeting:
      'أهلاً، أنا محمد. أستطيع مساعدتك في فهم بنود عقود العمل وأنظمة العمل السعودية. اسأل ما تحتاج.',
  },
  {
    id: 'joud',
    name: 'جود',
    namespace: 'nda',
    specialty: 'مستشارة اتفاقيات السرية',
    icon: LockIcon,
    greeting:
      'مرحبًا، أنا جود. أساعدك في فهم اتفاقيات السرية وعدم الإفصاح (NDA). كيف أقدر أفيدك؟',
  },
  {
    id: 'general',
    name: 'الفريق القانوني',
     namespace: 'both',
    specialty: 'تحليل شامل لجميع العقود',
    icon: ZapIcon,
    greeting:
      'مرحبًا! أنا الفريق القانوني. أستطيع مساعدتك في تحليل أي نوع من العقود بشكل شامل. كيف أقدر أساعدك؟',
  },
];

const containerVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
    },
  },
};

interface AdvisorChatProps {
  user?: {
    name: string;
    email: string;
  } | null;
  onOpenAuth?: () => void;
}

export function AdvisorChat({ user, onOpenAuth }: AdvisorChatProps) {
  const [selectedAdvisor, setSelectedAdvisor] = useState<string | null>(null);
  const activeAdvisor = advisors.find((a) => a.id === selectedAdvisor);

  const advisorSuggestions: Record<string, string[]> = {
    sara: [
      'ما أهم بنود عقد الإيجار؟',
      'ما هي حقوق المستأجر؟',
      'متى يحق للمؤجر إنهاء العقد؟',
      'ما هو مبلغ التأمين المعقول؟',
    ],
    mohammed: [
      'ما معنى فترة التجربة؟',
      'ما هي مكافأة نهاية الخدمة؟',
      'هل شرط عدم المنافسة مسموح؟',
      'ما الفرق بين العقد المحدد وغير المحدد؟',
    ],
    joud: [
      'ماذا تعني اتفاقية السرية؟',
      'ما مدة الالتزام بالسرية؟',
      'ما العقوبة عند خرق السرية؟',
      'ما الفرق بين NDA أحادي وثنائي؟',
    ],
    general: [
      'هل هذا العقد آمن؟',
      'ما أخطر بند في العقد؟',
      'اشرح لي البنود القانونية',
      'ما حقوقي كموظف؟',
    ],
  };

  return (
    <div className="max-w-5xl mx-auto w-full">
      <AnimatePresence mode="wait">
        {!activeAdvisor ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center">
              <h1 className="text-4xl font-extrabold text-cream mb-3 font-heading">
                اسأل المستشار القانوني
              </h1>
              <p
                className="text-lg"
                style={{
                  color: '#C7D1CE',
                }}
              >
                اختر المستشار حسب نوع العقد
              </p>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 max-w-3xl mx-auto gap-6 mt-12"
            >
              {advisors.map((advisor) => {
                const IconComponent = advisor.icon;
                return (
                  <motion.div
                    key={advisor.id}
                    variants={cardVariants}
                    onClick={() => setSelectedAdvisor(advisor.id)}
                    className="rounded-2xl py-6 px-5 text-center cursor-pointer flex flex-col items-center justify-center bg-eclipse-2 border border-eclipse-3 hover:border-matcha hover:scale-[1.03] transition-all duration-300"
                  >
                    <IconComponent className="w-10 h-10 text-matcha mb-3" />
                    <h3 className="text-xl text-cream mb-1 font-heading font-extrabold">
                      {advisor.name}
                    </h3>
                    <p className="text-cream-dim text-sm">{advisor.specialty}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col"
          >
            <GeneralChat
              key={activeAdvisor.id}
              user={user}
              onOpenAuth={onOpenAuth}
              advisorGreeting={activeAdvisor.greeting}
              advisorName={activeAdvisor.name}
              suggestions={advisorSuggestions[activeAdvisor.id]}
            />

            {!user && (
              <div className="mt-4 p-4 bg-matcha/10 border border-matcha/30 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <HistoryIcon className="w-5 h-5 text-matcha flex-shrink-0" />
                  <p className="text-sm text-cream">
                    سجّل لحفظ محادثاتك والرجوع لها في أي وقت
                  </p>
                </div>
                <button
                  onClick={onOpenAuth}
                  className="text-sm font-semibold text-matcha hover:text-matcha-light whitespace-nowrap transition-colors"
                >
                  أنشئ حسابك ←
                </button>
              </div>
            )}

            <button
              onClick={() => setSelectedAdvisor(null)}
              className="mt-4 text-sm text-center cursor-pointer hover:text-cream transition-colors"
              style={{
                color: '#C7D1CE',
              }}
            >
              ← العودة للمستشارين
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}