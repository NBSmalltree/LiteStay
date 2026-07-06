import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { EditionInfo, Edition, FeatureKey } from '../../shared/editions'
import { hasFeature } from '../../shared/editions'

interface EditionContextValue {
  info: EditionInfo
  loading: boolean
  hasFeature: (feature: FeatureKey) => boolean
  refreshInfo: () => Promise<void>
}

const defaultInfo: EditionInfo = {
  edition: 'trial',
  trialStartDate: null,
  trialExpired: false,
  trialDaysRemaining: null,
  activatedAt: null
}

const EditionContext = createContext<EditionContextValue>({
  info: defaultInfo,
  loading: true,
  hasFeature: () => false,
  refreshInfo: async () => {}
})

export function EditionProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<EditionInfo>(defaultInfo)
  const [loading, setLoading] = useState(true)

  const refreshInfo = useCallback(async () => {
    try {
      const editionInfo = await window.electron.edition.getInfo()
      setInfo(editionInfo)
    } catch (error) {
      console.error('Failed to get edition info:', error)
    }
  }, [])

  useEffect(() => {
    const initEdition = async () => {
      try {
        // First call: side-effectful trial check (updates lastLaunchTime)
        const trialResult = await window.electron.edition.checkTrial()
        // Then get the full edition info
        await refreshInfo()
      } catch (error) {
        console.error('Failed to initialize edition:', error)
      } finally {
        setLoading(false)
      }
    }

    initEdition()
  }, [refreshInfo])

  const checkFeature = useCallback(
    (feature: FeatureKey) => hasFeature(info.edition, feature),
    [info.edition]
  )

  return (
    <EditionContext.Provider
      value={{
        info,
        loading,
        hasFeature: checkFeature,
        refreshInfo
      }}
    >
      {children}
    </EditionContext.Provider>
  )
}

export function useEdition() {
  return useContext(EditionContext)
}
