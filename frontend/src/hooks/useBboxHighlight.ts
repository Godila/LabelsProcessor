import { useState } from 'react'

export function useBboxHighlight() {
  const [activeField, setActiveField] = useState<string | null>(null)

  return { activeField, setActiveField }
}
