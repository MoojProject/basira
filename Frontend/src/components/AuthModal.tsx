import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, CheckCircle2Icon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { registerUser, loginUser, verifyEmail, forgotPassword, resetPassword } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (name: string, email: string) => void;
}

type Tab = 'register' | 'verify' | 'login' | 'forgot' | 'reset';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  code?: string;
  login?: string;
  api?: string;
}

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { score, label: 'ضعيفة', color: 'bg-danger', text: 'text-danger' };
  if (score === 3) return { score, label: 'متوسطة', color: 'bg-warn', text: 'text-warn' };
  if (score === 4) return { score, label: 'جيدة', color: 'bg-matcha', text: 'text-matcha' };
  return { score, label: 'قوية جداً', color: 'bg-safe', text: 'text-safe' };
}

function getPasswordHint(password: string): string {
  if (!password) return '';
  if (!/[A-Z]/.test(password)) return 'أضف حرفاً كبيراً';
  if (!/[a-z]/.test(password)) return 'أضف حرفاً صغيراً';
  if (!/[0-9]/.test(password)) return 'أضف رقماً';
  if (!/[^A-Za-z0-9]/.test(password)) return 'أضف رمزاً (!@#$)';
  if (password.length < 8) return 'أضف أحرفاً أكثر';
  return '';
}

