import React from 'react';
import { BasiraLogo } from './BasiraLogo';
import { MailIcon } from 'lucide-react';

const CONTACT_EMAIL = 'basira.noreply@gmail.com';

export function Footer() {
  return (
    <footer className="bg-eclipse border-t border-eclipse-3 py-12 mt-auto" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

        <div className="flex justify-center mb-3 text-cream">
          <BasiraLogo size="sm" />
        </div>

        <p className="text-cream-dim text-sm mb-8">
          منصة ذكية لتحليل العقود بالذكاء الاصطناعي.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* البريد — بدون لون */}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex items-center gap-2 px-5 py-2.5 border border-eclipse-3 rounded-full text-sm text-cream-dim hover:border-matcha hover:text-matcha transition-colors"
          >
            <MailIcon className="w-4 h-4" />
            البريد: {CONTACT_EMAIL}
          </a>

          {/* تواصل معنا — ملون */}
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=تواصل - بصيرة`}
            className="flex items-center gap-2 px-5 py-2.5 bg-matcha text-eclipse rounded-full text-sm font-bold hover:bg-matcha-light transition-colors"
          >
            <MailIcon className="w-4 h-4" />
            تواصل معنا
          </a>
        </div>

        <p className="text-cream-muted text-xs mt-8">
          © {new Date().getFullYear()} بصيرة. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}