import type { AnalysisStep } from '../hooks/useAnalysis'

interface Props {
  step: AnalysisStep
}

const STEPS: { key: AnalysisStep; label: string }[] = [
  { key: 'uploading', label: 'Загрузка файла' },
  { key: 'ocr', label: 'OCR — распознавание текста' },
  { key: 'ai', label: 'AI — анализ и проверка' },
  { key: 'done', label: 'Готово' },
]

const ORDER: AnalysisStep[] = ['uploading', 'ocr', 'ai', 'done']

export function ProgressOverlay({ step }: Props) {
  if (step === 'idle') return null

  const currentIdx = ORDER.indexOf(step)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '32px 48px',
        minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: '#333' }}>
          Анализ этикетки...
        </div>
        {STEPS.map((s, i) => {
          const done = currentIdx > i
          const active = currentIdx === i
          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 14, opacity: done || active ? 1 : 0.35,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: done ? '#28a745' : active ? '#e63329' : '#ddd',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: '#fff', flexShrink: 0,
                transition: 'background 0.3s',
              }}>
                {done ? '✓' : active ? <Spinner /> : i + 1}
              </div>
              <span style={{ fontSize: 14, color: '#333' }}>{s.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 14, height: 14,
      border: '2px solid rgba(255,255,255,0.4)',
      borderTopColor: '#fff', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}
