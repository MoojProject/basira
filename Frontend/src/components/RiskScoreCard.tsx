import React from 'react';
import { motion } from 'framer-motion';
interface RiskScoreCardProps {
  score: number;
}
export function RiskScoreCard({ score }: RiskScoreCardProps) {
  let colorClass = 'text-safe';
  let bgColorClass = 'bg-safe/10';
  let strokeColor = 'var(--color-safe)';
  if (score < 50) {
    colorClass = 'text-danger';
    bgColorClass = 'bg-danger/10';
    strokeColor = 'var(--color-danger)';
  } else if (score < 80) {
    colorClass = 'text-warn';
    bgColorClass = 'bg-warn/10';
    strokeColor = 'var(--color-warn)';
  }
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - score / 100 * circumference;
  return (
    <div
      className={`flex flex-col items-center justify-center p-4 rounded-2xl ${bgColorClass} border border-eclipse-3`}>
      
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Background Circle */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-eclipse-3" />
          
          {/* Progress Circle */}
          <motion.circle
            cx="48"
            cy="48"
            r={radius}
            stroke={strokeColor}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{
              strokeDashoffset: circumference
            }}
            animate={{
              strokeDashoffset
            }}
            transition={{
              duration: 1.5,
              ease: 'easeOut'
            }}
            strokeLinecap="round" />
          
        </svg>
        <div className="absolute flex flex-col items-center">
          <span
            className={`text-2xl font-extrabold font-heading ${colorClass}`}>
            
            {score}
          </span>
          <span className="text-xs text-cream-muted font-medium">/ 100</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-semibold text-cream-dim">
        مؤشر الأمان
      </span>
    </div>);

}