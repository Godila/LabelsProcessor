import React, { useRef, useState } from 'react'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
}

const ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf'
const MAX_MB = 20

export function UploadZone({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFile(file: File) {
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`Файл слишком большой (макс. ${MAX_MB} МБ)`)
      return
    }
    onFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      style={{
        border: `2px dashed ${dragOver ? '#e63329' : '#ccc'}`,
        borderRadius: 12,
        padding: 40,
        textAlign: 'center',
        cursor: disabled ? 'default' : 'pointer',
        background: dragOver ? '#fff5f5' : '#fafafa',
        transition: 'all 0.2s',
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>
        Перетащите фото этикетки или нажмите для выбора
      </div>
      <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
        JPG, PNG, WebP, PDF — до {MAX_MB} МБ
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={onChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
