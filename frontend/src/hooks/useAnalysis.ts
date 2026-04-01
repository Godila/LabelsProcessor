import { useState } from 'react'
import { analyzeLabel } from '../api/client'
import type { AnalysisResult } from '../types/analysis'

export type AnalysisStep = 'idle' | 'uploading' | 'ocr' | 'ai' | 'done' | 'error'

export interface AnalysisState {
  step: AnalysisStep
  result: AnalysisResult | null
  imageUrl: string | null
  error: string | null
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    step: 'idle',
    result: null,
    imageUrl: null,
    error: null,
  })

  async function run(file: File) {
    // Revoke previous object URL
    if (state.imageUrl) URL.revokeObjectURL(state.imageUrl)

    const imageUrl = URL.createObjectURL(file)
    setState({ step: 'uploading', result: null, imageUrl, error: null })

    try {
      // Simulate step progression for UX feedback
      setState(s => ({ ...s, step: 'ocr' }))
      const result = await analyzeLabel(file)
      setState(s => ({ ...s, step: 'ai' }))
      // Small delay so user sees the "AI analysis" step
      await new Promise(r => setTimeout(r, 300))
      setState({ step: 'done', result, imageUrl, error: null })
    } catch (e) {
      setState(s => ({
        ...s,
        step: 'error',
        error: e instanceof Error ? e.message : String(e),
      }))
    }
  }

  function reset() {
    if (state.imageUrl) URL.revokeObjectURL(state.imageUrl)
    setState({ step: 'idle', result: null, imageUrl: null, error: null })
  }

  return { state, run, reset }
}
