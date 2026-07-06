import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Input, Button } from '../../components'
import { useEdition } from '../../hooks/useEdition'

interface ActivationDialogProps {
  open: boolean
  onClose: () => void
}

export default function ActivationDialog({ open, onClose }: ActivationDialogProps) {
  const { t } = useTranslation()
  const { info, refreshInfo } = useEdition()
  const [licenseKey, setLicenseKey] = useState('')
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError(t('activation.enterKey'))
      return
    }

    setActivating(true)
    setError('')

    try {
      const result = await window.electron.edition.activate(licenseKey.trim())
      if (result.success) {
        setSuccess(true)
        await refreshInfo()
        setTimeout(() => {
          onClose()
          setSuccess(false)
          setLicenseKey('')
        }, 1500)
      } else {
        setError(result.error || t('activation.failed'))
      }
    } catch (err: any) {
      setError(err.message || t('activation.failed'))
    } finally {
      setActivating(false)
    }
  }

  const handleClose = () => {
    setLicenseKey('')
    setError('')
    setSuccess(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} title={t('activation.title')} maxWidth="sm">
      <div className="space-y-4">
        {/* Current edition info */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            {t('activation.currentEdition')}: <span className="font-medium text-gray-900">{t(`editions.${info.edition}`)}</span>
          </div>
          {info.edition === 'trial' && info.trialDaysRemaining !== null && (
            <div className="text-sm text-gray-500 mt-1">
              {t('trial.daysRemaining', { days: info.trialDaysRemaining })}
            </div>
          )}
        </div>

        {/* License key input */}
        <div>
          <Input
            label={t('activation.licenseKey')}
            id="license-key"
            type="text"
            value={licenseKey}
            onChange={e => setLicenseKey(e.target.value)}
            placeholder={t('activation.enterKeyPlaceholder')}
          />
        </div>

        {/* Edition comparison - gradually reduced based on current edition */}
        {info.edition === 'trial' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">
              {t('activation.upgradeOptions')}
            </p>
            <div className="text-xs text-blue-800 space-y-1">
              <p>• <strong>基础版</strong>: {t('activation.trialUpgradeToBasicFeatures')}</p>
              <p>• <strong>专业版</strong>: {t('activation.trialUpgradeToProFeatures')}</p>
              <p>• <strong>终极版</strong>: {t('activation.trialUpgradeToUltimateFeatures')}</p>
            </div>
          </div>
        )}
        {info.edition === 'basic' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">
              {t('activation.upgradeFromBasicToPro')}
            </p>
            <div className="text-xs text-blue-800 space-y-1">
              <p>• {t('activation.upgradeFromBasicToProFeatures')}</p>
              <p>• {t('activation.upgradeFromBasicToUltimateNote')}</p>
            </div>
          </div>
        )}
        {info.edition === 'pro' && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm font-medium text-purple-900 mb-1">
              {t('activation.upgradeToUltimate')}
            </p>
            <p className="text-xs text-purple-700">
              {t('activation.unlockAdvancedFeatures')}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{t('activation.success')}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleActivate} disabled={activating || success}>
            {activating ? t('activation.activating') : t('activation.activate')}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
