import { useState } from 'react'
import { useAnalysis } from './hooks/useAnalysis'
import { useSettings } from './hooks/useSettings'
import { useBboxHighlight } from './hooks/useBboxHighlight'
import { UploadZone } from './components/UploadZone'
import { ProgressOverlay } from './components/ProgressOverlay'
import { ImageViewer } from './components/ImageViewer'
import { FieldsPanel } from './components/FieldsPanel'
import { ViolationsBlock } from './components/ViolationsBlock'
import { SettingsPanel } from './components/SettingsPanel'
import { OcrCompareModal } from './components/OcrCompareModal'

export default function App() {
  const { state, run, reset } = useAnalysis()
  const { settings, update: updateSettings, reset: resetSettings } = useSettings()
  const { activeField, setActiveField } = useBboxHighlight()
  const [showSettings, setShowSettings] = useState(false)
  const [showCompare, setShowCompare] = useState(false)

  const { step, progress, stepLabel, result, imageUrl, error } = state
  const busy = step !== 'idle' && step !== 'done' && step !== 'error'

  const blockCount = result?.violations.filter(v => v.severity === 'block').length ?? 0
  const warnCount = result?.violations.filter(v => v.severity === 'warning').length ?? 0

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa', fontFamily: 'Inter, Arial, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: '#e63329', color: '#fff', padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>X5 Label Checker</span>
        {result?.category_detected && (
          <span style={{
            fontSize: 13, background: 'rgba(255,255,255,0.2)',
            borderRadius: 20, padding: '3px 12px',
          }}>
            {result.category_detected}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {result?.confidence && (
            <span style={{
              fontSize: 13, background: 'rgba(255,255,255,0.2)',
              borderRadius: 20, padding: '3px 12px',
            }}>
              AI: {Math.round(result.confidence.overall * 100)}%
            </span>
          )}
          {result && (
            <button
              onClick={reset}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
              }}
            >
              Новый анализ
            </button>
          )}
          <button
            onClick={() => setShowCompare(true)}
            disabled={busy}
            title="Сравнить OCR провайдеры"
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              borderRadius: 8, padding: '6px 12px', cursor: busy ? 'default' : 'pointer',
              fontSize: 13, fontWeight: 600, opacity: busy ? 0.5 : 1,
            }}
          >
            OCR сравнение
          </button>
          <button
            onClick={() => setShowSettings(true)}
            disabled={busy}
            title="Настройки проверки"
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              borderRadius: 8, padding: '6px 10px', cursor: busy ? 'default' : 'pointer',
              fontSize: 16, opacity: busy ? 0.5 : 1,
            }}
          >
            ⚙️
          </button>
        </div>
      </div>

      <ProgressOverlay step={step} progress={progress} stepLabel={stepLabel} />

      {showCompare && <OcrCompareModal onClose={() => setShowCompare(false)} />}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={patch => { updateSettings(patch) }}
          onReset={resetSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div style={{ padding: 24 }}>
        {step === 'idle' && (
          <div style={{ maxWidth: 600, margin: '60px auto' }}>
            <UploadZone onFile={file => run(file, settings)} disabled={busy} />
          </div>
        )}

        {error && (
          <div style={{
            maxWidth: 600, margin: '40px auto', padding: 20,
            background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 10, color: '#b91c1c',
          }}>
            <strong>Ошибка:</strong> {error}
            <br />
            <button onClick={reset} style={{ marginTop: 12, cursor: 'pointer' }}>Попробовать снова</button>
          </div>
        )}

        {result && imageUrl && (
          <>
            {/* Quality warning */}
            {result.photo_quality && !result.photo_quality.ok && (
              <div style={{
                background: '#fffbe6', border: '1px solid #fde68a', borderRadius: 8,
                padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#92400e',
              }}>
                Проблемы с качеством фото: {result.photo_quality.issues.join(', ')}
              </div>
            )}

            {/* Violation summary bar */}
            {(blockCount > 0 || warnCount > 0) && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                {blockCount > 0 && (
                  <div style={{
                    padding: '8px 16px', background: '#fee2e2', borderRadius: 8,
                    color: '#b91c1c', fontWeight: 700, fontSize: 13,
                  }}>
                    🔴 {blockCount} блокирующих нарушений
                  </div>
                )}
                {warnCount > 0 && (
                  <div style={{
                    padding: '8px 16px', background: '#fef3c7', borderRadius: 8,
                    color: '#92400e', fontWeight: 700, fontSize: 13,
                  }}>
                    🟡 {warnCount} предупреждений
                  </div>
                )}
              </div>
            )}

            {/* Split layout */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
              alignItems: 'start',
            }}>
              {/* Left: Image */}
              <div style={{
                background: '#fff', borderRadius: 12,
                padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#333' }}>
                  Фото этикетки
                </div>
                <ImageViewer
                  imageUrl={imageUrl}
                  imageWidth={result.image_width}
                  imageHeight={result.image_height}
                  lines={result.ocr.lines}
                  activeField={activeField}
                />
              </div>

              {/* Right: Fields + Violations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  background: '#fff', borderRadius: 12,
                  padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#333' }}>
                    Извлечённые поля
                  </div>
                  <FieldsPanel
                    result={result}
                    activeField={activeField}
                    onFieldHover={setActiveField}
                  />
                </div>

                <div style={{
                  background: '#fff', borderRadius: 12,
                  padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}>
                  <ViolationsBlock violations={result.violations} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .split { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
