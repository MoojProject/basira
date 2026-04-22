import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XIcon,
  FileTextIcon,
  Loader2Icon,
  DownloadIcon,
  BriefcaseIcon,
  HomeIcon,
  LockIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckIcon,
} from 'lucide-react';

interface ContractDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ContractKind = 'labor' | 'rent' | 'nda' | null;
type Step = 'type' | 'form' | 'generating' | 'result';

const laborFields = [
  { key: 'employer', label: 'اسم صاحب العمل / الشركة', placeholder: 'شركة الأفق للتقنية' },
  { key: 'employee', label: 'اسم الموظف', placeholder: 'محمد عبدالله الغامدي' },
  { key: 'position', label: 'المسمى الوظيفي', placeholder: 'مهندس برمجيات' },
  { key: 'salary', label: 'الراتب الشهري (ريال)', placeholder: '12000' },
  { key: 'housingAllowance', label: 'بدل السكن (ريال)', placeholder: '3000' },
  { key: 'transportAllowance', label: 'بدل المواصلات (ريال)', placeholder: '1500' },
  { key: 'duration', label: 'مدة العقد', placeholder: 'سنة واحدة قابلة للتجديد' },
  { key: 'workHours', label: 'ساعات العمل اليومية', placeholder: '8 ساعات' },
  { key: 'city', label: 'مدينة العمل', placeholder: 'الرياض' },
];

const rentFields = [
  { key: 'landlord', label: 'اسم المؤجر', placeholder: 'أحمد سالم الزهراني' },
  { key: 'tenant', label: 'اسم المستأجر', placeholder: 'سارة خالد العمري' },
  { key: 'property', label: 'وصف العقار', placeholder: 'شقة سكنية من 3 غرف' },
  { key: 'address', label: 'عنوان العقار', placeholder: 'حي النرجس، الرياض' },
  { key: 'rent', label: 'الإيجار السنوي (ريال)', placeholder: '36000' },
  { key: 'duration', label: 'مدة الإيجار', placeholder: 'سنة هجرية' },
  { key: 'startDate', label: 'تاريخ بداية العقد (هجري)', placeholder: '1446/07/01' },
  { key: 'deposit', label: 'مبلغ التأمين (ريال)', placeholder: '3000' },
];

const ndaFields = [
  { key: 'disclosing', label: 'الطرف المُفصِح (صاحب المعلومات)', placeholder: 'شركة بصيرة للتقنية' },
  { key: 'receiving', label: 'الطرف المُتلقي', placeholder: 'محمد عبدالله الغامدي' },
  { key: 'purpose', label: 'الغرض من الاتفاقية', placeholder: 'تقييم فرصة شراكة تجارية' },
  { key: 'duration', label: 'مدة السرية', placeholder: '3 سنوات من تاريخ التوقيع' },
  { key: 'scope', label: 'نطاق المعلومات السرية', placeholder: 'بيانات العملاء، الكود المصدري، الخطط التجارية' },
  { key: 'jurisdiction', label: 'الجهة القضائية المختصة', placeholder: 'محاكم مدينة الرياض' },
];

const contractTypes = [
  {
    id: 'labor',
    label: 'عقد عمل',
    desc: 'توظيف / علاقة عمل',
    icon: BriefcaseIcon,
    color: 'border-matcha/40 hover:border-matcha bg-matcha/5',
    iconColor: 'text-matcha',
    fields: laborFields,
  },
  {
    id: 'rent',
    label: 'عقد إيجار',
    desc: 'سكني أو تجاري',
    icon: HomeIcon,
    color: 'border-safe/40 hover:border-safe bg-safe/5',
    iconColor: 'text-safe',
    fields: rentFields,
  },
  {
    id: 'nda',
    label: 'اتفاقية سرية (NDA)',
    desc: 'عدم إفصاح / عدم منافسة',
    icon: LockIcon,
    color: 'border-warn/40 hover:border-warn bg-warn/5',
    iconColor: 'text-warn',
    fields: ndaFields,
  },
];

