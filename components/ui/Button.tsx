'use client';

import { clsx } from 'clsx';
import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'buy' | 'sell' | 'ghost' | 'outline' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'sm', loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 rounded select-none',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          {
            'px-2 py-0.5 text-[11px]': size === 'xs',
            'px-3 py-1 text-xs': size === 'sm',
            'px-4 py-1.5 text-sm': size === 'md',
            'px-5 py-2 text-sm': size === 'lg',
          },
          {
            'bg-[#2962FF] hover:bg-[#1a4ecf] text-white': variant === 'default',
            'bg-[#089981] hover:bg-[#077a68] text-white font-semibold': variant === 'buy',
            'bg-[#F23645] hover:bg-[#c72b38] text-white font-semibold': variant === 'sell',
            'bg-transparent hover:bg-[#2A2E3D] text-[#D1D4DC] border border-[#2A2E3D] hover:border-[#3d4460]': variant === 'outline',
            'bg-transparent hover:bg-[#2A2E3D] text-[#787B86] hover:text-[#D1D4DC]': variant === 'ghost',
            'bg-[#F23645]/10 hover:bg-[#F23645]/20 text-[#F23645] border border-[#F23645]/30': variant === 'danger',
          },
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export default Button;
