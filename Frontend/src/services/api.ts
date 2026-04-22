const BASE_URL = import.meta.env.VITE_API_URL || ''

function getToken(): string | null {
  return localStorage.getItem('basira_token')
}
function setToken(token: string) {
  localStorage.setItem('basira_token', token)
}
function clearToken() {
  localStorage.removeItem('basira_token')
}
function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function registerUser(
  email: string,
  password: string,
  full_name: string,
): Promise<{ access_token: string; full_name: string }> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'فشل إنشاء الحساب')
  }
  const data = await res.json()
  setToken(data.access_token)
  return data
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ access_token: string; full_name: string }> {
  const formData = new URLSearchParams()
  formData.append('username', email)
  formData.append('password', password)
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'فشل تسجيل الدخول')
  }
  const data = await res.json()
  setToken(data.access_token)
  return data
}

export function logoutUser() {
  clearToken()
}

import type { AnalysisResult, ChatMessage } from '../data/mockData'

export async function uploadContract(
  file: File,
): Promise<{ success: boolean; fileId: string; sessionId: string; rawResult: any }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/api/contracts/analyze`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'فشل رفع العقد')
  }
  const data = await res.json()
  return {
    success: true,
    fileId: data.contract_id,
    sessionId: data.session_id,
    rawResult: data,
  }
}

export async function analyzeContract(
  _fileId: string,
  rawResult?: any,
): Promise<AnalysisResult> {
  return convertToAnalysisResult(rawResult)
}

function extractSection(analysis: string, sectionName: string): string {
  const regex = new RegExp(`##\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`)
  const match = analysis.match(regex)
  return match ? match[1].trim() : ''
}

function convertToAnalysisResult(data: any): AnalysisResult {
  const analysis: string = data.analysis || ''
  const verdict: string  = data.verdict  || ''

  const contractTypeRaw     = extractSection(analysis, 'نوع العقد')
  const verdictText         = extractSection(analysis, 'الحكم العام')
  const riskySectionText    = extractSection(analysis, 'البنود الخطيرة')
  const unclearSectionText  = extractSection(analysis, 'البنود المبهمة')
  const positiveSectionText = extractSection(analysis, 'البنود الإيجابية')
  const recommendation      = extractSection(analysis, 'التوصية') || data.summary || ''

  const contractTypeMap: Record<string, string> = {
    employment: 'عقد عمل',
    rental:     'عقد إيجار',
    nda:        'اتفاقية سرية',
    both:       'عقد عام',
    other:      'عقد عام',
  }
  const contractTypeKey   = data.contract_type || 'both'
  const contractTypeLabel = contractTypeRaw || contractTypeMap[contractTypeKey] || 'عقد عام'

  const safetyStatus =
    verdict === 'dangerous' ? 'high_risk' :
    verdict === 'safe'      ? 'safe'       : 'needs_review'

  const safetyStatusLabel =
    safetyStatus === 'high_risk' ? 'عالي الخطورة' :
    safetyStatus === 'safe'      ? 'آمن'           : 'يحتاج مراجعة'

  const clauses      = parseClauses(riskySectionText, unclearSectionText, positiveSectionText)
  const total        = clauses.length || 1
  const safeCount    = clauses.filter(c => c.status === 'matched').length
  const unclearCount = clauses.filter(c => c.status === 'unclear').length
  const clauseScore  = ((safeCount + unclearCount * 0.4) / total) * 100
  const confidencePct = (data.confidence_score || 0) * 100
  const riskScore    = Math.round(clauseScore * 0.7 + confidencePct * 0.3)

  return {
    contractType:      contractTypeKey as any,
    contractTypeLabel,
    totalClauses:      clauses.length,
    matchedClauses:    clauses.filter(c => c.status === 'matched').length,
    missingClauses:    clauses.filter(c => c.status === 'missing').length,
    unclearClauses:    clauses.filter(c => c.status === 'unclear').length,
    riskyClauses:      clauses.filter(c => c.status === 'risky').length,
    safetyStatus,
    safetyStatusLabel,
    riskScore,
    clauses,
    summary:           verdictText || '',
    recommendation,
    confidenceScore:   data.confidence_score,
  }
}

