import { useTranslation } from 'react-i18next'

export default function TrialExpiredPage() {
  const { t } = useTranslation()

  const handleClose = () => {
    window.electron.win.close()
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Title Bar */}
      <div className="titlebar-drag h-11 flex-shrink-0 flex items-center justify-between bg-gray-800 border-b border-gray-700">
        <div className="pl-4">
          <span className="text-gray-300 text-sm font-medium">LiteStay</span>
        </div>
        <div className="flex items-center">
          <button
            onClick={handleClose}
            className="h-11 w-11 flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-lg px-10">
          <h1
            className="text-5xl font-bold tracking-wider mb-8"
            style={{ color: '#c8a45c' }}
          >
            {t('trial.expired')}
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed mb-10">
            {t('trial.expiredMessage')}
          </p>
          <button
            onClick={handleClose}
            className="px-8 py-3 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors text-lg"
          >
            {t('trial.closeApp')}
          </button>
        </div>
      </div>
    </div>
  )
}
