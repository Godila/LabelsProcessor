import type { AnalysisStep } from '../hooks/useAnalysis'

interface Props {
  step: AnalysisStep
  progress: number
  stepLabel: string
}

interface StepDef {
  key: AnalysisStep
  label: string
  icon: string
}

const STEPS: StepDef[] = [
  { key: 'file_prepare',   label: 'Подготовка файла',        icon: '📄' },
  { key: 'yandex_ocr',     label: 'OCR',                      icon: '🔍' },
  { key: 'gemini_analyze', label: 'AI — анализ регламентов', icon: '🤖' },
  { key: 'merge',          label: 'Формирование результата', icon: '✅' },
]

const ORDER: AnalysisStep[] = ['file_prepare', 'yandex_ocr', 'gemini_analyze', 'merge', 'done']

export function ProgressOverlay({ step, progress, stepLabel }: Props) {
  if (step === 'idle' || step === 'done' || step === 'error') return null

  const currentIdx = ORDER.indexOf(step)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.50)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '32px 48px',
        minWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#333' }}>
          Анализ этикетки...
        </div>

        {/* Overall progress bar */}
        <div style={{
          height: 6, background: '#eee', borderRadius: 4, marginBottom: 24, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', background: '#e63329', borderRadius: 4,
            width: `${progress}%`, transition: 'width 0.4s ease',
          }} />
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
                width: 32, height: 32, borderRadius: '50%',
                background: done ? '#28a745' : active ? '#e63329' : '#ddd',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: '#fff', flexShrink: 0,
                transition: 'background 0.3s',
              }}>
                {done ? '✓' : active ? <Spinner /> : s.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: '#333', fontWeight: active ? 600 : 400 }}>
                  {active && stepLabel ? stepLabel : s.label}
                </div>
              </div>
              {done && (
                <div style={{ fontSize: 12, color: '#28a745', fontWeight: 600 }}>Готово</div>
              )}
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
