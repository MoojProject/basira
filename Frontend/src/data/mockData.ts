export interface Clause {
  id: string;
  title: string;
  status: 'matched' | 'missing' | 'unclear' | 'risky';
  description: string;
  note: string;
  originalText?: string;
  referenceText?: string;
}

export interface AnalysisResult {
  confidenceScore?: number;
  contractType: 'employment' | 'rental' | 'nda';
  contractTypeLabel: string;
  totalClauses: number;
  matchedClauses: number;
  missingClauses: number;
  unclearClauses: number;
  riskyClauses: number;
  safetyStatus: 'safe' | 'needs_review' | 'high_risk';
  safetyStatusLabel: string;
  riskScore: number;
  clauses: Clause[];
  summary: string;
  recommendation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
export const mockContractChatMessages: ChatMessage[] = [
{
  id: '1',
  role: 'assistant',
  content:
  'مرحباً! لقد قمت بتحليل العقد المرفوع. يمكنك سؤالي عن أي بند أو استفسار حول نتائج التحليل.',
  timestamp: new Date()
}];


export const contractChatSuggestions = [
'هل هذا العقد آمن؟',
'ما أخطر بند في العقد؟',
'هل يوجد شيء ناقص؟',
'اشرح لي بند السرية',
'هل يوجد شرط مجحف؟',
'ما هي حقوقي في هذا العقد؟'];


export const generalChatSuggestions = [
'ما معنى فترة التجربة؟',
'ما الفرق بين العقد المحدد وغير المحدد؟',
'ما أهم بنود عقد الإيجار؟',
'ماذا تعني اتفاقية السرية؟',
'هل شرط عدم المنافسة مسموح؟',
'ما هي مكافأة نهاية الخدمة؟'];


export type ContractType = 'employment' | 'rental' | 'nda';

export const contractTypeLabels: Record<ContractType, string> = {
  employment: 'عقد عمل',
  rental: 'عقد إيجار',
  nda: 'اتفاقية سرية'
};