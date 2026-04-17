'use client'

import { createContext, useContext, useState } from 'react'

type PreviewContextType = {
  previewFree: boolean
  togglePreview: () => void
}

const PreviewContext = createContext<PreviewContextType>({ previewFree: false, togglePreview: () => {} })

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [previewFree, setPreviewFree] = useState(false)
  return (
    <PreviewContext.Provider value={{ previewFree, togglePreview: () => setPreviewFree((v) => !v) }}>
      {children}
    </PreviewContext.Provider>
  )
}

export function usePreview() {
  return useContext(PreviewContext)
}
