import { Dialog } from './Dialog'
import { Button } from './Button'
import { useTranslation } from 'react-i18next'

interface AlertDialogProps {
  open: boolean
  onClose: () => void
  title?: string
  message: string
  variant?: 'success' | 'error' | 'warning' | 'info'
}

export function AlertDialog({
  open,
  onClose,
  title,
  message,
  variant = 'info'
}: AlertDialogProps) {
  const { t } = useTranslation()

  const iconColor = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500'
  }

  const icon = {
    success: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  return (
    <Dialog open={open} onClose={onClose} title={title || t('common.info')} maxWidth="sm">
      <div className="py-4 flex items-start gap-4">
        <div className={`flex-shrink-0 ${iconColor[variant]}`}>
          {icon[variant]}
        </div>
        <p className="text-gray-600">{message}</p>
      </div>
      <div className="flex justify-end pt-4 border-t border-gray-100">
        <Button onClick={onClose}>
          {t('common.ok')}
        </Button>
      </div>
    </Dialog>
  )
}
