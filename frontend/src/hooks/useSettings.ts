import { useState } from 'react'
import type { CheckSettings } from '../types/settings'
import { DEFAULT_SETTINGS } from '../types/settings'

const STORAGE_KEY = 'x5_check_settings'

export function useSettings() {
  const [settings, setSettings] = useState<CheckSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  function update(patch: Partial<CheckSettings>) {
    const next = { ...settings, ...patch }
    setSettings(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function reset() {
    setSettings(DEFAULT_SETTINGS)
    localStorage.removeItem(STORAGE_KEY)
  }

  return { settings, update, reset }
}