// ════════════════════════════════════════════════════════════
// parser يتوافق مع format rag.py:
//   **[عنوان البند]**
//   الخطورة: ...     ← أو الغموض: أو السبب:
//   نص البند: ...
//   المادة المخالفة: ...
//   ---
// ════════════════════════════════════════════════════════════

function parseBlock(block: string): {
  title:         string | null
  explanation:   string | null
  originalText:  string | null
  articleNumber: string | null
} {
  // العنوان — أول ** ** في الكتلة (يقبل أقواس أو بدون)
  const titleMatch = block.match(/\*\*([^*\n]+?)\*\*/)
  const title = titleMatch
    ? titleMatch[1].trim().replace(/^\[|\]$/g, '').trim()
    : null

  // مساعد: يستخرج قيمة حقل بالاسم
  const field = (label: string): string | null => {
    const re = new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*([^\\n]+)`, 'u')
    const m  = block.match(re)
    if (!m) return null
    const val = m[1].trim()
    if (!val || ['لا تنطبق', 'لا ينطبق', 'غير محدد'].includes(val)) return null
    return val
  }

  // الشرح — يقبل: الخطورة / الغموض / السبب / الشرح
  const explanation =
    field('الخطورة') ||
    field('الغموض')  ||
    field('السبب')   ||
    field('الشرح')   ||
    null

  // نص البند الحرفي
  const rawNass    = field('نص البند') || field('النص') || null
  const SKIP       = ['انسخ', 'اكتب هنا', 'ابحث', 'مثال', 'إلزامي']
  const originalText =
    rawNass && !SKIP.some(s => rawNass.includes(s)) && rawNass.length > 5
      ? rawNass : null

  // المادة المخالفة
  const articleNumber =
    field('المادة المخالفة') || field('المادة') || null

  return { title, explanation, originalText, articleNumber }
}

function parseClauses(
  riskyText:    string,
  unclearText:  string,
  positiveText: string,
) {
  const clauses: any[] = []
  let id = 1

  const processSection = (
    text:          string,
    status:        'risky' | 'unclear' | 'matched',
    defaultNote:   string,
    defaultPrefix: string,
  ) => {
    if (!text || /^لا\s*(تو[جض]د|يو[جض]د)/.test(text.trim())) return

    // فصل الكتل بـ --- أولاً، ثم بـ ** كـ fallback
    let blocks: string[]
    if (text.includes('\n---')) {
      blocks = text.split(/\n---+\n?/).map(b => b.trim()).filter(Boolean)
    } else {
      blocks = text.split(/(?=^\*\*)/m).map(b => b.trim()).filter(b => b.startsWith('**'))
    }

    const SKIP_BLOCKS = ['لا توجد بنود', 'لا يوجد', 'لا توجد']

    for (const block of blocks) {
      if (block.length < 10) continue
      if (SKIP_BLOCKS.some(s => block.startsWith(s))) continue

      const p = parseBlock(block)
      if (!p.title && !p.explanation && !p.originalText) continue

      // إذا ما في عنوان → استخرج أول 4 كلمات من الشرح
      const autoTitle = p.title || (() => {
        const src = p.explanation || p.originalText || ''
        const words = src.trim().split(/\s+/).slice(0, 4).join(' ')
        return words.length > 3 ? words : `${defaultPrefix} ${id}`
      })()

      clauses.push({
        id:            String(id++),
        title:         autoTitle,
        status,
        description:   p.explanation   || '',
        note:          defaultNote,
        originalText:  p.originalText  || undefined,
        referenceText: p.articleNumber || undefined,
      })
    }
  }

  processSection(riskyText,    'risky',   'هذا البند يحتاج مراجعة قانونية', 'بند خطير')
  processSection(unclearText,  'unclear', 'يحتاج توضيح',                    'بند غير واضح')
  processSection(positiveText, 'matched', 'مطابق للمعايير',                  'بند إيجابي')

  return clauses
}

export async function askAboutContract(
  _fileId: string,
  question: string,
  _analysisResult: AnalysisResult,
  sessionId?: string,
): Promise<ChatMessage> {
  const res = await fetch(`${BASE_URL}/api/chat/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      session_id: sessionId,
      message:    question,
    }),
  })
  if (!res.ok) throw new Error('فشل الاتصال بالمستشار')
  const data = await res.json()
  return {
    id:        'msg-' + Date.now(),
    role:      'assistant',
    content:   data.reply,
    timestamp: new Date(),
  }
}

