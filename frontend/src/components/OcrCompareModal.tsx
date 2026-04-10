import { useState, useRef } from 'react'
import type { OcrCompareResult, OcrProviderResult, PipelineCompareResult } from '../api/client'
import { compareOcr, comparePipelinesFull } from '../api/client'

interface Props {
  onClose: () => void
}

type Mode = 'ocr' | 'pipeline'

export function OcrCompareModal({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>('ocr')
  const [mergeLevel, setMergeLevel] = useState<string>('paragraph')
  const [ocrResult, setOcrResult] = useState<OcrCompareResult | null>(null)
  const [pipelineResult, setPipelineResult] = useState<PipelineCompareResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    setFile(f)
    setLoading(true)
    setError('')
    setOcrResult(null)
    setPipelineResult(null)
    try {
      if (mode === 'ocr') {
        setOcrResult(await compareOcr(f, mergeLevel))
      } else {
        setPipelineResult(await comparePipelinesFull(f))
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function rerun(f: File) {
    if (!f) return
    setLoading(true)
    setError('')
    setOcrResult(null)
    setPipelineResult(null)
    try {
      if (mode === 'ocr') {
        setOcrResult(await compareOcr(f, mergeLevel))
      } else {
        setPipelineResult(await comparePipelinesFull(f))
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const btnStyle = (active: boolean) => ({
    padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontWeight: active ? 700 : 400, fontSize: 13,
    background: active ? '#e63329' : '#f0f0f0',
    color: active ? '#fff' : '#333',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        width: mode === 'pipeline' ? 1100 : 900,
        maxWidth: '98vw', maxHeight: '93vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        transition: 'width 0.2s',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px', borderBottom: '1px solid #eee', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Сравнение OCR</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={btnStyle(mode === 'ocr')} onClick={() => { setMode('ocr'); setOcrResult(null); setPipelineResult(null) }}>
                Только OCR
              </button>
              <button style={btnStyle(mode === 'pipeline')} onClick={() => { setMode('pipeline'); setOcrResult(null); setPipelineResult(null) }}>
                Полный анализ + LLM
              </button>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        {/* Upload bar */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          <button onClick={() => inputRef.current?.click()} disabled={loading} style={{
            background: '#e63329', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 20px', cursor: loading ? 'default' : 'pointer',
            fontWeight: 600, fontSize: 13, opacity: loading ? 0.7 : 1,
          }}>
            {loading ? '⏳ Анализирую...' : file ? '📂 Другой файл' : '📂 Выбрать этикетку'}
          </button>
          {file && !loading && (
            <>
              <span style={{ fontSize: 13, color: '#666' }}>{file.name}</span>
              <button onClick={() => rerun(file)} style={{
                background: '#f0f0f0', border: 'none', borderRadius: 8,
                padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: '#333',
              }}>🔄 Повторить</button>
            </>
          )}
          {mode === 'ocr' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <span style={{ fontSize: 12, color: '#666' }}>Nemotron merge:</span>
              {(['word', 'sentence', 'paragraph'] as const).map(ml => (
                <button key={ml} onClick={() => setMergeLevel(ml)} style={{
                  padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: mergeLevel === ml ? 700 : 400,
                  background: mergeLevel === ml ? '#76b900' : '#f0f0f0',
                  color: mergeLevel === ml ? '#fff' : '#333',
                }}>{ml}</button>
              ))}
            </div>
          )}
          {mode === 'pipeline' && (
            <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>
              ⚡ Запускает Yandex + Nemotron OCR → LLM параллельно (~30–60 сек)
            </span>
          )}
        </div>

        {error && <div style={{ padding: '10px 24px', color: '#b91c1c', fontSize: 13 }}>Ошибка: {error}</div>}

        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 14 }}>
            {mode === 'ocr' ? 'Параллельный запрос к Yandex Vision и Nemotron v2...' : 'Запуск полного пайплайна с обоими OCR и LLM анализом...'}
          </div>
        )}

        {/* OCR mode */}
        {mode === 'ocr' && ocrResult && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>
            <OcrCol name="Yandex Vision" color="#fc3c2e" data={ocrResult.yandex} />
            <OcrCol name="Nemotron v2" color="#76b900" data={ocrResult.nemotron} />
          </div>
        )}

        {/* Pipeline mode */}
        {mode === 'pipeline' && pipelineResult && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>
            <PipelineCol name="Yandex Vision" color="#fc3c2e" data={pipelineResult.yandex} />
            <PipelineCol name="Nemotron v2" color="#76b900" data={pipelineResult.nemotron} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── OCR-only column ───────────────────────────────────────────────────────────

function OcrCol({ name, color, data }: { name: string; color: string; data: OcrProviderResult }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #eee', overflow: 'hidden' }}>
      <div style={{ padding: '10px 18px', background: color + '12', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color }}>{name}</span>
        {!data.error && (
          <>
            <span style={{ fontSize: 12, color: '#555' }}>{data.line_count} строк</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: (data.avg_confidence ?? 0) > 0.8 ? '#16a34a' : '#b45309' }}>
              {((data.avg_confidence ?? 0) * 100).toFixed(1)}% confidence
            </span>
          </>
        )}
      </div>
      {data.error ? (
        <div style={{ padding: 16, color: '#b91c1c', fontSize: 13 }}>Ошибка: {data.error}</div>
      ) : (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9f9f9', position: 'sticky', top: 0 }}>
                <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '1px solid #eee' }}>Строка</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#555', borderBottom: '1px solid #eee', width: 50 }}>%</th>
              </tr>
            </thead>
            <tbody>
              {(data.lines ?? []).map((line, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '4px 12px', color: '#222', fontFamily: 'monospace' }}>{line.text}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', color: line.confidence > 0.8 ? '#16a34a' : line.confidence > 0.5 ? '#b45309' : '#b91c1c', fontWeight: 500 }}>
                    {(line.confidence * 100).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Full pipeline column ──────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  product_name: 'Наименование', gtin: 'GTIN', standard: 'Стандарт',
  composition: 'Состав', allergens: 'Аллергены',
  storage_temp_min: 'Темп. мин', storage_temp_max: 'Темп. макс',
  shelf_life: 'Срок годности', shelf_life_after_opening: 'СГ после вскрытия',
  manufacturer: 'Изготовитель', manufacturer_address: 'Адрес изготовителя',
  net_weight_display: 'Масса нетто', storage_conditions: 'Условия хранения',
  country_of_origin: 'Страна происхождения',
}

function PipelineCol({ name, color, data }: { name: string; color: string; data: { ok: boolean; result?: Record<string, unknown>; error?: string } }) {
  if (!data.ok) return (
    <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #eee', overflow: 'hidden' }}>
      <div style={{ padding: '10px 18px', background: color + '12', borderBottom: '1px solid #eee' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color }}>{name}</span>
      </div>
      <div style={{ padding: 16, color: '#b91c1c', fontSize: 13 }}>Ошибка: {data.error}</div>
    </div>
  )

  const r = data.result as Record<string, unknown>
  const fields = (r?.fields ?? {}) as Record<string, unknown>
  const violations = (r?.violations ?? []) as { severity: string; field: string; message: string }[]
  const nutrition = fields.nutrition as Record<string, unknown> | null
  const confidence = (r?.confidence as { overall?: number })?.overall ?? 0
  const ocrConf = (r?.ocr as { avg_confidence?: number })?.avg_confidence ?? 0

  const blocks = violations.filter(v => v.severity === 'block')
  const warns = violations.filter(v => v.severity === 'warning')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #eee', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 18px', background: color + '12', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color }}>{name}</span>
        <span style={{ fontSize: 12, color: '#555' }}>OCR: {(ocrConf * 100).toFixed(0)}%</span>
        <span style={{ fontSize: 12, color: '#555' }}>AI: {(confidence * 100).toFixed(0)}%</span>
        {blocks.length > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>🔴 {blocks.length}</span>}
        {warns.length > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>🟡 {warns.length}</span>}
      </div>
      <div style={{ overflowY: 'auto', flex: 1, padding: '0 0 12px' }}>
        {/* Fields */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <tbody>
            {Object.entries(FIELD_LABELS).map(([k, label]) => (
              <tr key={k} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '5px 12px', color: '#777', width: '35%', fontWeight: 500 }}>{label}</td>
                <td style={{ padding: '5px 12px', color: fields[k] ? '#222' : '#ccc' }}>
                  {fields[k] != null ? String(fields[k]) : '—'}
                </td>
              </tr>
            ))}
            {/* Nutrition */}
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '5px 12px', color: '#777', fontWeight: 500 }}>КБЖУ</td>
              <td style={{ padding: '5px 12px', color: nutrition ? '#222' : '#ccc' }}>
                {nutrition
                  ? `Б:${nutrition.protein ?? '?'} Ж:${nutrition.fat ?? '?'} У:${nutrition.carbs ?? '?'} Ккал:${nutrition.kcal ?? '?'}`
                  : '—'}
              </td>
            </tr>
          </tbody>
        </table>
        {/* Violations */}
        {violations.length > 0 && (
          <div style={{ margin: '8px 12px 0', fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: '#555', marginBottom: 4 }}>Нарушения:</div>
            {violations.map((v, i) => (
              <div key={i} style={{ padding: '4px 8px', marginBottom: 3, borderRadius: 6, background: v.severity === 'block' ? '#fee2e2' : '#fef3c7', color: v.severity === 'block' ? '#b91c1c' : '#92400e' }}>
                {v.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
