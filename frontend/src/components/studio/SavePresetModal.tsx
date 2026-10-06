// frontend/src/components/studio/SavePresetModal.tsx
import React, { useState } from 'react'
import { X, Bookmark, Check } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export interface SavePresetModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, description: string) => void
  activeCardCount: number
}

export default function SavePresetModal({
  isOpen,
  onClose,
  onSave,
  activeCardCount,
}: SavePresetModalProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please provide a name for this custom board preset')
      return
    }
    onSave(name.trim(), description.trim())
    setName('')
    setDescription('')
    setError('')
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: isLight ? '#FFFFFF' : '#0B132B',
          border: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: 14,
          padding: 24,
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bookmark size={20} color="var(--primary, #38BDF8)" />
            <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--font-mono)' }}>
              Save Board Preset
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isLight ? '#64748B' : '#94A3B8',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: isLight ? '#64748B' : '#94A3B8' }}>
          Save your current selection of <strong>{activeCardCount} graphs</strong> and layout settings so you can switch back to it anytime.
        </p>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
                fontFamily: 'var(--font-mono)',
              }}
            >
              Preset Name *
            </label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. CME Solar Particle Tracking"
              value={name}
              onChange={e => {
                setName(e.target.value)
                setError('')
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: error
                  ? '1px solid #EF4444'
                  : isLight
                  ? '1px solid rgba(0,0,0,0.15)'
                  : '1px solid rgba(255,255,255,0.15)',
                background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.05)',
                color: isLight ? '#0F172A' : '#FFF',
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {error && <span style={{ color: '#EF4444', fontSize: 11, marginTop: 4, display: 'block' }}>{error}</span>}
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
                fontFamily: 'var(--font-mono)',
              }}
            >
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Focus on GOES Proton and CRaTER Lunar correlation"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: isLight ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.15)',
                background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.05)',
                color: isLight ? '#0F172A' : '#FFF',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 16px',
                borderRadius: 6,
                background: 'transparent',
                border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255,255,255,0.15)',
                color: isLight ? '#475569' : '#CBD5E1',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 18px',
                borderRadius: 6,
                background: 'var(--primary, #0284C7)',
                color: '#FFF',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <Check size={14} />
              <span>Save Preset</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