export async function askGeneralQuestion(
  question: string,
  history:   Array<{ role: string; content: string }> = [],
  namespace: string = 'both',
): Promise<ChatMessage> {
  const res = await fetch(`${BASE_URL}/api/chat/general`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      message: question,
      namespace,
      history,
    }),
  })
  if (!res.ok) throw new Error('فشل الاتصال بالمستشار')
  const data = await res.json()
  return {
    id:        'msg-' + Date.now(),
    role:      'assistant',
    content:   data.reply,
    timestamp: new Date(),
  }
}

export async function getContractHistory(sessionId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${BASE_URL}/api/chat/${sessionId}/history`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.history.map((msg: any, i: number) => ({
    id:        'history-' + i,
    role:      msg.role,
    content:   msg.content,
    timestamp: new Date(),
  }))
}

export async function verifyEmail(email: string, code: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/verify-email?email=${encodeURIComponent(email)}&code=${code}`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'الكود غير صحيح')
  }
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/forgot-password?email=${encodeURIComponent(email)}`, {
    method: 'POST',
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'البريد غير مسجل')
  }
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/reset-password?email=${encodeURIComponent(email)}&code=${code}&new_password=${encodeURIComponent(newPassword)}`, {
    method: 'POST',
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'فشل تغيير كلمة المرور')
  }
}
// const BASE_URL = import.meta.env.VITE_API_URL || ''

// function getToken(): string | null {
//   return localStorage.getItem('basira_token')
// }
// function setToken(token: string) {
//   localStorage.setItem('basira_token', token)
// }
// function clearToken() {
//   localStorage.removeItem('basira_token')
// }
// function authHeaders(): HeadersInit {
//   const token = getToken()
//   return token ? { Authorization: `Bearer ${token}` } : {}
// }

// export async function registerUser(
//   email: string,
//   password: string,
//   full_name: string,
// ): Promise<{ access_token: string; full_name: string }> {
//   const res = await fetch(`${BASE_URL}/api/auth/register`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ email, password, full_name }),
//   })
//   if (!res.ok) {
//     const err = await res.json()
//     throw new Error(err.detail || 'فشل إنشاء الحساب')
//   }
//   const data = await res.json()
//   setToken(data.access_token)
//   return data
// }

// export async function loginUser(
//   email: string,
//   password: string,
// ): Promise<{ access_token: string; full_name: string }> {
//   const formData = new URLSearchParams()
//   formData.append('username', email)
//   formData.append('password', password)
//   const res = await fetch(`${BASE_URL}/api/auth/login`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//     body: formData.toString(),
//   })
//   if (!res.ok) {
//     const err = await res.json()
//     throw new Error(err.detail || 'فشل تسجيل الدخول')
//   }
//   const data = await res.json()
//   setToken(data.access_token)
//   return data
// }

// export function logoutUser() {
//   clearToken()
// }

// import type { AnalysisResult, ChatMessage } from '../data/mockData'

