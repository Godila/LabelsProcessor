import type { OCRLine } from '../types/analysis'

interface Props {
  imageUrl: string
  imageWidth: number
  imageHeight: number
  lines: OCRLine[]
  activeField: string | null
}

export function ImageViewer({ imageUrl, imageWidth, imageHeight, lines, activeField }: Props) {
  // Highlight lines whose text overlaps with the active field value (simple keyword match)
  const highlightedLines = activeField
    ? lines.filter(l => l.text.toLowerCase().includes(activeField.toLowerCase().slice(0, 8)))
    : []

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <img
        src={imageUrl}
        alt="Этикетка"
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
      />
      <svg
        viewBox={`0 0 ${imageWidth} ${imageHeight}`}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
        }}
      >
        {lines.map((line, i) => {
          if (line.bbox.length < 2) return null
          const xs = line.bbox.map(v => v.x)
          const ys = line.bbox.map(v => v.y)
          const x = Math.min(...xs)
          const y = Math.min(...ys)
          const w = Math.max(...xs) - x
          const h = Math.max(...ys) - y
          const highlighted = highlightedLines.includes(line)
          const lowConf = line.confidence < 0.8

          if (!highlighted && !lowConf) return null

          return (
            <rect
              key={i}
              x={x} y={y} width={w} height={h}
              fill={highlighted ? 'rgba(230,51,41,0.25)' : 'rgba(255,193,7,0.2)'}
              stroke={highlighted ? '#e63329' : '#ffc107'}
              strokeWidth={highlighted ? 3 : 1.5}
              rx={3}
            />
          )
        })}
      </svg>
    </div>
  )
}
