import type { AnalysisResult } from '../types/analysis'
import type { CheckSettings } from '../types/settings'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

export interface StreamEvent {
  step: string
  label: string
  progress: number
  result?: AnalysisResult
  message?: string
}

export interface OcrProviderResult {
  full_text?: string
  lines?: { text: string; confidence: number }[]
  avg_confidence?: number
  line_count?: number
  error?: string
}

export interface OcrCompareResult {
  yandex: OcrProviderResult
  nemotron: OcrProviderResult
}

export interface PipelineCompareResult {
  yandex: { ok: boolean; result?: Record<string, unknown>; error?: string }
  nemotron: { ok: boolean; result?: Record<string, unknown>; error?: string }
}

export async function comparePipelinesFull(file: File, settings?: CheckSettings | null): Promise<PipelineCompareResult> {
  const form = new FormData()
  form.append('file', file)
  if (settings) form.append('settings', JSON.stringify(settings))
  const resp = await fetch(`${BASE}/analyze/pipeline-compare`, { method: 'POST', body: form })
  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText)
    throw new Error(`API error ${resp.status}: ${text}`)
  }
  return resp.json() as Promise<PipelineCompareResult>
}

export async function compareOcr(file: File, mergeLevel?: string): Promise<OcrCompareResult> {
  const form = new FormData()
  form.append('file', file)
  if (mergeLevel) form.append('merge_level', mergeLevel)
  const resp = await fetch(`${BASE}/analyze/ocr-compare`, { method: 'POST', body: form })
  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText)
    throw new Error(`API error ${resp.status}: ${text}`)
  }
  return resp.json() as Promise<OcrCompareResult>
}

export async function analyzeLabel(file: File, settings?: CheckSettings | null): Promise<AnalysisResult> {
  const form = new FormData()
  form.append('file', file)
  if (settings) form.append('settings', JSON.stringify(settings))

  const resp = await fetch(`${BASE}/analyze`, { method: 'POST', body: form })

  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText)
    throw new Error(`API error ${resp.status}: ${text}`)
  }

  return resp.json() as Promise<AnalysisResult>
}

export async function analyzeLabelStream(
  file: File,
  settings: CheckSettings | null,
  onProgress: (event: StreamEvent) => void,
): Promise<AnalysisResult> {
  const form = new FormData()
  form.append('file', file)
  if (settings) form.append('settings', JSON.stringify(settings))

  const resp = await fetch(`${BASE}/analyze/stream`, { method: 'POST', body: form })

  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText)
    throw new Error(`API error ${resp.status}: ${text}`)
  }

  if (!resp.body) throw new Error('No response body for streaming')

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''

    for (const chunk of chunks) {
      const line = chunk.trim()
      if (!line.startsWith('data: ')) continue
      const event = JSON.parse(line.slice(6)) as StreamEvent
      onProgress(event)
      if (event.step === 'error') {
        throw new Error(event.message ?? 'Pipeline error')
      }
      if (event.step === 'done' && event.result) {
        return event.result
      }
    }
  }

  throw new Error('Stream ended without result')
}