// export async function uploadContract(
//   file: File,
// ): Promise<{ success: boolean; fileId: string; sessionId: string; rawResult: any }> {
//   const formData = new FormData()
//   formData.append('file', file)
//   const res = await fetch(`${BASE_URL}/api/contracts/analyze`, {
//     method: 'POST',
//     headers: authHeaders(),
//     body: formData,
//   })
//   if (!res.ok) {
//     const err = await res.json()
//     throw new Error(err.detail || 'فشل رفع العقد')
//   }
//   const data = await res.json()
//   return {
//     success: true,
//     fileId: data.contract_id,
//     sessionId: data.session_id,
//     rawResult: data,
//   }
// }

// export async function analyzeContract(
//   _fileId: string,
//   rawResult?: any,
// ): Promise<AnalysisResult> {
//   return convertToAnalysisResult(rawResult)
// }

// function extractSection(analysis: string, sectionName: string): string {
//   const regex = new RegExp(`##\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`)
//   const match = analysis.match(regex)
//   return match ? match[1].trim() : ''
// }

// function convertToAnalysisResult(data: any): AnalysisResult {
//   const analysis: string = data.analysis || ''
//   const verdict: string = data.verdict || ''

//   const contractTypeRaw = extractSection(analysis, 'نوع العقد')
//   const verdictText = extractSection(analysis, 'الحكم العام')
//   const riskySectionText = extractSection(analysis, 'البنود الخطيرة')
//   const unclearSectionText = extractSection(analysis, 'البنود المبهمة')
//   const positiveSectionText = extractSection(analysis, 'البنود الإيجابية')
//   const recommendation = extractSection(analysis, 'التوصية') || data.summary || ''

//   const contractTypeMap: Record<string, string> = {
//     employment: 'عقد عمل',
//     rental: 'عقد إيجار',
//     nda: 'اتفاقية سرية',
//     both: 'عقد عام',
//     other: 'عقد عام',
//   }
//   const contractTypeKey = data.contract_type || 'both'
//   const contractTypeLabel = contractTypeRaw || contractTypeMap[contractTypeKey] || 'عقد عام'

//   const safetyStatus =
//     verdict === 'dangerous' ? 'high_risk' :
//     verdict === 'safe' ? 'safe' : 'needs_review'

//   const safetyStatusLabel =
//     safetyStatus === 'high_risk' ? 'عالي الخطورة' :
//     safetyStatus === 'safe' ? 'آمن' : 'يحتاج مراجعة'

//   const clauses = parseClauses(riskySectionText, unclearSectionText, positiveSectionText)
//   const total = clauses.length || 1
//   const safeCount = clauses.filter(c => c.status === 'matched').length
//   const unclearCount = clauses.filter(c => c.status === 'unclear').length
//   const clauseScore = ((safeCount + unclearCount * 0.4) / total) * 100
//   const confidencePct = (data.confidence_score || 0) * 100
//   const riskScore = Math.round(clauseScore * 0.7 + confidencePct * 0.3)

//   return {
//     contractType: contractTypeKey as any,
//     contractTypeLabel,
//     totalClauses: clauses.length,
//     matchedClauses: clauses.filter((c) => c.status === 'matched').length,
//     missingClauses: clauses.filter((c) => c.status === 'missing').length,
//     unclearClauses: clauses.filter((c) => c.status === 'unclear').length,
//     riskyClauses: clauses.filter((c) => c.status === 'risky').length,
//     safetyStatus,
//     safetyStatusLabel,
//     riskScore,
//     clauses,
//     summary: verdictText || '',
//     recommendation,
//     confidenceScore: data.confidence_score,
//   }
// }

// function parseClauses(
//   riskyText: string,
//   unclearText: string,
//   positiveText: string,
// ) {
//   const clauses: any[] = []
//   let id = 1

//   const extractTitle = (text: string): string | null => {
//     const match = text.match(/^\*?\*?([^:：*]+)\*?\*?[:：]/)
//     return match ? match[1].trim() : null
//   }

//   const parseLine = (raw: string) => {
//     const clean = raw.replace(/^\d+\.\s*/, '').trim()
//     if (!clean) return null

