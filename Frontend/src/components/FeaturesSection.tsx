import React, { Children } from 'react';
import { motion } from 'framer-motion';
export function FeaturesSection() {
  const features = [
  {
    title: 'حلّل عقدك وافهم كل بند',
    description: 'ارفع عقدك وبصيرة تقرأه وتصنف كل بند — آمن، يحتاج انتباه، أو خطير'
  },
  {
    title: 'عقودك كلها في مكان واحد',
    description: 'سجّل حسابك واحفظ كل تحليلاتك وارجع لها متى ما تبي'
  },
  {
    title: 'اسأل مستشارينا عن أي بند',
    description: 'اختر مستشارك حسب نوع عقدك واسأله عن أي شي — يجاوبك فوراً'
  },
  {
    title: 'نولّد لك عقدك جاهزاً',
    description: 'اختر نوع العقد، أدخل بياناتك، وبصيرة تجهز لك مسودة قانونية متكاملة في دقائق.'
  }
];

  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
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
        duration: 0.5
      }
    }
  };
  return (
    <section className="py-24 bg-eclipse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold mb-4 font-heading text-[#F8F2DA]">
            مميزات بصيرة
          </h2>
          <div className="w-24 h-1 bg-matcha mx-auto rounded-full opacity-70"></div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{
            once: true,
            margin: '-100px'
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {features.map((feature, index) =>
          <motion.div
            key={index}
            variants={itemVariants}
            className="bg-eclipse-2 rounded-xl p-8 border border-eclipse-3 border-r-2 border-r-matcha hover:bg-eclipse-3/50 transition-colors duration-300">
            
              <h3 className="text-2xl font-bold mb-4 font-heading text-[#F8F2DA]">
                {feature.title}
              </h3>
              <p className="text-cream-dim leading-relaxed text-lg">
                {feature.description}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>);

}