export function AuthModal({ isOpen, onClose, onAuth }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('register');
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', code: '', newPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<{ name: string; email: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const strength = getPasswordStrength(formData.password);
  const hint = getPasswordHint(formData.password);
  const confirmMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', confirmPassword: '', code: '', newPassword: '' });
    setErrors({});
    setSuccessMessage(null);
    setActiveTab('register');
    setIsLoading(false);
    setPendingAuth(null);
    setShowPassword(false);
    setShowConfirm(false);
  };

  const handleClose = () => { onClose(); setTimeout(resetForm, 300); };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (password: string) =>
    /(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}/.test(password);

  const handleTabSwitch = (tab: Tab) => { setActiveTab(tab); setErrors({}); setSuccessMessage(null); };

  const handleRegister = async () => {
    const newErrors: FormErrors = {};
    if (formData.name.trim().length < 2) newErrors.name = 'الاسم يجب أن يكون حرفين على الأقل';
    if (!validateEmail(formData.email)) newErrors.email = 'البريد الإلكتروني غير صحيح';
    if (!validatePassword(formData.password)) newErrors.password = 'كلمة المرور ضعيفة';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'كلمتا المرور غير متطابقتين';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setIsLoading(true);
    try {
      const data = await registerUser(formData.email, formData.password, formData.name);
      setPendingAuth({ name: data.full_name, email: formData.email });
      setSuccessMessage('تم إرسال كود التحقق على بريدك الإلكتروني');
      setActiveTab('verify');
    } catch (err: any) {
      setErrors({ api: err.message || 'فشل إنشاء الحساب، حاولي مرة ثانية' });
    } finally { setIsLoading(false); }
  };

  const handleVerify = async () => {
    if (!formData.code || formData.code.length !== 6) { setErrors({ code: 'أدخل الكود المكون من 6 أرقام' }); return; }
    setIsLoading(true);
    try {
      await verifyEmail(pendingAuth?.email || formData.email, formData.code);
      onAuth(pendingAuth?.name || '', pendingAuth?.email || formData.email);
      handleClose();
    } catch (err: any) {
      setErrors({ code: err.message || 'الكود غير صحيح' });
    } finally { setIsLoading(false); }
  };

  const handleLogin = async () => {
    if (!validateEmail(formData.email)) { setErrors({ email: 'البريد الإلكتروني غير صحيح' }); return; }
    setIsLoading(true);
    try {
      const data = await loginUser(formData.email, formData.password);
      onAuth(data.full_name, formData.email);
      handleClose();
    } catch (err: any) {
      setErrors({ login: err.message || 'البريد أو كلمة المرور غير صحيحة' });
    } finally { setIsLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!validateEmail(formData.email)) { setErrors({ email: 'البريد الإلكتروني غير صحيح' }); return; }
    setIsLoading(true);
    try {
      await forgotPassword(formData.email);
      setSuccessMessage('تم إرسال كود إعادة التعيين على بريدك');
      setActiveTab('reset');
    } catch (err: any) {
      setErrors({ api: err.message || 'البريد غير مسجل' });
    } finally { setIsLoading(false); }
  };

  const handleResetPassword = async () => {
    const newErrors: FormErrors = {};
    if (!formData.code || formData.code.length !== 6) newErrors.code = 'أدخل الكود المكون من 6 أرقام';
    if (!validatePassword(formData.newPassword)) newErrors.password = 'كلمة المرور ضعيفة';
    if (formData.newPassword !== formData.confirmPassword) newErrors.confirmPassword = 'كلمتا المرور غير متطابقتين';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setIsLoading(true);
    try {
      await resetPassword(formData.email, formData.code, formData.newPassword);
      setSuccessMessage('تم تغيير كلمة المرور بنجاح ✓');
      setTimeout(() => handleTabSwitch('login'), 2000);
    } catch (err: any) {
      setErrors({ code: err.message || 'الكود غير صحيح أو منتهي الصلاحية' });
    } finally { setIsLoading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    switch (activeTab) {
      case 'register': handleRegister(); break;
      case 'verify': handleVerify(); break;
      case 'login': handleLogin(); break;
      case 'forgot': handleForgotPassword(); break;
      case 'reset': handleResetPassword(); break;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'register': return 'إنشاء حساب';
      case 'verify': return 'تحقق من بريدك';
      case 'login': return 'تسجيل الدخول';
      case 'forgot': return 'نسيت كلمة المرور؟';
      case 'reset': return 'إعادة تعيين كلمة المرور';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-eclipse-2 border border-eclipse-3 rounded-2xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
          dir="rtl"
        >
          <button onClick={handleClose} className="absolute top-4 left-4 p-2 text-cream-muted hover:text-cream transition-colors rounded-lg hover:bg-eclipse-3">
            <XIcon className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-extrabold font-heading text-cream mb-6">{getTitle()}</h2>

          {successMessage && (
            <div className="mb-4 p-3 bg-safe/10 border border-safe/30 rounded-xl">
              <p className="text-sm text-safe">{successMessage}</p>
            </div>
          )}
          {errors.api && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-xl">
              <p className="text-sm text-danger">{errors.api}</p>
            </div>
          )}
          {errors.login && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-xl">
              <p className="text-sm text-danger">{errors.login}</p>
            </div>
          )}

          {activeTab === 'register' && (
            <div className="bg-matcha/10 border border-matcha/30 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-matcha mb-3">بإنشاء حسابك تقدر:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2Icon className="w-4 h-4 text-matcha flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-cream">حفظ تقارير عقودك والرجوع لها لاحقاً</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2Icon className="w-4 h-4 text-matcha flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-cream">متابعة سجل محادثاتك مع المستشارين</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'verify' && (
            <p className="text-sm text-cream-dim mb-6">
              أرسلنا كود التحقق إلى <span className="text-matcha">{pendingAuth?.email || formData.email}</span> — أدخله هنا للمتابعة
            </p>
          )}

          {activeTab === 'forgot' && (
            <p className="text-sm text-cream-dim mb-6">
              أدخل بريدك الإلكتروني وسنرسل لك كود إعادة التعيين
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* الاسم */}
            {activeTab === 'register' && (
              <div>
                <label className="block text-sm font-medium text-cream-dim mb-1.5">الاسم الكامل</label>
                <input type="text" value={formData.name}
                  onChange={(e) => { setFormData({ ...formData, name: e.target.value }); if (errors.name) setErrors({ ...errors, name: undefined }); }}
                  placeholder="محمد عبدالله" required
                  className="w-full bg-eclipse border border-eclipse-3 rounded-xl py-3 px-4 text-cream placeholder-cream-muted focus:outline-none focus:border-matcha focus:ring-1 focus:ring-matcha transition-all"
                />
                {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
              </div>
            )}

            {/* البريد */}
            {(activeTab === 'register' || activeTab === 'login' || activeTab === 'forgot') && (
              <div>
                <label className="block text-sm font-medium text-cream-dim mb-1.5">البريد الإلكتروني</label>
                <input type="email" value={formData.email}
                  onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (errors.email || errors.login) setErrors({ ...errors, email: undefined, login: undefined }); }}
                  placeholder="example@email.com" dir="ltr" required
                  className="w-full bg-eclipse border border-eclipse-3 rounded-xl py-3 px-4 text-cream placeholder-cream-muted focus:outline-none focus:border-matcha focus:ring-1 focus:ring-matcha transition-all text-left"
                />
                {errors.email && <p className="text-xs text-danger mt-1">{errors.email}</p>}
              </div>
            )}

            {/* كلمة المرور - register و login */}
            {(activeTab === 'register' || activeTab === 'login') && (
              <div>
                <label className="block text-sm font-medium text-cream-dim mb-1.5">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => { setFormData({ ...formData, password: e.target.value }); if (errors.password || errors.login) setErrors({ ...errors, password: undefined, login: undefined }); }}
                    placeholder="••••••••" dir="ltr" required
                    className="w-full bg-eclipse border border-eclipse-3 rounded-xl py-3 px-4 pl-10 text-cream placeholder-cream-muted focus:outline-none focus:border-matcha focus:ring-1 focus:ring-matcha transition-all text-left"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream transition-colors">
                    {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-danger mt-1">{errors.password}</p>}

                {/* شريط القوة - فقط في register */}
                {activeTab === 'register' && formData.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex-1 h-1.5 rounded-full bg-eclipse-3 overflow-hidden">
                          {strength.score >= i && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              transition={{ duration: 0.3, delay: i * 0.05 }}
                              className={`h-full ${strength.color}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${strength.text}`}>{strength.label}</span>
                      {hint && <span className="text-xs text-cream-muted">{hint}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* تأكيد كلمة المرور - فقط في register */}
            {activeTab === 'register' && (
              <div>
                <label className="block text-sm font-medium text-cream-dim mb-1.5">تأكيد كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => { setFormData({ ...formData, confirmPassword: e.target.value }); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined }); }}
                    placeholder="••••••••" dir="ltr" required
                    className={`w-full bg-eclipse border rounded-xl py-3 px-4 pl-10 text-cream placeholder-cream-muted focus:outline-none focus:ring-1 transition-all text-left ${
                      formData.confirmPassword
                        ? confirmMatch ? 'border-safe focus:border-safe focus:ring-safe' : 'border-danger focus:border-danger focus:ring-danger'
                        : 'border-eclipse-3 focus:border-matcha focus:ring-matcha'
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream transition-colors">
                    {showConfirm ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && (
                  <p className={`text-xs mt-1 ${confirmMatch ? 'text-safe' : 'text-danger'}`}>
                    {confirmMatch ? '✓ كلمتا المرور متطابقتان' : 'كلمتا المرور غير متطابقتين'}
                  </p>
                )}
                {errors.confirmPassword && <p className="text-xs text-danger mt-1">{errors.confirmPassword}</p>}
              </div>
            )}

            {/* كود التحقق */}
            {(activeTab === 'verify' || activeTab === 'reset') && (
              <div>
                <label className="block text-sm font-medium text-cream-dim mb-1.5">كود التحقق</label>
                <input type="text" value={formData.code}
                  onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 6); setFormData({ ...formData, code: val }); if (errors.code) setErrors({ ...errors, code: undefined }); }}
                  placeholder="000000" dir="ltr" required maxLength={6}
                  className="w-full bg-eclipse border border-eclipse-3 rounded-xl py-3 px-4 text-cream placeholder-cream-muted focus:outline-none focus:border-matcha focus:ring-1 focus:ring-matcha transition-all text-center text-xl tracking-[0.5em]"
                />
                {errors.code && <p className="text-xs text-danger mt-1">{errors.code}</p>}
              </div>
            )}

            {/* كلمة المرور الجديدة - reset */}
            {activeTab === 'reset' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-cream-dim mb-1.5">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={formData.newPassword}
                      onChange={(e) => { setFormData({ ...formData, newPassword: e.target.value }); if (errors.password) setErrors({ ...errors, password: undefined }); }}
                      placeholder="••••••••" dir="ltr" required
                      className="w-full bg-eclipse border border-eclipse-3 rounded-xl py-3 px-4 pl-10 text-cream placeholder-cream-muted focus:outline-none focus:border-matcha focus:ring-1 focus:ring-matcha transition-all text-left"
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream transition-colors">
                      {showNewPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-danger mt-1">{errors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-cream-dim mb-1.5">تأكيد كلمة المرور</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => { setFormData({ ...formData, confirmPassword: e.target.value }); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined }); }}
                      placeholder="••••••••" dir="ltr" required
                      className="w-full bg-eclipse border border-eclipse-3 rounded-xl py-3 px-4 pl-10 text-cream placeholder-cream-muted focus:outline-none focus:border-matcha focus:ring-1 focus:ring-matcha transition-all text-left"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream transition-colors">
                      {showConfirm ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-danger mt-1">{errors.confirmPassword}</p>}
                </div>
              </>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full mt-6 py-3 bg-matcha text-eclipse rounded-xl font-heading font-extrabold hover:bg-matcha-light transition-colors shadow-lg shadow-matcha/20 disabled:opacity-70"
            >
              {isLoading ? 'جاري التحميل...' : (
                <>
                  {activeTab === 'register' && 'أنشئ حسابك'}
                  {activeTab === 'verify' && 'تحقق من الحساب'}
                  {activeTab === 'login' && 'تسجيل الدخول'}
                  {activeTab === 'forgot' && 'إرسال الكود'}
                  {activeTab === 'reset' && 'تغيير كلمة المرور'}
                </>
              )}
            </button>

            <div className="text-center mt-4 space-y-2">
              {activeTab === 'register' && (
                <button type="button" onClick={() => handleTabSwitch('login')} className="text-sm text-cream-dim hover:text-cream transition-colors">
                  عندك حساب؟ سجّل دخولك
                </button>
              )}
              {activeTab === 'verify' && (
                <button type="button" onClick={() => handleTabSwitch('register')} className="text-sm text-cream-dim hover:text-cream transition-colors">
                  ← رجوع للتسجيل
                </button>
              )}
              {activeTab === 'login' && (
                <div className="space-y-2">
                  <button type="button" onClick={() => handleTabSwitch('register')} className="text-sm text-cream-dim hover:text-cream transition-colors block mx-auto">
                    ما عندك حساب؟ أنشئ حسابك
                  </button>
                  <button type="button" onClick={() => handleTabSwitch('forgot')} className="text-sm text-matcha hover:text-matcha-light transition-colors block mx-auto">
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}
              {activeTab === 'forgot' && (
                <button type="button" onClick={() => handleTabSwitch('login')} className="text-sm text-cream-dim hover:text-cream transition-colors">
                  ← رجوع لتسجيل الدخول
                </button>
              )}
              {activeTab === 'reset' && (
                <button type="button" onClick={() => handleTabSwitch('forgot')} className="text-sm text-cream-dim hover:text-cream transition-colors">
                  ← طلب كود جديد
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}