//     const title = extractTitle(clean) || null

//     const quoteMatch = clean.match(/[«""]([^»""]{10,})[»""]/u)
//     const originalText = quoteMatch ? quoteMatch[1].trim() : undefined

//     const refMatch = clean.match(/(المادة\s+\d+[^\.،;]*|الفقرة\s+\d+[^\.،;]*)/u)
//     const referenceText = refMatch ? refMatch[0].trim() : undefined

//     const description = clean
//       .replace(/^\*?\*?[^:：]+\*?\*?[:：]\s*/, '')
//       .replace(/\*\*/g, '')
//       .replace(/[«""][^»""]*[»""]/gu, '')
//       .trim()

//     return { title, description, originalText, referenceText }
//   }

//   if (riskyText && !riskyText.includes('لا توجد') && !riskyText.includes('لا يوجد')) {
//     const lines = riskyText.split('\n').filter((l) => l.trim().length > 10)
//     for (const line of lines) {
//       const parsed = parseLine(line)
//       if (!parsed) continue
//       clauses.push({
//         id: String(id++),
//         title: parsed.title || `بند خطير ${id}`,
//         status: 'risky' as const,
//         description: parsed.description,
//         note: 'هذا البند يحتاج مراجعة قانونية',
//         originalText: parsed.originalText,
//         referenceText: parsed.referenceText,
//       })
//     }
//   }

//   if (unclearText && !unclearText.includes('لا توجد') && !unclearText.includes('لا يوجد')) {
//     const lines = unclearText.split('\n').filter((l) => l.trim().length > 10)
//     for (const line of lines) {
//       const parsed = parseLine(line)
//       if (!parsed) continue
//       clauses.push({
//         id: String(id++),
//         title: parsed.title || `بند غير واضح ${id}`,
//         status: 'unclear' as const,
//         description: parsed.description,
//         note: 'يحتاج توضيح',
//         originalText: parsed.originalText,
//         referenceText: parsed.referenceText,
//       })
//     }
//   }

//   if (positiveText && !positiveText.includes('لا توجد') && !positiveText.includes('لا يوجد')) {
//     const lines = positiveText.split('\n').filter((l) => l.trim().length > 10)
//     for (const line of lines) {
//       const parsed = parseLine(line)
//       if (!parsed) continue
//       clauses.push({
//         id: String(id++),
//         title: parsed.title || `بند إيجابي ${id}`,
//         status: 'matched' as const,
//         description: parsed.description,
//         note: 'مطابق للمعايير',
//         originalText: parsed.originalText,
//         referenceText: parsed.referenceText,
//       })
//     }
//   }

//   return clauses
// }

// export async function askAboutContract(
//   _fileId: string,
//   question: string,
//   _analysisResult: AnalysisResult,
//   sessionId?: string,
// ): Promise<ChatMessage> {
//   const res = await fetch(`${BASE_URL}/api/chat/`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       ...authHeaders(),
//     },
//     body: JSON.stringify({
//       session_id: sessionId,
//       message: question,
//     }),
//   })
//   if (!res.ok) throw new Error('فشل الاتصال بالمستشار')
//   const data = await res.json()
//   return {
//     id: 'msg-' + Date.now(),
//     role: 'assistant',
//     content: data.reply,
//     timestamp: new Date(),
//   }
// }

// export async function askGeneralQuestion(
//   question: string,
//   history: Array<{ role: string; content: string }> = [],
//   namespace: string = 'both',
// ): Promise<ChatMessage> {
//   const res = await fetch(`${BASE_URL}/api/chat/general`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       ...authHeaders(),
//     },
//     body: JSON.stringify({
//       message: question,
//       namespace,
//       history,
//     }),
//   })
//   if (!res.ok) throw new Error('فشل الاتصال بالمستشار')
//   const data = await res.json()
//   return {
//     id: 'msg-' + Date.now(),
//     role: 'assistant',
//     content: data.reply,
//     timestamp: new Date(),
//   }
// }

