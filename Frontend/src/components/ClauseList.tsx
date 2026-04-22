import React, { useState } from 'react';
import type { Clause } from '../data/mockData';
import { ClauseCard } from './ClauseCard';
interface ClauseListProps {
  clauses: Clause[];
}
type FilterType = 'all' | 'matched' | 'risky' | 'unclear';
export function ClauseList({ clauses }: ClauseListProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const filteredClauses = clauses.filter((clause) =>
  filter === 'all' ? true : clause.status === filter
  );
  const filterButtons = [
  {
    id: 'all',
    label: 'الكل'
  },
  {
    id: 'risky',
    label: 'خطير'
  },
  {
    id: 'matched',
    label: 'آمن'
  },
  {
    id: 'unclear',
    label: 'غير واضح'
  }];

  return (
    <div className="bg-eclipse-2 rounded-2xl shadow-lg border border-eclipse-3 p-6 mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
        <h3 className="text-xl font-extrabold font-heading text-cream">
          تفاصيل البنود
        </h3>

        <div className="flex flex-wrap gap-2">
          {filterButtons.map((btn) =>
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id as FilterType)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors border ${filter === btn.id ? 'bg-matcha text-eclipse border-matcha' : 'bg-eclipse text-cream-dim border-eclipse-3 hover:border-matcha-dim hover:text-cream'}`}>
            
              {btn.label}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {filteredClauses.length > 0 ?
        filteredClauses.map((clause) =>
        <ClauseCard key={clause.id} clause={clause} />
        ) :

        <div className="text-center py-8 text-cream-muted">
            لا توجد بنود تطابق هذا الفلتر.
          </div>
        }
      </div>
    </div>);

}