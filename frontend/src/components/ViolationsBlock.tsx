import type { Violation } from '../types/analysis'

interface Props {
  violations: Violation[]
}

export function ViolationsBlock({ violations }: Props) {
  if (violations.length === 0) {
    return (
      <div style={{
        padding: '12px 16px', background: '#f0fff4', borderRadius: 8,
        border: '1px solid #b7ebc9', color: '#276749', fontSize: 13,
      }}>
        Нарушений не обнаружено
      </div>
    )
  }

  const blocks = violations.filter(v => v.severity === 'block')
  const warnings = violations.filter(v => v.severity === 'warning')

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#333' }}>
        Нарушения ({violations.length})
      </div>
      {blocks.map((v, i) => <ViolationCard key={`b${i}`} v={v} />)}
      {warnings.map((v, i) => <ViolationCard key={`w${i}`} v={v} />)}
    </div>
  )
}

function ViolationCard({ v }: { v: Violation }) {
  const isBlock = v.severity === 'block'
  return (
    <div style={{
      marginBottom: 8, padding: '10px 14px', borderRadius: 8,
      background: isBlock ? '#fff5f5' : '#fffbe6',
      border: `1px solid ${isBlock ? '#fca5a5' : '#fde68a'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>{isBlock ? '🔴' : '🟡'}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
          background: isBlock ? '#fee2e2' : '#fef3c7',
          color: isBlock ? '#b91c1c' : '#92400e',
        }}>
          {v.rule}
        </span>
        <span style={{ fontSize: 12, color: '#888' }}>{v.field}</span>
      </div>
      <div style={{ fontSize: 13, color: '#333' }}>{v.message}</div>
    </div>
  )
}