export function ContractDraftModal({ isOpen, onClose }: ContractDraftModalProps) {
  const [step, setStep] = useState<Step>('type');
  const [kind, setKind] = useState<ContractKind>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState('');
  const [error, setError] = useState('');

  const selectedType = contractTypes.find((t) => t.id === kind);

  const reset = () => {
    setStep('type');
    setKind(null);
    setFormData({});
    setGenerated('');
    setError('');
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const handleSelectType = (id: ContractKind) => {
    setKind(id);
    setStep('form');
  };

  const handleGenerate = async () => {
    if (!kind || !selectedType) return;
    setStep('generating');
    setError('');

    const fieldsText = selectedType.fields
      .map((f) => `${f.label}: ${formData[f.key] || '(غير محدد)'}`)
      .join('\n');

    const prompts: Record<string, string> = {
      labor: `أنشئ عقد عمل سعودي رسمي كامل وفق نظام العمل السعودي بناءً على البيانات التالية:\n${fieldsText}\n\nالعقد يجب أن يتضمن: مقدمة، تعريفات، مدة العقد، الراتب والمزايا، ساعات العمل، الإجازات، الإنهاء، مكافأة نهاية الخدمة، السرية، الحوكمة. اكتبه بصيغة رسمية قانونية عربية فقط. استخدم ## قبل كل عنوان قسم رئيسي.`,
      rent: `أنشئ عقد إيجار سكني سعودي رسمي كامل وفق نظام الإيجار السعودي بناءً على البيانات التالية:\n${fieldsText}\n\nالعقد يجب أن يتضمن: المقدمة، وصف العقار، مدة الإيجار، الإيجار وآلية الدفع، التزامات المؤجر والمستأجر، الصيانة، الإخلاء، التأمين. اكتبه بصيغة رسمية قانونية عربية فقط. استخدم ## قبل كل عنوان قسم رئيسي.`,
      nda: `أنشئ اتفاقية سرية وعدم إفصاح (NDA) سعودية رسمية كاملة بناءً على البيانات التالية:\n${fieldsText}\n\nالاتفاقية يجب أن تتضمن: تعريف المعلومات السرية، الالتزامات، الاستثناءات، مدة الاتفاقية، جزاء المخالفة، القانون المنطبق. اكتبها بصيغة رسمية قانونية عربية فقط. استخدم ## قبل كل عنوان قسم رئيسي.`,
    };

    try {
      // ── توليد النص عبر OpenAI gpt-4o-mini ──
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY || ''}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 3000,
          messages: [
            {
              role: 'system',
              content: 'أنت مستشار قانوني سعودي متخصص في صياغة العقود. صِغ العقود بلغة عربية رسمية دقيقة.',
            },
            { role: 'user', content: prompts[kind] },
          ],
        }),
      });

      if (!openaiRes.ok) throw new Error('فشل الاتصال بـ OpenAI');

      const openaiData = await openaiRes.json();
      const text: string = openaiData.choices?.[0]?.message?.content || '';
      if (!text) throw new Error('لم يُرجع النموذج نصاً');

      setGenerated(text);
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في توليد العقد. يرجى المحاولة مرة أخرى.');
      setStep('form');
    }
  };

  const handleDownload = async () => {
    if (!generated || !kind || !selectedType) return;
    setError('');

    try {
      // ── تحويل النص إلى Word عبر الباك-إند ──
      const BASE_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${BASE_URL}/api/draft/generate-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: generated,
          title: selectedType.label,
          contract_type: kind,
        }),
      });

      if (!res.ok) throw new Error('فشل تحويل العقد إلى Word');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `عقد_${selectedType.label}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: تحميل نص عادي إذا فشل الباك-إند
      const blob = new Blob([generated], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `عقد_${selectedType.label}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-eclipse/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl bg-eclipse-2 border border-eclipse-3 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-eclipse-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-matcha/10 border border-matcha/20 rounded-lg flex items-center justify-center">
                  <FileTextIcon className="w-5 h-5 text-matcha" />
                </div>
                <div>
                  <h2 className="font-extrabold font-heading text-cream text-lg">
                    توليد مسودة عقد
                  </h2>
                  <p className="text-xs text-cream-muted">وفق الأنظمة السعودية</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-cream-muted hover:text-cream transition-colors p-1"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Steps indicator */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-eclipse-3 flex-shrink-0">
              {(['type', 'form', 'result'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                        ${step === s || (step === 'generating' && s === 'form') || (step === 'result' && i < 2)
                          ? 'bg-matcha text-eclipse'
                          : 'bg-eclipse-3 text-cream-muted'}`}
                    >
                      {step === 'result' && i < 2 ? <CheckIcon className="w-3 h-3" /> : i + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block ${step === s ? 'text-cream' : 'text-cream-muted'}`}>
                      {s === 'type' ? 'نوع العقد' : s === 'form' ? 'البيانات' : 'المسودة'}
                    </span>
                  </div>
                  {i < 2 && <div className="flex-1 h-px bg-eclipse-3 max-w-12" />}
                </div>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* Step 1: نوع العقد */}
              {step === 'type' && (
                <div className="space-y-3">
                  <p className="text-sm text-cream-dim mb-4">اختر نوع العقد الذي تريد توليده:</p>
                  {contractTypes.map((ct) => {
                    const Icon = ct.icon;
                    return (
                      <button
                        key={ct.id}
                        onClick={() => handleSelectType(ct.id as ContractKind)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-right ${ct.color}`}
                      >
                        <div className={`w-10 h-10 rounded-lg bg-eclipse-3/50 flex items-center justify-center flex-shrink-0 ${ct.iconColor}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-cream">{ct.label}</div>
                          <div className="text-xs text-cream-muted">{ct.desc}</div>
                        </div>
                        <ChevronLeftIcon className="w-4 h-4 text-cream-muted mr-auto" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step 2: النموذج */}
              {(step === 'form' || step === 'generating') && selectedType && (
                <div className="space-y-4">
                  <p className="text-sm text-cream-dim mb-2">
                    أدخل بيانات <strong className="text-cream">{selectedType.label}</strong>:
                  </p>
                  {selectedType.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-cream-dim mb-1">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        value={formData[field.key] || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        disabled={step === 'generating'}
                        className="w-full bg-eclipse border border-eclipse-3 rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-matcha-dim transition-colors disabled:opacity-50"
                      />
                    </div>
                  ))}

                  {error && (
                    <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-3">
                      {error}
                    </p>
                  )}
                </div>
              )}

              {/* Step: جاري التوليد */}
              {step === 'generating' && (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <Loader2Icon className="w-10 h-10 text-matcha animate-spin" />
                  <p className="text-cream-dim text-sm">جاري صياغة العقد وفق الأنظمة السعودية…</p>
                </div>
              )}

              {/* Step 3: النتيجة */}
              {step === 'result' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-cream text-sm">المسودة الجاهزة</h3>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 text-xs font-medium text-matcha border border-matcha/30 hover:bg-matcha/10 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      <DownloadIcon className="w-3.5 h-3.5" />
                      تحميل Word (.docx)
                    </button>
                  </div>
                  <div className="bg-eclipse border border-eclipse-3 rounded-xl p-5 text-sm text-cream-dim leading-relaxed font-serif whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {generated}
                  </div>
                  <p className="mt-3 text-xs text-cream-muted text-center">
                    ⚠️ هذه مسودة استرشادية — يُنصح بمراجعة محامٍ قبل التوقيع
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-eclipse-3 flex-shrink-0">
              {step === 'form' ? (
                <>
                  <button
                    onClick={() => setStep('type')}
                    className="flex items-center gap-1.5 text-sm text-cream-muted hover:text-cream transition-colors"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                    رجوع
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-2 px-6 py-2.5 bg-matcha hover:bg-matcha-light text-eclipse font-heading font-bold rounded-xl text-sm transition-colors"
                  >
                    <FileTextIcon className="w-4 h-4" />
                  </button>
                </>
              ) : step === 'result' ? (
                <>
                  <button
                    onClick={() => setStep('form')}
                    className="flex items-center gap-1.5 text-sm text-cream-muted hover:text-cream transition-colors"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex items-center gap-2 px-6 py-2.5 bg-matcha hover:bg-matcha-light text-eclipse font-heading font-bold rounded-xl text-sm transition-colors"
                  >
                    إغلاق
                    <CheckIcon className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}