import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  value: string
  onChange: (value: string) => void
  className?: string
  min?: string
  max?: string
}

export default function DatePicker({ value, onChange, className = '', min, max }: Props) {
  const { i18n } = useTranslation()
  const [displayValue, setDisplayValue] = useState(value)
  const [isEditing, setIsEditing] = useState(false)
  const blurHandledRef = useRef(false)

  // Format date based on language
  const formatDateForDisplay = useCallback((dateStr: string): string => {
    if (!dateStr) return ''

    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    if (i18n.language.startsWith('zh')) {
      return `${year}/${month}/${day}`
    } else {
      return `${year}-${month}-${day}`
    }
  }, [i18n.language])

  // Parse date from display format
  const parseDisplayDate = useCallback((displayStr: string): string => {
    if (!displayStr) return ''

    // Try to parse YYYY/MM/DD or YYYY-MM-DD format
    const parts = displayStr.split(/[/-]/)
    if (parts.length === 3) {
      const year = parts[0]
      const month = parts[1].padStart(2, '0')
      const day = parts[2].padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    return displayStr
  }, [])

  // Update display value when prop changes (not while editing)
  useEffect(() => {
    // During blur, handleBlur already set the display value — don't overwrite
    if (blurHandledRef.current) {
      blurHandledRef.current = false
      return
    }
    if (!isEditing) {
      setDisplayValue(formatDateForDisplay(value))
    }
  }, [value, isEditing, formatDateForDisplay])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayValue = e.target.value
    setDisplayValue(newDisplayValue)

    // Try to parse and notify parent
    const isoDate = parseDisplayDate(newDisplayValue)
    if (isoDate) {
      onChange(isoDate)
    }
  }

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoDate = e.target.value
    if (isoDate) {
      onChange(isoDate)
      setDisplayValue(formatDateForDisplay(isoDate))
      setIsEditing(false)
    }
  }

  const handleBlur = () => {
    setIsEditing(false)
    // Re-format on blur to ensure consistency
    const isoDate = parseDisplayDate(displayValue)
    if (isoDate) {
      blurHandledRef.current = true
      setDisplayValue(formatDateForDisplay(isoDate))
      onChange(isoDate)
    }
  }

  const handleFocus = () => {
    setIsEditing(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Enter to confirm
    if (e.key === 'Enter') {
      handleBlur()
      ;(e.target as HTMLElement).blur()
    }
  }

  const handleContainerClick = () => {
    // Focus the input to show the date picker
    const container = document.querySelector(`[data-date-picker="${value}"]`)
    if (container) {
      const input = container.querySelector('input[type="date"]') as HTMLInputElement
      if (input && typeof input.showPicker === 'function') {
        input.showPicker()
      }
    }
  }

  return (
    <div
      className="relative"
      data-date-picker={value}
      onClick={handleContainerClick}
    >
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={i18n.language.startsWith('zh') ? '年/月/日' : 'YYYY-MM-DD'}
        className={`${className} cursor-pointer`}
      />
      <input
        type="date"
        value={value}
        onChange={handlePickerChange}
        min={min}
        max={max}
        className="absolute inset-0 opacity-0 cursor-pointer"
        tabIndex={-1}
      />
    </div>
  )
}
