import type { AnalysisResult } from '../types/analysis'

interface Props {
  result: AnalysisResult
  activeField: string | null
  onFieldHover: (field: string | null) => void
}

interface Row {
  label: string
  value: string | null
  field: string
  lowConf?: boolean
}

export function FieldsPanel({ result, activeField, onFieldHover }: Props) {
  const f = result.fields
  const conf = result.confidence

  function isLow(fieldName: string) {
    return conf?.low_confidence_fields.includes(fieldName) ?? false
  }

  const rows: Row[] = f ? [
    { label: 'Наименование', value: f.product_name, field: 'product_name' },
    { label: 'GTIN / Штрихкод', value: f.gtin ? `${f.gtin} (${f.barcode_type ?? '—'})` : null, field: 'gtin' },
    { label: 'Стандарт / ТУ', value: f.standard, field: 'standard' },
    { label: 'Состав', value: f.composition, field: 'composition' },
    { label: 'Аллергены', value: f.allergens, field: 'allergens' },
    {
      label: 'КБЖУ (на 100г)',
      value: f.nutrition
        ? `Б: ${fmt(f.nutrition.protein)}  Ж: ${fmt(f.nutrition.fat)}  У: ${fmt(f.nutrition.carbs)}  Ккал: ${fmt(f.nutrition.kcal)}`
        : null,
      field: 'nutrition',
      lowConf: isLow('nutrition'),
    },
    {
      label: 'Темп. хранения',
      value: f.storage_temp_min !== null || f.storage_temp_max !== null
        ? `от ${fmt(f.storage_temp_min)}°C до ${fmt(f.storage_temp_max)}°C`
        : null,
      field: 'storage_temp_min',
    },
    { label: 'Условия хранения', value: f.storage_conditions, field: 'storage_conditions' },
    { label: 'Срок годности', value: f.shelf_life, field: 'shelf_life' },
    { label: 'СГ после вскрытия', value: f.shelf_life_after_opening, field: 'shelf_life_after_opening' },
    { label: 'Изготовитель', value: f.manufacturer, field: 'manufacturer' },
    { label: 'Адрес изготовителя', value: f.manufacturer_address, field: 'manufacturer_address' },
    { label: 'Адрес производства', value: f.production_address, field: 'production_address' },
    { label: 'Страна происхождения', value: f.country_of_origin, field: 'country_of_origin' },
    { label: 'Масса нетто', value: f.net_weight_display, field: 'net_weight_display' },
    { label: 'Вид упаковки', value: f.packaging_type, field: 'packaging_type' },
    { label: 'Инструкция приготовления', value: f.cooking_instructions, field: 'cooking_instructions' },
    {
      label: 'Знаки',
      value: f.signs
        ? [f.signs.eac && 'EAC', f.signs.recycling && 'Мебиус', f.signs.fork_glass && 'Бокал-вилка']
            .filter(Boolean).join(', ') || 'Не обнаружены'
        : null,
      field: 'signs',
    },
    {
      label: 'ЗОЖ / Заявления',
      value: f.zozh?.length ? f.zozh.join(', ') : null,
      field: 'zozh',
    },
  ] : []

  return (
    <div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
        {result.ocr.ocr_label || 'OCR'} уверенность: <strong>{pct(result.ocr.avg_confidence)}</strong>
        {result.confidence && (
          <> &nbsp;|&nbsp; AI уверенность: <strong>{pct(result.confidence.overall)}</strong></>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {rows.map(row => {
            const low = row.lowConf || isLow(row.field)
            const active = activeField === row.field
            return (
              <tr
                key={row.field}
                onMouseEnter={() => row.value && onFieldHover(row.value)}
                onMouseLeave={() => onFieldHover(null)}
                style={{
                  background: active ? '#fff3f3' : low ? '#fffbe6' : undefined,
                  cursor: row.value ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
              >
                <td style={{
                  padding: '6px 8px', color: '#666', fontWeight: 500,
                  borderBottom: '1px solid #f0f0f0', width: '40%', verticalAlign: 'top',
                }}>
                  {row.label}
                  {low && <span style={{ marginLeft: 6, color: '#e6a000', fontSize: 11 }}>⚠ &lt;80%</span>}
                </td>
                <td style={{
                  padding: '6px 8px', color: row.value ? '#222' : '#bbb',
                  borderBottom: '1px solid #f0f0f0', verticalAlign: 'top', wordBreak: 'break-word',
                }}>
                  {row.value ?? '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function fmt(v: number | null | undefined): string {
  return v !== null && v !== undefined ? String(v) : '?'
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`
}
