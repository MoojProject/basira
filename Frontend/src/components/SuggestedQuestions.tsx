import React from 'react';
import { MessageCircleIcon } from 'lucide-react';
interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}
export function SuggestedQuestions({
  questions,
  onSelect
}: SuggestedQuestionsProps) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-cream-muted mb-2 px-1">
        أسئلة مقترحة:
      </p>
      <div className="flex flex-wrap gap-2">
        {questions.map((q, idx) =>
        <button
          key={idx}
          onClick={() => onSelect(q)}
          className="text-xs bg-eclipse border border-eclipse-3 text-cream-dim hover:bg-matcha hover:text-eclipse hover:border-matcha px-3 py-2 rounded-full transition-colors flex items-center gap-1.5">
          
            <MessageCircleIcon className="w-3 h-3" />
            {q}
          </button>
        )}
      </div>
    </div>);

}