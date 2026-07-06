import { useTranslation } from 'react-i18next'

interface UpgradeBadgeProps {
  requiredEdition: string
  className?: string
}

export default function UpgradeBadge({ requiredEdition, className = '' }: UpgradeBadgeProps) {
  const { t } = useTranslation()

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium ${className}`}
    >
      <svg
        className="w-3 h-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      {t('upgrade.required', { edition: requiredEdition })}
    </span>
  )
}
