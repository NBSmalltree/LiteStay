import { Dialog } from './Dialog'
import { Button } from './Button'
import { useTranslation } from 'react-i18next'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'info'
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} maxWidth="sm">
      <div className="py-4">
        <p className="text-gray-600">{message}</p>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={onClose}>
          {cancelText || t('common.cancel')}
        </Button>
        <Button
          variant={variant === 'danger' ? 'ghost' : 'primary'}
          className={variant === 'danger' ? 'text-red-600 hover:bg-red-50' : ''}
          onClick={handleConfirm}
        >
          {confirmText || t('common.confirm')}
        </Button>
      </div>
    </Dialog>
  )
}