// export async function getContractHistory(sessionId: string): Promise<ChatMessage[]> {
//   const res = await fetch(`${BASE_URL}/api/chat/${sessionId}/history`, {
//     headers: { 'Content-Type': 'application/json', ...authHeaders() },
//   })
//   if (!res.ok) return []
//   const data = await res.json()
//   return data.history.map((msg: any, i: number) => ({
//     id: 'history-' + i,
//     role: msg.role,
//     content: msg.content,
//     timestamp: new Date(),
//   }))
// }

// export async function verifyEmail(email: string, code: string): Promise<void> {
//   const res = await fetch(`${BASE_URL}/api/auth/verify-email?email=${encodeURIComponent(email)}&code=${code}`, {
//     method: 'POST',
//     headers: authHeaders(),
//   })
//   if (!res.ok) {
//     const err = await res.json()
//     throw new Error(err.detail || 'الكود غير صحيح')
//   }
// }

// export async function forgotPassword(email: string): Promise<void> {
//   const res = await fetch(`${BASE_URL}/api/auth/forgot-password?email=${encodeURIComponent(email)}`, {
//     method: 'POST',
//   })
//   if (!res.ok) {
//     const err = await res.json()
//     throw new Error(err.detail || 'البريد غير مسجل')
//   }
// }

// export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
//   const res = await fetch(`${BASE_URL}/api/auth/reset-password?email=${encodeURIComponent(email)}&code=${code}&new_password=${encodeURIComponent(newPassword)}`, {
//     method: 'POST',
//   })
//   if (!res.ok) {
//     const err = await res.json()
//     throw new Error(err.detail || 'فشل تغيير كلمة المرور')
//   }
// }
// const BASE_URL = import.meta.env.VITE_API_URL || '' 


// function getToken(): string | null {
//   return localStorage.getItem('basira_token')
// }
// function setToken(token: string) {
//   localStorage.setItem('basira_token', token)
// }
// function clearToken() {
//   localStorage.removeItem('basira_token')
// }
// function authHeaders(): HeadersInit {
//   const token = getToken()
//   return token ? { Authorization: `Bearer ${token}` } : {}
// }
 
// export async function registerUser(
//   email: string,
//   password: string,
//   full_name: string,
// ): Promise<{ access_token: string; full_name: string }> {
//   const res = await fetch(`${BASE_URL}/api/auth/register`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ email, password, full_name }),
//   })
//   if (!res.ok) {
//     const err = await res.json()
//     throw new Error(err.detail || 'فشل إنشاء الحساب')
//   }
//   const data = await res.json()
//   setToken(data.access_token)
//   return data
// }
 
// export async function loginUser(
//   email: string,
//   password: string,
// ): Promise<{ access_token: string; full_name: string }> {
//   const formData = new URLSearchParams()
//   formData.append('username', email)
//   formData.append('password', password)
//   const res = await fetch(`${BASE_URL}/api/auth/login`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//     body: formData.toString(),
//   })
//   if (!res.ok) {
//     const err = await res.json()
//     throw new Error(err.detail || 'فشل تسجيل الدخول')
//   }
//   const data = await res.json()
//   setToken(data.access_token)
//   return data
// }
 
// export function logoutUser() {
//   clearToken()
// }
 
// import type { AnalysisResult, ChatMessage } from '../data/mockData'
 
// export async function uploadContract(
//   file: File,
// ): Promise<{ success: boolean; fileId: string; sessionId: string; rawResult: any }> {
//   const formData = new FormData()
//   formData.append('file', file)
//   const res = await fetch(`${BASE_URL}/api/contracts/analyze`, {
//     method: 'POST',
//     headers: authHeaders(),
//     body: formData,
//   })
//   if (!res.ok) {
//     const err = await res.json()
//     throw new Error(err.detail || 'فشل رفع العقد')
//   }
//   const data = await res.json()
//   return {
//     success: true,
//     fileId: data.contract_id,
//     sessionId: data.session_id,
//     rawResult: data,
//   }
// }
 
