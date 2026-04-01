import type { AnalysisResult } from '../types/analysis'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

export async function analyzeLabel(file: File): Promise<AnalysisResult> {
  const form = new FormData()
  form.append('file', file)

  const resp = await fetch(`${BASE}/analyze`, { method: 'POST', body: form })

  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText)
    throw new Error(`API error ${resp.status}: ${text}`)
  }

  return resp.json() as Promise<AnalysisResult>
}
