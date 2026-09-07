'use client'

interface SelectProps {
  options: { label: string; value: string }[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  size?: 'sm' | 'md'
  className?: string
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-11 rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  size = 'md',
  className = '',
}: SelectProps) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`glass-panel appearance-none cursor-pointer text-text-primary
        font-medium transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-accent-orange/40 focus:border-accent-orange/60
        hover:bg-surface/90
        ${sizeStyles[size]} ${className}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: '36px',
      }}
    >
      <option value="" disabled className="bg-surface text-text-muted">
        {placeholder}
      </option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-surface text-text-primary">
          {opt.label}
        </option>
      ))}
    </select>
  )
}