// export async function analyzeContract(
//   _fileId: string,
//   rawResult?: any,
// ): Promise<AnalysisResult> {
//   return convertToAnalysisResult(rawResult)
// }
 
// function extractSection(analysis: string, sectionName: string): string {
//   const regex = new RegExp(`##\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`)
//   const match = analysis.match(regex)
//   return match ? match[1].trim() : ''
// }
 
// function convertToAnalysisResult(data: any): AnalysisResult {
//   const analysis: string = data.analysis || ''
//   const verdict: string = data.verdict || ''
 
//   const contractTypeRaw = extractSection(analysis, 'نوع العقد')
//   const verdictText = extractSection(analysis, 'الحكم العام')
//   const riskySectionText = extractSection(analysis, 'البنود الخطيرة')
//   const unclearSectionText = extractSection(analysis, 'البنود المبهمة')
//   const positiveSectionText = extractSection(analysis, 'البنود الإيجابية')
//   const recommendation = extractSection(analysis, 'التوصية') || data.summary || ''
 
//   const contractTypeMap: Record<string, string> = {
//     employment: 'عقد عمل',
//     rental: 'عقد إيجار',
//     nda: 'اتفاقية سرية',
//     both: 'عقد عام',
//     other: 'عقد عام',
//   }
//   const contractTypeKey = data.contract_type || 'both'
//   const contractTypeLabel = contractTypeRaw || contractTypeMap[contractTypeKey] || 'عقد عام'
 
//   const safetyStatus =
//     verdict === 'dangerous' ? 'high_risk' :
//     verdict === 'safe' ? 'safe' : 'needs_review'
 
//   const safetyStatusLabel =
//     safetyStatus === 'high_risk' ? 'عالي الخطورة' :
//     safetyStatus === 'safe' ? 'آمن' : 'يحتاج مراجعة'
 
//   const riskScore =
//     safetyStatus === 'high_risk' ? 25 :
//     safetyStatus === 'safe' ? 90 : 60
 
//   const clauses = parseClauses(riskySectionText, unclearSectionText, positiveSectionText)
 
//   return {
//     contractType: contractTypeKey as any,
//     contractTypeLabel,
//     totalClauses: clauses.length,
//     matchedClauses: clauses.filter((c) => c.status === 'matched').length,
//     missingClauses: clauses.filter((c) => c.status === 'missing').length,
//     unclearClauses: clauses.filter((c) => c.status === 'unclear').length,
//     riskyClauses: clauses.filter((c) => c.status === 'risky').length,
//     safetyStatus,
//     safetyStatusLabel,
//     riskScore,
//     clauses,
//     summary: verdictText || '',
//     recommendation,
//     confidenceScore: data.confidence_score,

//   }
// }
 
// function parseClauses(
//   riskyText: string,
//   unclearText: string,
//   positiveText: string,
// ) {
//   const clauses: any[] = []
//   let id = 1

//   const extractTitle = (text: string): string | null => {
//     const match = text.match(/^\*?\*?([^:：*]+)\*?\*?[:：]/)
//     return match ? match[1].trim() : null
//   }


//   const parseLine = (raw: string) => {
//     const clean = raw.replace(/^\d+\.\s*/, '').trim()
//     if (!clean) return null

//     const title = extractTitle(clean) || null

//     const quoteMatch = clean.match(/[«""]([^»""]{10,})[»""]/u)
//     const originalText = quoteMatch ? quoteMatch[1].trim() : undefined

// const refMatch = clean.match(/(المادة\s+\d+[^\.،;]*|الفقرة\s+\d+[^\.،;]*)/u)
// const referenceText = refMatch ? refMatch[0].trim() : undefined

//     const description = clean
//       .replace(/^\*?\*?[^:：]+\*?\*?[:：]\s*/, '')
//       .replace(/\*\*/g, '')
//       .replace(/[«""][^»""]*[»""]/gu, '')   // أزل الاقتباسات من الوصف
//       .trim()

