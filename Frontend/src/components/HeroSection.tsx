import React, { Children } from 'react';
import { motion } from 'framer-motion';
import { MessageSquareIcon, FileSearchIcon } from 'lucide-react';
import { BasiraLogo } from './BasiraLogo';
interface HeroSectionProps {
  onUpload: () => void;
  onGeneralChat: () => void;
  user: {
    name: string;
    email: string;
  } | null;
}
export function HeroSection({
  onUpload,
  onGeneralChat,
  user
}: HeroSectionProps) {
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6
      }
    }
  };
  // Logged-in personalized view
  if (user) {
    return (
      <section className="relative pt-28 pb-36 overflow-hidden bg-eclipse">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="flex flex-col items-center text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible">
            
            <motion.h1
              variants={itemVariants}
              className="text-5xl font-heading font-extrabold text-[#F8F2DA]">
              
              أهلاً، {user.name}! 👋
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-xl mt-4 text-[#d4d0bc]">
              
              عقودك بأمان معنا — وين تبي تبدأ؟
            </motion.p>

            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12 max-w-xl mx-auto w-full">
              
              <motion.div
                variants={itemVariants}
                onClick={onUpload}
                className="bg-eclipse-2 border border-eclipse-3 rounded-2xl p-8 text-center cursor-pointer hover:border-matcha hover:scale-[1.02] transition-all duration-300">
                
                <FileSearchIcon className="w-10 h-10 text-matcha mx-auto mb-4" />
                <h3 className="text-xl text-cream mb-2 font-heading font-extrabold">
                  حلّل عقدك الآن
                </h3>
                <p className="text-sm text-cream-dim">
                  ارفع عقدك وتقدر تعرف وين الخطر في دقائق
                </p>
              </motion.div>

              <motion.div
                variants={itemVariants}
                onClick={onGeneralChat}
                className="bg-eclipse-2 border border-eclipse-3 rounded-2xl p-8 text-center cursor-pointer hover:border-matcha hover:scale-[1.02] transition-all duration-300">
                
                <MessageSquareIcon className="w-10 h-10 text-matcha mx-auto mb-4" />
                <h3 className="text-xl text-cream mb-2 font-heading font-extrabold">
                  اسأل المستشار
                </h3>
                <p className="text-sm text-cream-dim">
                  تحدّث مع مستشار متخصص في نوع عقدك
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>);

  }
  // Guest view — unchanged
  return (
    <section className="relative pt-28 pb-36 overflow-hidden bg-eclipse">
      {/* Subtle diagonal lines background */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
          'repeating-linear-gradient(45deg, var(--color-matcha) 0, var(--color-matcha) 1px, transparent 1px, transparent 40px)'
        }}>
      </div>

      {/* Glow effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-1/4 -right-40 w-96 h-96 rounded-full bg-matcha/10 blur-3xl"></div>
        <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-eclipse-3/40 blur-3xl"></div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="z-10 flex flex-col items-center text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible">
          
          {/* Logo */}
          <motion.div variants={itemVariants} className="mb-6">
            <BasiraLogo />
          </motion.div>

          <motion.p
            variants={itemVariants}
            className="text-lg mb-12 leading-relaxed max-w-xl text-[#C7D1CE]">
            
            حلّل عقدك بدقة قانونية — اكتشف المخاطر، وافهم حقوقك، قبل أن تضع
            توقيعك.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center gap-3">
            
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onUpload}
                className="flex items-center justify-center px-14 py-5 bg-matcha text-eclipse rounded-xl font-heading font-extrabold text-xl hover:bg-matcha-light transition-colors shadow-xl shadow-matcha/25">
                
                ابدأ الآن
              </button>
              <p className="text-sm text-cream-muted mt-3 text-center leading-relaxed">
                أنشئ حسابك لحفظ تقارير عقودك
                <br />
                ومتابعة سجل محادثاتك مع المستشارين
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>);

}