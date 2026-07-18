'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement>;

const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className = '', disabled, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} ref={ref} disabled={disabled} type={visible ? 'text' : 'password'}
        className={`${className} pr-12`} />
      <button type="button" onClick={() => setVisible(current => !current)} disabled={disabled}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}
        title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl text-brand-text/55 transition-colors hover:text-brand-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink disabled:opacity-40">
        {visible ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m3 3 18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9 5 9 5a16 16 0 0 1-2.1 2.6M6.6 6.6C4.4 8 3 10 3 10s3.5 5 9 5c1 0 2-.2 2.8-.5" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z" /><circle cx="12" cy="12" r="2.5" />
          </svg>
        )}
      </button>
    </div>
  );
});

export default PasswordInput;
