import React, { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Eye, EyeOff } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading,
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'bg-hunter-orange text-black neo-orange-border hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[0px] active:translate-y-[0px]',
    secondary: 'bg-hunter-grey text-white neo-border border-zinc-700 hover:bg-zinc-800',
    outline: 'bg-transparent text-white border-2 border-white hover:bg-white/10'
  };

  const sizes = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-6 py-3 text-base',
    lg: 'px-10 py-5 text-xl'
  };

  return (
    <button
      className={cn(
        'font-display font-black uppercase tracking-tight transition-all disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, type, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="w-full">
      {label && (
        <label className="block font-display font-bold uppercase text-xs tracking-widest mb-2 text-zinc-400">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className={cn(
            'w-full bg-hunter-grey border-2 border-zinc-800 p-4 text-white font-medium focus:border-hunter-orange focus:outline-none transition-colors placeholder:text-zinc-600',
            isPassword && 'pr-12',
            error && 'border-red-500',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500 font-bold uppercase tracking-wider">{error}</p>}
    </div>
  );
}
