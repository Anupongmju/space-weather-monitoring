// frontend/src/components/studio/useStudioState.ts
import { useState, useEffect, useCallback } from 'react'
import {
  ChartId,
  StudioCardConfig,
  StudioPreset,
  BUILT_IN_PRESETS,
} from './studioTypes'
import { TimeRange } from '../ui/DateRangeToolbar'

const STORAGE_KEY = 'space_weather_custom_studio_state_v2'
const USER_PRESETS_KEY = 'space_weather_custom_studio_user_presets_v2'

function generateInstanceId(): string {
  return 'card_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36)
}

function getDefaultCards(presetId = 'solar-storm'): StudioCardConfig[] {
  const preset = BUILT_IN_PRESETS.find(p => p.id === presetId) || BUILT_IN_PRESETS[0]
  return preset.chartIds.map(chartId => ({
    instanceId: generateInstanceId(),
    chartId,
    timeRangeOverride: null,
    customRangeOverride: null,
  }))
}

export function useStudioState() {
  // Global Layout
  const [layout, setLayout] = useState<'1col' | '2col'>('2col')

  // Global Time Range
  const [globalTimeRange, setGlobalTimeRange] = useState<TimeRange>(4320) // default 3D
  const [globalCustomRange, setGlobalCustomRange] = useState<{ startDate: string; endDate: string } | null>(null)

  // Active cards
  const [cards, setCards] = useState<StudioCardConfig[]>(() => getDefaultCards('solar-storm'))

  // Presets
  const [activePresetId, setActivePresetId] = useState<string | null>('solar-storm')
  const [userPresets, setUserPresets] = useState<StudioPreset[]>([])

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const savedUserPresets = localStorage.getItem(USER_PRESETS_KEY)
      if (savedUserPresets) {
        setUserPresets(JSON.parse(savedUserPresets))
      }

      const savedState = localStorage.getItem(STORAGE_KEY)
      if (savedState) {
        const parsed = JSON.parse(savedState)
        if (Array.isArray(parsed.cards) && parsed.cards.length > 0) {
          setCards(parsed.cards)
        }
        if (parsed.layout === '1col' || parsed.layout === '2col') {
          setLayout(parsed.layout)
        }
        if (parsed.globalTimeRange) {
          setGlobalTimeRange(parsed.globalTimeRange)
        }
        if (parsed.globalCustomRange) {
          setGlobalCustomRange(parsed.globalCustomRange)
        }
        if (parsed.activePresetId !== undefined) {
          setActivePresetId(parsed.activePresetId)
        }
      }
    } catch (e) {
      console.warn('Failed to load studio state from localStorage', e)
    }
  }, [])

  // Auto-save state to localStorage on changes
  useEffect(() => {
    try {
      const stateToSave = {
        cards,
        layout,
        globalTimeRange,
        globalCustomRange,
        activePresetId,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
    } catch (e) {
      console.warn('Failed to save studio state to localStorage', e)
    }
  }, [cards, layout, globalTimeRange, globalCustomRange, activePresetId])

  // Save user presets to localStorage
  const persistUserPresets = useCallback((updated: StudioPreset[]) => {
    setUserPresets(updated)
    try {
      localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to save user presets to localStorage', e)
    }
  }, [])

  // Actions
  const addCard = useCallback((chartId: ChartId, station?: string) => {
    const newCard: StudioCardConfig = {
      instanceId: generateInstanceId(),
      chartId,
      station: station || (chartId === 'neutron-monitor' ? 'OULU' : undefined),
      timeRangeOverride: null,
      customRangeOverride: null,
    }
    setCards(prev => [...prev, newCard])
    setActivePresetId(null) // Custom configuration
  }, [])

  const setCardStation = useCallback((instanceId: string, station: string) => {
    setCards(prev => prev.map(c => c.instanceId === instanceId ? { ...c, station } : c))
  }, [])

  const removeCard = useCallback((instanceId: string) => {
    setCards(prev => prev.filter(c => c.instanceId !== instanceId))
    setActivePresetId(null)
  }, [])

  const removeCardByChartId = useCallback((chartId: ChartId) => {
    setCards(prev => {
      const idx = prev.map(c => c.chartId).lastIndexOf(chartId)
      if (idx !== -1) {
        const clone = [...prev]
        clone.splice(idx, 1)
        return clone
      }
      return prev
    })
    setActivePresetId(null)
  }, [])

  const toggleChart = useCallback((chartId: ChartId, station?: string) => {
    setCards(prev => {
      const exists = prev.some(c => c.chartId === chartId && (!station || c.station === station))
      if (exists) {
        return prev.filter(c => !(c.chartId === chartId && (!station || c.station === station)))
      } else {
        return [
          ...prev,
          {
            instanceId: generateInstanceId(),
            chartId,
            station: station || (chartId === 'neutron-monitor' ? 'OULU' : undefined),
            timeRangeOverride: null,
            customRangeOverride: null,
          },
        ]
      }
    })
    setActivePresetId(null)
  }, [])

  const clearAllCards = useCallback(() => {
    setCards([])
    setActivePresetId(null)
  }, [])

  const moveCard = useCallback((index: number, direction: 'up' | 'down') => {
    setCards(prev => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= prev.length) return prev
      const clone = [...prev]
      const [moved] = clone.splice(index, 1)
      clone.splice(targetIndex, 0, moved)
      return clone
    })
    setActivePresetId(null)
  }, [])

  const setCardTimeOverride = useCallback((instanceId: string, range: TimeRange | null) => {
    setCards(prev =>
      prev.map(c =>
        c.instanceId === instanceId
          ? { ...c, timeRangeOverride: range, customRangeOverride: null }
          : c
      )
    )
  }, [])

  const setCardCustomOverride = useCallback(
    (instanceId: string, customRange: { startDate: string; endDate: string } | null) => {
      setCards(prev =>
        prev.map(c =>
          c.instanceId === instanceId
            ? { ...c, customRangeOverride: customRange, timeRangeOverride: null }
            : c
        )
      )
    },
    []
  )

  const applyPreset = useCallback((presetId: string) => {
    const builtIn = BUILT_IN_PRESETS.find(p => p.id === presetId)
    const target = builtIn || userPresets.find(p => p.id === presetId)
    if (!target) return

    setCards(
      target.chartIds.map(chartId => ({
        instanceId: generateInstanceId(),
        chartId,
        timeRangeOverride: null,
        customRangeOverride: null,
      }))
    )
    setLayout(target.layout)
    setGlobalTimeRange(target.globalTimeRange)
    setGlobalCustomRange(null)
    setActivePresetId(target.id)
  }, [userPresets])

  const saveUserPreset = useCallback(
    (name: string, description: string = '') => {
      const newPreset: StudioPreset = {
        id: 'user_' + Date.now().toString(36),
        name,
        nameTh: name,
        description: description || 'Custom saved board configuration',
        descriptionTh: description || 'กระดานที่บันทึกไว้โดยผู้ใช้',
        isBuiltIn: false,
        layout,
        globalTimeRange,
        chartIds: cards.map(c => c.chartId),
      }
      const updated = [...userPresets, newPreset]
      persistUserPresets(updated)
      setActivePresetId(newPreset.id)
      return newPreset.id
    },
    [cards, layout, globalTimeRange, userPresets, persistUserPresets]
  )

  const deleteUserPreset = useCallback(
    (presetId: string) => {
      const updated = userPresets.filter(p => p.id !== presetId)
      persistUserPresets(updated)
      if (activePresetId === presetId) {
        setActivePresetId(null)
      }
    },
    [userPresets, activePresetId, persistUserPresets]
  )

  const resetToDefault = useCallback(() => {
    applyPreset('solar-storm')
  }, [applyPreset])

  return {
    cards,
    layout,
    globalTimeRange,
    globalCustomRange,
    activePresetId,
    userPresets,
    allPresets: [...BUILT_IN_PRESETS, ...userPresets],
    setLayout,
    setGlobalTimeRange,
    setGlobalCustomRange,
    addCard,
    removeCard,
    removeCardByChartId,
    toggleChart,
    clearAllCards,
    moveCard,
    setCardStation,
    setCardTimeOverride,
    setCardCustomOverride,
    applyPreset,
    saveUserPreset,
    deleteUserPreset,
    resetToDefault,
  }
}
