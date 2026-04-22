import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileTextIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  FileSearchIcon,
  MessageSquareIcon,
  ArrowLeftIcon,
  Loader2Icon,
  Trash2Icon,
  XCircleIcon,
  PlusCircleIcon,
} from 'lucide-react';
 
const BASE_URL = import.meta.env.VITE_API_URL || ''
 
interface DashboardProps {
  user: { name: string; email: string };
  onUpload: () => void;
  onGeneralChat: () => void;
  onViewResult: (contractId: string) => void;
  onOpenDraft?: () => void;
}
 
interface Contract {
  id: string;
  original_filename: string;
  contract_type: string;
  verdict: string | null;
  summary: string | null;
  created_at: string;
}
 
export function Dashboard({ user, onUpload, onGeneralChat, onViewResult, onOpenDraft }: DashboardProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
 
  useEffect(() => {
    const token = localStorage.getItem('basira_token');
    if (!token) { setLoading(false); return; }
    fetch(`${BASE_URL}/api/contracts/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setContracts(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
 
  const handleDelete = async (contractId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التحليل؟')) return;
    const token = localStorage.getItem('basira_token');
    if (!token) return;
    setDeletingId(contractId);
    try {
      const res = await fetch(`${BASE_URL}/api/contracts/${contractId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setContracts((prev) => prev.filter((c) => c.id !== contractId));
      }
    } catch (e) {
      console.error('Failed to delete', e);
    } finally {
      setDeletingId(null);
    }
  };
 
  const getStatusColor = (verdict: string | null) => {
    switch (verdict) {
      case 'safe': return 'bg-safe/10 text-safe border-safe/20';
      case 'dangerous': return 'bg-danger/10 text-danger border-danger/20';
      default: return 'bg-warn/10 text-warn border-warn/20';
    }
  };
 
  const getStatusLabel = (verdict: string | null) => {
    switch (verdict) {
      case 'safe': return 'آمن';
      case 'dangerous': return 'خطير';
      default: return 'يحتاج مراجعة';
    }
  };
 
  const contractTypeMap: Record<string, string> = {
    rent: 'عقد إيجار',
    labor: 'عقد عمل',
    nda: 'اتفاقية سرية',
    both: 'عقد عام',
    other: 'عقد عام',
  };
 
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ar-SA');
 
  const hasAnalyses = contracts.length > 0;
 
  const stats = [
    {
      label: 'عدد العقود المحللة',
      value: String(contracts.length),
      icon: <FileTextIcon className="w-5 h-5 text-cream-dim" />,
      color: 'bg-eclipse-2 border-eclipse-3',
    },
    {
      label: 'العقود الآمنة',
      value: String(contracts.filter((c) => c.verdict === 'safe').length),
      icon: <CheckCircleIcon className="w-5 h-5 text-safe" />,
      color: 'bg-safe/5 border-safe/20',
    },
    {
      label: 'العقود الخطرة',
      value: String(contracts.filter((c) => c.verdict === 'dangerous').length),
      icon: <AlertTriangleIcon className="w-5 h-5 text-warn" />,  // ← هنا
      color: 'bg-warn/5 border-warn/20',
    },
    {
      label: 'تحتاج مراجعة',
      value: String(contracts.filter((c) => c.verdict === 'review' || c.verdict === null).length),
      icon: <ClockIcon className="w-5 h-5 text-matcha-light" />,  // ← هنا
      color: 'bg-warn/5 border-warn/20',
    },
  ];
 
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };
 
  return (
    <section className="relative py-10 px-4 sm:px-8 bg-eclipse">
      <div className="max-w-7xl mx-auto">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
 
          {/* Welcome Section */}
          <motion.div variants={itemVariants} className="mb-10">
            <h1 className="text-4xl font-extrabold mb-3 font-heading text-[#F8F2DA]">
              أهلاً، {user.name}! 👋
            </h1>
            <p className="text-lg text-cream-dim">
              لوحة التحكم — تابع عقودك وتحليلاتك من مكان واحد
            </p>
          </motion.div>
 
          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 mb-10">
            <button
              onClick={onUpload}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-matcha text-eclipse rounded-xl font-heading font-extrabold hover:bg-matcha-light transition-colors"
            >
              <FileSearchIcon className="w-5 h-5" />
              حلّل عقد جديد
            </button>
            <button
              onClick={onGeneralChat}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-eclipse-2 border border-eclipse-3 text-cream rounded-xl font-heading font-bold hover:border-matcha-dim transition-colors"
            >
              <MessageSquareIcon className="w-5 h-5" />
              اسأل المستشار
            </button>
            {onOpenDraft && (
              <button
                onClick={onOpenDraft}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-eclipse-2 border border-matcha/30 text-matcha rounded-xl font-heading font-bold hover:bg-matcha/10 hover:border-matcha transition-colors"
              >
                <PlusCircleIcon className="w-5 h-5" />
                أنشئ عقدًا
              </button>
            )}
          </motion.div>
 
          {/* Stats */}
          {hasAnalyses && (
            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {stats.map((stat, index) => (
                <div key={index} className={`p-5 rounded-xl border flex flex-col items-center justify-center text-center ${stat.color}`}>
                  <div className="mb-2">{stat.icon}</div>
                  <span className="text-2xl font-extrabold font-heading text-cream mb-1">{stat.value}</span>
                  <span className="text-xs font-medium text-cream-dim">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          )}
 
          {/* Recent Analyses */}
          <motion.div variants={itemVariants}>
            {hasAnalyses && (
              <h2 className="text-2xl font-extrabold font-heading text-cream mb-6">
                تحليلاتك الأخيرة
              </h2>
            )}
 
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2Icon className="w-8 h-8 text-matcha animate-spin" />
              </div>
            ) : hasAnalyses ? (
              <div className="space-y-4">
                {contracts.map((contract, index) => (
                  <div
                    key={index}
                    className="bg-eclipse-2 border border-eclipse-3 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-eclipse-3/80 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-cream">{contract.original_filename}</h3>
                        <span className="text-sm text-cream-muted">
                          {contractTypeMap[contract.contract_type] || contract.contract_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className={`text-xs font-medium px-3 py-1 rounded-full border ${getStatusColor(contract.verdict)}`}>
                          {getStatusLabel(contract.verdict)}
                        </span>
                        <span className="text-sm text-cream-muted flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" />
                          {formatDate(contract.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewResult(contract.id)}
                        className="flex items-center gap-2 px-5 py-2 bg-eclipse border border-eclipse-3 text-cream rounded-lg font-medium hover:border-matcha-dim hover:text-matcha transition-colors whitespace-nowrap"
                      >
                        عرض النتيجة
                        <ArrowLeftIcon className="w-4 h-4 rtl:rotate-180" />
                      </button>
                      <button
                        onClick={() => handleDelete(contract.id)}
                        disabled={deletingId === contract.id}
                        className="p-2 text-cream-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        title="حذف"
                      >
                        {deletingId === contract.id
                          ? <Loader2Icon className="w-5 h-5 animate-spin" />
                          : <Trash2Icon className="w-5 h-5" />
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-eclipse-2 border border-eclipse-3 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                <div className="bg-eclipse-3/50 p-4 rounded-full mb-6">
                  <FileTextIcon className="w-12 h-12 text-cream-muted" />
                </div>
                <h3 className="text-2xl font-extrabold font-heading text-cream mb-3">
                  لا يوجد تحليلات بعد
                </h3>
                <p className="text-cream-dim mb-8 max-w-md">
                  ابدأ برفع عقدك الأول لتحليله واكتشاف البنود الخطرة والناقصة،
                  أو اسأل المستشار القانوني عن أي استفسار.
                </p>
                <button
                  onClick={onUpload}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-matcha text-eclipse rounded-xl font-heading font-extrabold hover:bg-matcha-light transition-colors text-lg"
                >
                  <FileSearchIcon className="w-6 h-6" />
                  حلل عقد جديد
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}