import React, { useEffect, useState, createElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloudIcon,
  FileTextIcon,
  SearchIcon,
  CheckCircleIcon,
  Loader2Icon } from
'lucide-react';
const steps = [
{
  id: 1,
  label: 'جاري رفع الملف...',
  icon: UploadCloudIcon,
  duration: 2000
},
{
  id: 2,
  label: 'جاري قراءة النص...',
  icon: FileTextIcon,
  duration: 2500
},
{
  id: 3,
  label: 'جاري تحليل البنود...',
  icon: SearchIcon,
  duration: 3000
},
{
  id: 4,
  label: 'جاري تجهيز النتيجة...',
  icon: CheckCircleIcon,
  duration: 2000
}];

export function AnalyzingProgress() {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 50;
      const newProgress = Math.min(elapsed / totalDuration * 100, 98);
      setProgress(newProgress);
      let cumulative = 0;
      for (let i = 0; i < steps.length; i++) {
        cumulative += steps[i].duration;
        if (elapsed < cumulative) {
          setActiveStep(i);
          break;
        }
        if (i === steps.length - 1) {
          setActiveStep(steps.length - 1);
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Animated Icon */}
      <div className="flex justify-center mb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{
              opacity: 0,
              scale: 0.8,
              y: 10
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
              y: -10
            }}
            transition={{
              duration: 0.3
            }}
            className="relative">
            
            <div className="absolute inset-0 bg-matcha/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-eclipse-2 p-6 rounded-full shadow-lg border border-matcha-dim">
              {createElement(steps[activeStep].icon, {
                className: 'w-12 h-12 text-matcha'
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Title */}
      <AnimatePresence mode="wait">
        <motion.h2
          key={activeStep}
          initial={{
            opacity: 0,
            y: 10
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          exit={{
            opacity: 0,
            y: -10
          }}
          transition={{
            duration: 0.25
          }}
          className="text-2xl md:text-3xl font-extrabold font-heading text-cream text-center mb-2">
          
          {steps[activeStep].label}
        </motion.h2>
      </AnimatePresence>

      <p className="text-cream-dim text-center mb-10 text-base">
        يقوم الذكاء الاصطناعي بقراءة النص ومقارنته بالمعايير النظامية
      </p>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-cream-muted">التقدم</span>
          <span className="text-sm font-semibold text-matcha">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-2 bg-eclipse-3 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-matcha rounded-full"
            initial={{
              width: '0%'
            }}
            animate={{
              width: `${progress}%`
            }}
            transition={{
              duration: 0.1,
              ease: 'linear'
            }} />
          
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;
          const isPending = index > activeStep;
          const StepIcon = step.icon;
          return (
            <motion.div
              key={step.id}
              initial={{
                opacity: 0,
                x: 10
              }}
              animate={{
                opacity: 1,
                x: 0
              }}
              transition={{
                delay: index * 0.1,
                duration: 0.3
              }}
              className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border transition-all duration-300 ${isActive ? 'bg-matcha/10 border-matcha/40 shadow-sm shadow-matcha/10' : isCompleted ? 'bg-eclipse-2/50 border-eclipse-3/50' : 'bg-eclipse-2/30 border-eclipse-3/30 opacity-50'}`}>
              
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-matcha text-eclipse' : isCompleted ? 'bg-matcha/30 text-matcha' : 'bg-eclipse-3 text-cream-muted'}`}>
                
                {isCompleted ?
                <CheckCircleIcon className="w-4 h-4" /> :
                isActive ?
                <Loader2Icon className="w-4 h-4 animate-spin" /> :

                <StepIcon className="w-4 h-4" />
                }
              </div>

              <span
                className={`text-sm font-medium ${isActive ? 'text-cream' : isCompleted ? 'text-cream-dim line-through decoration-matcha/40' : 'text-cream-muted'}`}>
                
                {step.label}
              </span>

              {isActive &&
              <div className="mr-auto flex gap-1">
                  {[0, 1, 2].map((dot) =>
                <motion.div
                  key={dot}
                  className="w-1.5 h-1.5 rounded-full bg-matcha"
                  animate={{
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: dot * 0.2
                  }} />

                )}
                </div>
              }
            </motion.div>);

        })}
      </div>
    </div>);

}