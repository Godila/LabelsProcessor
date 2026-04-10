import { useState, useRef } from 'react'
import type { OcrCompareResult, OcrProviderResult } from '../api/client'
import { compareOcr } from '../api/client'

interface Props {
  onClose: () => void
}

export function OcrCompareModal({ onClose }: Props) {
  const [result, setResult] = useState<OcrCompareResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    setFile(f)
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await compareOcr(f)
      setResult(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: 900, maxWidth: '97vw',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid #eee',
        }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Сравнение OCR: Yandex Vision vs Nemotron v2</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888',
          }}>×</button>
        </div>

        {/* Upload */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #eee' }}>
          <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            style={{
              background: '#e63329', color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 20px', cursor: loading ? 'default' : 'pointer',
              fontWeight: 600, fontSize: 13, opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '⏳ Распознаю...' : file ? '📂 Загрузить другой файл' : '📂 Выбрать этикетку'}
          </button>
          {file && !loading && <span style={{ marginLeft: 12, fontSize: 13, color: '#666' }}>{file.name}</span>}
        </div>

        {error && (
          <div style={{ padding: '12px 24px', color: '#b91c1c', fontSize: 13 }}>
            Ошибка: {error}
          </div>
        )}

        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 14 }}>
            Параллельный запрос к Yandex Vision и Nemotron v2...
          </div>
        )}

        {result && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>
            <ProviderCol name="Yandex Vision" color="#fc3c2e" data={result.yandex} />
            <ProviderCol name="Nemotron v2" color="#76b900" data={result.nemotron} />
          </div>
        )}
      </div>
    </div>
  )
}

function ProviderCol({ name, color, data }: { name: string; color: string; data: OcrProviderResult }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #eee', overflow: 'hidden' }}>
      {/* Col header */}
      <div style={{
        padding: '10px 18px', background: color + '12',
        borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color }}>{name}</span>
        {!data.error && (
          <>
            <span style={{ fontSize: 12, color: '#555' }}>
              {data.line_count} строк
            </span>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: (data.avg_confidence ?? 0) > 0.8 ? '#16a34a' : '#b45309',
            }}>
              confidence {((data.avg_confidence ?? 0) * 100).toFixed(1)}%
            </span>
          </>
        )}
      </div>

      {data.error ? (
        <div style={{ padding: 16, color: '#b91c1c', fontSize: 13 }}>Ошибка: {data.error}</div>
      ) : (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Lines table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9f9f9', position: 'sticky', top: 0 }}>
                <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '1px solid #eee' }}>Строка</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#555', borderBottom: '1px solid #eee', width: 60 }}>%</th>
              </tr>
            </thead>
            <tbody>
              {(data.lines ?? []).map((line, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '4px 12px', color: '#222', fontFamily: 'monospace' }}>{line.text}</td>
                  <td style={{
                    padding: '4px 8px', textAlign: 'right',
                    color: line.confidence > 0.8 ? '#16a34a' : line.confidence > 0.5 ? '#b45309' : '#b91c1c',
                    fontWeight: 500,
                  }}>
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