//     return { title, description, originalText, referenceText }
//   }

//   if (riskyText && !riskyText.includes('لا توجد') && !riskyText.includes('لا يوجد')) {
//     const lines = riskyText.split('\n').filter((l) => l.trim().length > 10)
//     for (const line of lines) {
//       const parsed = parseLine(line)
//       if (!parsed) continue
//       clauses.push({
//         id: String(id++),
//         title: parsed.title || `بند خطير ${id}`,
//         status: 'risky' as const,
//         description: parsed.description,
//         note: 'هذا البند يحتاج مراجعة قانونية',
//         originalText: parsed.originalText,
//         referenceText: parsed.referenceText,
//       })
//     }
//   }

//   if (unclearText && !unclearText.includes('لا توجد') && !unclearText.includes('لا يوجد')) {
//     const lines = unclearText.split('\n').filter((l) => l.trim().length > 10)
//     for (const line of lines) {
//       const parsed = parseLine(line)
//       if (!parsed) continue
//       clauses.push({
//         id: String(id++),
//         title: parsed.title || `بند غير واضح ${id}`,
//         status: 'unclear' as const,
//         description: parsed.description,
//         note: 'يحتاج توضيح',
//         originalText: parsed.originalText,
//         referenceText: parsed.referenceText,
//       })
//     }
//   }

//   if (positiveText && !positiveText.includes('لا توجد') && !positiveText.includes('لا يوجد')) {
//     const lines = positiveText.split('\n').filter((l) => l.trim().length > 10)
//     for (const line of lines) {
//       const parsed = parseLine(line)
//       if (!parsed) continue
//       clauses.push({
//         id: String(id++),
//         title: parsed.title || `بند إيجابي ${id}`,
//         status: 'matched' as const,
//         description: parsed.description,
//         note: 'مطابق للمعايير',
//         originalText: parsed.originalText,
//         referenceText: parsed.referenceText,
//       })
//     }
//   }

//   return clauses
// }

 
// export async function askAboutContract(
//   _fileId: string,
//   question: string,
//   _analysisResult: AnalysisResult,
//   sessionId?: string,
// ): Promise<ChatMessage> {
//   const res = await fetch(`${BASE_URL}/api/chat/`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       ...authHeaders(),
//     },
//     body: JSON.stringify({
//       session_id: sessionId,
//       message: question,
//     }),
//   })
//   if (!res.ok) throw new Error('فشل الاتصال بالمستشار')
//   const data = await res.json()
//   return {
//     id: 'msg-' + Date.now(),
//     role: 'assistant',
//     content: data.reply,
//     timestamp: new Date(),
//   }
// }
 
// export async function askGeneralQuestion(
//   question: string,
//   history: Array<{ role: string; content: string }> = [],
//   namespace: string = 'both',
// ): Promise<ChatMessage> {
//   const res = await fetch(`${BASE_URL}/api/chat/general`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       ...authHeaders(),
//     },
//     body: JSON.stringify({
//       message: question,
//       namespace,
//       history,
//     }),
//   })
//   if (!res.ok) throw new Error('فشل الاتصال بالمستشار')
//   const data = await res.json()
//   return {
//     id: 'msg-' + Date.now(),
//     role: 'assistant',
//     content: data.reply,
//     timestamp: new Date(),
//   }
// }
 
// export async function getContractHistory(sessionId: string): Promise<ChatMessage[]> {
//   const res = await fetch(`${BASE_URL}/api/chat/${sessionId}/history`, {
//     headers: { 'Content-Type': 'application/json', ...authHeaders() },
//   })
//   if (!res.ok) return []
//   const data = await res.json()
//   return data.history.map((msg: any, i: number) => ({
//     id: 'history-' + i,
//     role: msg.role,
//     content: msg.content,
//     timestamp: new Date(),
//   }))
// }