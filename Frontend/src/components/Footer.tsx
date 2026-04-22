import React from 'react';
export function Footer() {
  return (
    <footer className="bg-eclipse border-t border-eclipse-3 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-cream-muted text-sm text-center">
          <p>منصة ذكية لتحليل العقود بالذكاء الاصطناعي.</p>
          <p className="mt-1">
            © {new Date().getFullYear()} بصيرة. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>);

}