import { useState } from 'react'
import { analyzeLabelStream } from '../api/client'
import type { AnalysisResult } from '../types/analysis'
import type { CheckSettings } from '../types/settings'

export type AnalysisStep =
  | 'idle'
  | 'file_prepare'
  | 'yandex_ocr'
  | 'gemini_analyze'
  | 'merge'
  | 'done'
  | 'error'

export interface AnalysisState {
  step: AnalysisStep
  progress: number
  stepLabel: string
  result: AnalysisResult | null
  imageUrl: string | null
  error: string | null
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    step: 'idle',
    progress: 0,
    stepLabel: '',
    result: null,
    imageUrl: null,
    error: null,
  })

  async function run(file: File, settings: CheckSettings | null = null) {
    if (state.imageUrl) URL.revokeObjectURL(state.imageUrl)

    const imageUrl = URL.createObjectURL(file)
    setState({
      step: 'file_prepare',
      progress: 0,
      stepLabel: 'Подготовка файла',
      result: null,
      imageUrl,
      error: null,
    })

    try {
      const result = await analyzeLabelStream(file, settings, (event) => {
        if (event.step !== 'done' && event.step !== 'error') {
          setState(s => ({
            ...s,
            step: event.step as AnalysisStep,
            progress: event.progress,
            stepLabel: event.label,
          }))
        }
      })

      setState({
        step: 'done',
        progress: 100,
        stepLabel: 'Готово',
        result,
        imageUrl,
        error: null,
      })
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
    setState({ step: 'idle', progress: 0, stepLabel: '', result: null, imageUrl: null, error: null })
  }

  return { state, run, reset }
}
