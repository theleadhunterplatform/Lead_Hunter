'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  findCountryByDialCode,
  extractCountryAndLocalNumber,
  type Country,
} from '@/lib/countries'

interface PhoneInputWithCountryProps {
  countryCode: string
  onCountryCodeChange: (dialCode: string) => void
  phoneNumber: string
  onPhoneNumberChange: (val: string) => void
  error?: string
  disabled?: boolean
  className?: string
}

export function PhoneInputWithCountry({
  countryCode,
  onCountryCodeChange,
  phoneNumber,
  onPhoneNumberChange,
  error,
  disabled = false,
  className = '',
}: PhoneInputWithCountryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const phoneInputRef = useRef<HTMLInputElement>(null)

  const selectedCountry = useMemo(() => {
    return findCountryByDialCode(countryCode) || DEFAULT_COUNTRY
  }, [countryCode])

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearch('')
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        phoneInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return COUNTRIES
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q),
    )
  }, [search])

  const handleSelectCountry = (country: Country) => {
    onCountryCodeChange(country.dialCode)
    setIsOpen(false)
    phoneInputRef.current?.focus()
  }

  // Handle pasting or typing a full number with country code (e.g. "+91 9876543210")
  const handlePhoneChange = (val: string) => {
    if (val.trim().startsWith('+')) {
      const parsed = extractCountryAndLocalNumber(val)
      onCountryCodeChange(parsed.dialCode)
      onPhoneNumberChange(parsed.localNumber)
      return
    }
    onPhoneNumberChange(val)
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        {/* Country Picker Dropdown Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            className={`h-[46px] px-3.5 flex items-center gap-2 rounded-xl bg-surface-elevated border transition-all text-sm select-none ${
              isOpen
                ? 'border-primary/50 ring-1 ring-primary/50 text-white'
                : 'border-white/5 text-white/90 hover:border-white/10 hover:bg-white/[0.04]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="text-base leading-none" role="img" aria-label={selectedCountry.name}>
              {selectedCountry.flag}
            </span>
            <span className="font-semibold text-xs tracking-tight text-white">
              {selectedCountry.dialCode}
            </span>
            <ChevronDownIcon
              className={`w-3.5 h-3.5 text-text-secondary/70 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-primary' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-72 max-w-[85vw] bg-[#161718] border border-white/10 rounded-2xl shadow-elevation-4 backdrop-blur-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
              {/* Search Box */}
              <div className="p-2 border-b border-white/[0.06] sticky top-0 bg-[#161718]/95 backdrop-blur-md z-10">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 text-text-secondary/50 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search country or code..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.06] rounded-lg text-white placeholder:text-text-secondary/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              {/* Country List */}
              <div className="max-h-56 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {/* Highlight India at top if not searching */}
                {!search && (
                  <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-text-secondary/40">
                    Recommended
                  </div>
                )}

                {filteredCountries.map((country) => {
                  const isSelected = country.dialCode === selectedCountry.dialCode && country.code === selectedCountry.code
                  return (
                    <button
                      key={`${country.code}-${country.dialCode}`}
                      type="button"
                      onClick={() => handleSelectCountry(country)}
                      className={`w-full px-3 py-2 flex items-center justify-between text-left text-xs transition-colors group ${
                        isSelected
                          ? 'bg-primary/15 text-primary font-medium'
                          : 'hover:bg-white/[0.05] text-text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0" role="img" aria-label={country.name}>
                          {country.flag}
                        </span>
                        <span className="truncate group-hover:text-white">
                          {country.name}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-mono shrink-0 ml-2 ${
                          isSelected ? 'text-primary font-bold' : 'text-text-secondary/70'
                        }`}
                      >
                        {country.dialCode}
                      </span>
                    </button>
                  )
                })}

                {filteredCountries.length === 0 && (
                  <div className="py-6 text-center text-xs text-text-secondary/50">
                    No country found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Local Phone Number Input */}
        <div className="flex-1 relative">
          <input
            ref={phoneInputRef}
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
            disabled={disabled}
            type="tel"
            inputMode="tel"
            placeholder={selectedCountry.format || '98765 43210'}
            className={`w-full h-[46px] bg-surface-elevated border text-white rounded-xl outline-none transition-all px-4 py-3 font-medium text-sm placeholder:text-text-secondary/40 ${
              error
                ? 'border-red-500/50 focus:ring-1 focus:ring-red-500/50'
                : 'border-white/5 focus:ring-1 focus:ring-primary/50 focus:border-primary/50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        </div>
      </div>
    </div>
  )
}
