import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2Icon } from 'lucide-react';
export function WhyBasiraSection() {
  const reasons = [
  'مناسب للسوق السعودي',
  'واجهة عربية سهلة',
  'تحليل سريع وواضح',
  'شرح مبسط للبنود القانونية'];

  return (
    <section className="py-24 bg-eclipse-2 border-t border-eclipse-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-16">
          <div className="lg:w-1/2">
            <motion.div
              initial={{
                opacity: 0,
                x: 20
              }}
              whileInView={{
                opacity: 1,
                x: 0
              }}
              viewport={{
                once: true
              }}
              transition={{
                duration: 0.6
              }}>
              
              <h2 className="text-4xl font-extrabold font-heading mb-6 text-[#F8F2DA]">
                لماذا بصيرة؟
              </h2>
              <p className="text-cream-dim text-lg mb-10 leading-relaxed">
                صُممت منصة بصيرة خصيصاً لتلبي احتياجات السوق السعودي، معتمدة على
                أحدث تقنيات الذكاء الاصطناعي لتبسيط اللغة القانونية المعقدة
                وجعلها مفهومة للجميع، كأنك تستشير مكتب محاماة رائد.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {reasons.map((reason, index) =>
                <div
                  key={index}
                  className="flex items-center space-x-3 space-x-reverse">
                  
                    <CheckCircle2Icon className="w-6 h-6 text-matcha flex-shrink-0" />
                    <span className="text-lg font-medium text-cream">
                      {reason}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <div className="lg:w-1/2 w-full">
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.9
              }}
              whileInView={{
                opacity: 1,
                scale: 1
              }}
              viewport={{
                once: true
              }}
              transition={{
                duration: 0.6
              }}
              className="bg-eclipse border border-eclipse-3 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
              
              <div className="absolute top-0 right-0 w-40 h-40 bg-matcha/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8 border-b border-eclipse-3 pb-4">
                  <span className="text-cream-dim font-heading">
                    نتيجة التحليل
                  </span>
                  <span className="bg-safe/10 text-safe border border-safe/20 px-4 py-1.5 rounded-full text-sm font-medium">
                    آمن نسبيًا
                  </span>
                </div>
                <div className="space-y-5">
                  <div className="h-4 bg-eclipse-3 rounded w-3/4"></div>
                  <div className="h-4 bg-eclipse-3 rounded w-full"></div>
                  <div className="h-4 bg-eclipse-3 rounded w-5/6"></div>
                </div>
                <div className="mt-10 p-5 bg-eclipse-2 rounded-xl border border-eclipse-3">
                  <p className="text-sm text-cream leading-relaxed">
                    "هذا البند يوضح مدة تجربة الموظف. المدة المذكورة (90 يوماً)
                    متوافقة مع نظام العمل السعودي."
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>);

}