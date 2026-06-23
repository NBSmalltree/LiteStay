import { useEffect, ReactNode } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  zIndex?: number
}

const maxWidths = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export function Dialog({ open, onClose, title, children, footer, maxWidth = 'md', zIndex = 50 }: DialogProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Dialog container */}
      <div
        className={`relative ${maxWidths[maxWidth]} w-full mx-4 flex flex-col`}
        style={{ zIndex: 100, maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-dialog flex flex-col" style={{ maxHeight: '100%' }}>
          {/* Header - absolutely positioned button to avoid any overlap */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 pr-8">{title}</h2>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClose()
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute top-3 right-3 p-2 -m-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              style={{ zIndex: 200 }}
              aria-label="关闭"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Body - scrollable */}
          <div className={`flex-1 px-6 py-5 ${footer ? 'overflow-y-auto' : ''}`} style={{ minHeight: 0 }}>
            {children}
          </div>
          {/* Footer - fixed at bottom */}
          {footer && (
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
