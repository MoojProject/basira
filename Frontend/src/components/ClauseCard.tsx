import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
  HelpCircleIcon,
  FileTextIcon,
  BookOpenIcon,
} from 'lucide-react';
import type { Clause } from '../data/mockData';

interface ClauseCardProps {
  clause: Clause;
  /** إذا مُرِّر، يُبرَز هذا النص داخل النص الأصلي */
  highlightText?: string;
}

export function ClauseCard({ clause, highlightText }: ClauseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusConfig = () => {
    switch (clause.status) {
      case 'matched':
        return {
          color: 'bg-safe/5 border-safe/20',
          icon: <CheckCircleIcon className="w-5 h-5 text-safe" />,
          label: 'آمن',
          textColor: 'text-safe',
          noteStyle: 'bg-safe/10 text-safe border-safe/20',
          stripColor: 'bg-safe',
          textBoxStyle: 'bg-eclipse border-eclipse-3 text-cream-dim',
        };
      case 'missing':
        return {
          color: 'bg-danger/5 border-danger/20',
          icon: <XCircleIcon className="w-5 h-5 text-danger" />,
          label: 'مفقود',
          textColor: 'text-danger',
          noteStyle: 'bg-warn/10 text-warn border-warn/20',
          stripColor: 'bg-danger',
          textBoxStyle: 'bg-eclipse border-eclipse-3 text-cream-dim',
        };
      case 'risky':
        return {
          color: 'bg-warn/5 border-warn/30',
          icon: <AlertTriangleIcon className="w-5 h-5 text-warn" />,
          label: 'خطير',
          textColor: 'text-warn',
          noteStyle: 'bg-warn/10 text-warn border-warn/20',
          stripColor: 'bg-warn',
          textBoxStyle: 'bg-warn/5 border-warn/25 text-cream-dim',
        };
      case 'unclear':
        return {
          color: 'bg-matcha/5 border-matcha/20',
          icon: <HelpCircleIcon className="w-5 h-5 text-matcha-light" />,
          label: 'غير واضح',
          textColor: 'text-matcha-light',
          noteStyle: 'bg-matcha/10 text-matcha-light border-matcha/20',
          stripColor: 'bg-matcha',
          textBoxStyle: 'bg-matcha/5 border-matcha/20 text-cream-dim',
        };
    }
  };

  const config = getStatusConfig();

  /** يُبرز مصطلحاً داخل نص */
  const renderHighlighted = (text: string, term?: string) => {
    if (!term || !text.toLowerCase().includes(term.toLowerCase())) {
      return <>{text}</>;
    }
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-warn/40 text-cream rounded px-0.5 not-italic">
          {text.slice(idx, idx + term.length)}
        </mark>
        {text.slice(idx + term.length)}
      </>
    );
  };

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all duration-200 ${config.color} ${
        isExpanded ? 'shadow-md shadow-eclipse-3/20' : ''
      }`}
    >
      {/* ── رأس البطاقة ── */}
      <div
        className="p-5 cursor-pointer flex items-center gap-3 bg-eclipse-2/80 hover:bg-eclipse-3/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-shrink-0">{config.icon}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-cream text-[0.95rem]">{clause.title}</h4>
            <span className={`text-xs font-medium ${config.textColor}`}>{config.label}</span>
          </div>

          {/* ★ معاينة نص البند — تظهر دائماً حتى في الوضع المطوي ★ */}
          {clause.originalText && (
            <p className="mt-1 text-xs text-cream-muted italic leading-relaxed line-clamp-2">
              "{clause.originalText.length > 120
                ? clause.originalText.slice(0, 120) + '…'
                : clause.originalText}"
            </p>
          )}
        </div>

        <button className="text-cream-muted hover:text-cream p-1 transition-colors flex-shrink-0">
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5" />
          ) : (
            <ChevronDownIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* ── التفاصيل الموسّعة ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-eclipse-2"
          >
            <div className="p-5 border-t border-eclipse-3 space-y-4">

              {/* الشرح */}
              <div>
                <h5 className="text-xs font-bold text-cream-muted uppercase tracking-wider mb-2">
                  الشرح
                </h5>
                <p className="text-sm text-cream-dim leading-relaxed">{clause.description}</p>
              </div>

              {/* ★ النص الكامل للبند من العقد ★ */}
              <div>
                <h5 className="text-xs font-bold text-cream-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileTextIcon className="w-3.5 h-3.5" />
                  نص البند من العقد
                </h5>

                {clause.originalText ? (
                  <div
                    className={`relative p-4 pr-5 rounded-lg border text-sm leading-relaxed font-serif ${config.textBoxStyle}`}
                  >
                    {/* شريط لوني جانبي */}
                    <span
                      className={`absolute right-0 top-2 bottom-2 w-1 rounded-full ${config.stripColor} opacity-60`}
                    />
                    <span className="text-cream-muted">" </span>
                    {renderHighlighted(clause.originalText, highlightText)}
                    <span className="text-cream-muted"> "</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-eclipse-3/30 border border-eclipse-3 text-xs text-cream-muted">
                    <FileTextIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>لم يُستخرج نص مباشر لهذا البند — راجع العقد الأصلي</span>
                  </div>
                )}
              </div>

              {/* ملاحظة */}
              <div className={`p-4 rounded-lg text-sm font-medium border ${config.noteStyle}`}>
                {clause.note}
              </div>

              {/* المرجع النظامي */}
              {clause.referenceText && (
                <div>
                  <h5 className="text-xs font-bold text-cream-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BookOpenIcon className="w-3.5 h-3.5" />
                    المرجع النظامي
                  </h5>
                  <div className="p-4 bg-matcha/10 rounded-lg border border-matcha/20 text-sm text-matcha-light leading-relaxed">
                    {clause.referenceText}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
