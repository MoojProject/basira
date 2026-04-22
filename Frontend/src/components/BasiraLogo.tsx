import React from 'react';
interface BasiraLogoProps {
  className?: string;
  size?: 'sm' | 'lg';
}
export function BasiraLogo({ className = '', size = 'lg' }: BasiraLogoProps) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <span
        style={{
          fontFamily: 'Almarai, sans-serif',
          fontWeight: 800,
          color: '#F8F2DA',
          fontSize: size === 'sm' ? '1.75rem' : '7rem',
          lineHeight: 1.1,
          letterSpacing: '-2px',
          display: 'block'
        }}>
        
        بصيرة
      </span>
      {size === 'lg' &&
      <>
          <div
          style={{
            width: '60%',
            height: '1px',
            background: '#8B897E',
            margin: '0.75rem auto'
          }} />
        
          <span
          style={{
            fontFamily: 'Almarai, sans-serif',
            fontWeight: 400,
            fontSize: '1.4rem',
            letterSpacing: '0.5px'
          }}
          className="text-[#C2A878]">
          
            اقرأ عقدك بعيون خبيرة
          </span>
        </>
      }
    </div>);

}