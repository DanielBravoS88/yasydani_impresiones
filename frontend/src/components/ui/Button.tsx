import { type ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'aqua' | 'outline' | 'ghost';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'text-white shadow-[0_10px_20px_rgba(255,79,216,0.25)] hover:opacity-90',
  aqua:    'bg-brand-aqua text-[#063d43] hover:bg-brand-aqua2',
  outline: 'bg-transparent border-2 border-brand-pink text-brand-pink hover:bg-brand-pink2',
  ghost:   'bg-transparent text-brand-text hover:bg-brand-pink2',
};

const VARIANT_STYLES: Partial<Record<Variant, React.CSSProperties>> = {
  primary: { background: 'linear-gradient(135deg, #ff4fd8, #ff77c8)' },
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, className = '', children, style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          border-0 rounded-full font-black cursor-pointer transition-all
          active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
          ${VARIANT_CLASSES[variant]}
          ${SIZE_CLASSES[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        style={{ ...VARIANT_STYLES[variant], ...style }}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
