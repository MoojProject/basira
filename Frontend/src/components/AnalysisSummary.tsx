import React from 'react';
import { motion } from 'framer-motion';
import {
  FileTextIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  XCircleIcon,
  HelpCircleIcon,
} from 'lucide-react';
import type { AnalysisResult } from '../data/mockData';
import { StatusBadge } from './StatusBadge';
import { RiskScoreCard } from './RiskScoreCard';

interface AnalysisSummaryProps {
  result: AnalysisResult;
}

export function AnalysisSummary({ result }: AnalysisSummaryProps) {
  const stats = [
    {
      label: 'إجمالي البنود',
      value: result.totalClauses,
      icon: <FileTextIcon className="w-5 h-5 text-cream-dim" />,
      color: 'bg-eclipse border-eclipse-3',
    },
    {
      label: 'بنود آمنة',
      value: result.matchedClauses,
      icon: <CheckCircleIcon className="w-5 h-5 text-safe" />,
      color: 'bg-safe/5 border-safe/20',
    },
    {
      label: 'بنود خطرة',
      value: result.riskyClauses,
      icon: <AlertCircleIcon className="w-5 h-5 text-warn" />,
      color: 'bg-warn/5 border-warn/20',
    },
    {
      label: 'بنود غير واضحة',
      value: result.unclearClauses,
      icon: <HelpCircleIcon className="w-5 h-5 text-matcha-light" />,
      color: 'bg-matcha/5 border-matcha/20',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-eclipse-2 rounded-2xl shadow-lg border border-eclipse-3 overflow-hidden mb-10"
    >
      <div className="p-6 border-b border-eclipse-3 bg-eclipse/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-2xl font-extrabold font-heading text-cream">
              ملخص التحليل
            </h2>
            <StatusBadge
              status={result.safetyStatus}
              label={result.safetyStatusLabel}
            />
          </div>
          <p className="text-cream-dim font-medium">
            نوع العقد:{' '}
            <span className="text-matcha">{result.contractTypeLabel}</span>
          </p>
          {result.confidenceScore !== undefined && (
            <p className="text-cream-dim font-medium mt-1">
              نسبة الثقة بالتحليل:{' '}
              <span
                className={`font-bold ${
                  result.confidenceScore >= 0.7
                    ? 'text-safe'
                    : result.confidenceScore >= 0.5
                    ? 'text-warn'
                    : 'text-danger'
                }`}
              >
                {Math.round(result.confidenceScore * 100)}%
              </span>
            </p>
          )}
        </div>
        <RiskScoreCard score={result.riskScore} />
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${stat.color}`}
            >
              <div className="mb-2">{stat.icon}</div>
              <span className="text-2xl font-extrabold font-heading text-cream mb-1">
                {stat.value}
              </span>
              <span className="text-xs font-medium text-cream-dim">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-eclipse rounded-xl p-5 border border-eclipse-3">
          <h3 className="text-lg font-bold font-heading text-matcha mb-3">
            التوصية
          </h3>
          <div className="flex items-start gap-3 bg-eclipse-2 p-4 rounded-lg border border-eclipse-3">
            <AlertCircleIcon className="w-5 h-5 text-matcha flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-cream">
              {result.recommendation}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}