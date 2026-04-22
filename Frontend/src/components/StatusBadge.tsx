import React from 'react';
import {
  ShieldCheckIcon,
  ShieldAlertIcon,
  AlertTriangleIcon } from
'lucide-react';
interface StatusBadgeProps {
  status: 'safe' | 'needs_review' | 'high_risk';
  label?: string;
  className?: string;
}
export function StatusBadge({
  status,
  label,
  className = ''
}: StatusBadgeProps) {
  const config = {
    safe: {
      color: 'bg-safe/10 text-safe border-safe/20',
      icon: <ShieldCheckIcon className="w-4 h-4 mr-1.5" />,
      defaultLabel: 'آمن'
    },
    needs_review: {
      color: 'bg-warn/10 text-warn border-warn/20',
      icon: <AlertTriangleIcon className="w-4 h-4 mr-1.5" />,
      defaultLabel: 'يحتاج مراجعة'
    },
    high_risk: {
      color: 'bg-danger/10 text-danger border-danger/20',
      icon: <ShieldAlertIcon className="w-4 h-4 mr-1.5" />,
      defaultLabel: 'عالي الخطورة'
    }
  };
  const currentConfig = config[status];
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${currentConfig.color} ${className}`}>
      
      {currentConfig.icon}
      {label || currentConfig.defaultLabel}
    </span>);

}