import { useState, type ReactNode } from 'react'
import type { CheckSettings } from '../types/settings'
import { ALL_REGULATIONS, DEFAULT_SETTINGS } from '../types/settings'

interface Props {
  settings: CheckSettings
  onUpdate: (patch: Partial<CheckSettings>) => void
  onReset: () => void
  onClose: () => void
}

export function SettingsPanel({ settings, onUpdate, onReset, onClose }: Props) {
  const [draft, setDraft] = useState<CheckSettings>({ ...settings })

  function toggleRegulation(reg: string) {
    const list = draft.enabled_regulations
    const next = list.includes(reg) ? list.filter(r => r !== reg) : [...list, reg]
    setDraft(d => ({ ...d, enabled_regulations: next }))
  }

  function toggle(field: keyof CheckSettings) {
    setDraft(d => ({ ...d, [field]: !d[field] }))
  }

  function save() {
    onUpdate(draft)
    onClose()
  }

  function handleReset() {
    setDraft({ ...DEFAULT_SETTINGS })
    onReset()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: 520, maxWidth: '95vw',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #eee',
          position: 'sticky', top: 0, background: '#fff', borderRadius: '16px 16px 0 0',
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#333' }}>
            Настройки проверки
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
            color: '#888', lineHeight: 1, padding: '4px 8px',
          }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Regulations */}
          <Section title="Регламенты">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ALL_REGULATIONS.map(reg => (
                <label key={reg} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', borderRadius: 8,
                  border: `1px solid ${draft.enabled_regulations.includes(reg) ? '#e63329' : '#ddd'}`,
                  background: draft.enabled_regulations.includes(reg) ? '#fff5f5' : '#fafafa',
                  cursor: 'pointer', fontSize: 13, userSelect: 'none',
                }}>
                  <input
                    type="checkbox"
                    checked={draft.enabled_regulations.includes(reg)}
                    onChange={() => toggleRegulation(reg)}
                    style={{ accentColor: '#e63329' }}
                  />
                  {reg}
                </label>
              ))}
            </div>
          </Section>

          {/* Required fields */}
          <Section title="Обязательные поля">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <CheckRow label="Знак EAC" checked={draft.require_eac} onChange={() => toggle('require_eac')} />
              <CheckRow label="КБЖУ" checked={draft.require_nutrition} onChange={() => toggle('require_nutrition')} />
              <CheckRow label="Состав" checked={draft.require_composition} onChange={() => toggle('require_composition')} />
              <CheckRow label="Изготовитель + адрес" checked={draft.require_manufacturer} onChange={() => toggle('require_manufacturer')} />
              <CheckRow label="Срок годности" checked={draft.require_shelf_life} onChange={() => toggle('require_shelf_life')} />
              <CheckRow label="Температура хранения" checked={draft.require_storage_temp} onChange={() => toggle('require_storage_temp')} />
              <CheckRow label="GTIN / штрихкод" checked={draft.require_gtin} onChange={() => toggle('require_gtin')} />
            </div>
          </Section>

          {/* Special checks */}
          <Section title="Специальные проверки">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <CheckRow
                label='Предупреждение "хранить в местах, недоступных для детей" (бытовая химия)'
                checked={draft.check_children_warning}
                onChange={() => toggle('check_children_warning')}
              />
              <CheckRow
                label="Орфографические ошибки в составе"
                checked={draft.check_spelling}
                onChange={() => toggle('check_spelling')}
              />
            </div>
          </Section>

          {/* Extra instructions */}
          <Section title="Дополнительные инструкции">
            <textarea
              value={draft.extra_instructions}
              onChange={e => setDraft(d => ({ ...d, extra_instructions: e.target.value }))}
              placeholder="Например: проверить наличие логотипа X5, указание на ГМО..."
              style={{
                width: '100%', minHeight: 80, padding: '8px 12px',
                border: '1px solid #ddd', borderRadius: 8, fontSize: 13,
                fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </Section>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px', borderTop: '1px solid #eee',
          position: 'sticky', bottom: 0, background: '#fff',
          borderRadius: '0 0 16px 16px',
        }}>
          <button onClick={handleReset} style={{
            background: 'none', border: '1px solid #ddd', borderRadius: 8,
            padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#666',
          }}>
            Сбросить к умолчаниям
          </button>
          <button onClick={save} style={{
            background: '#e63329', border: 'none', borderRadius: 8,
            padding: '8px 20px', cursor: 'pointer', fontSize: 13,
            color: '#fff', fontWeight: 600,
          }}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase',
        letterSpacing: 0.5, marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function CheckRow({ label, checked, onChange }: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer',
      fontSize: 13, color: '#333', userSelect: 'none',
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ accentColor: '#e63329', marginTop: 2, flexShrink: 0 }}
      />
      {label}
    </label>
  )
}
