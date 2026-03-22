// hooks/useGenerateRoom.ts
// Stripped-down hook — state management only.
// Room generation is handled by the generate-room edge function.

import { useState, useRef } from 'react'
import type { FurnitureItem } from '@/components/RoomCanvas'

// ── Display size ──────────────────────────────────────────────────────────────

export function getDisplaySize(path: string): number {
  const p = path.toLowerCase()
  if (p.includes('bed')) return 2.0
  if (p.includes('sofa') || p.includes('couch')) return 1.8
  if (p.includes('table') || p.includes('desk')) return 1.5
  if (p.includes('chair')) return 1.0
  if (p.includes('lamp')) return 1.5
  if (p.includes('plant')) return 1.2
  if (p.includes('carpet') || p.includes('rug') || p.includes('mat')) return 2.0
  if (p.includes('shelf') || p.includes('cabinet')) return 1.4
  return 1.0
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GenerateRoomOptions {
  roomSize: number
  roomHeight: number
}

export interface TextureResult {
  floor: string | null
  wallpaper: string | null
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useGenerateRoom({ roomSize, roomHeight }: GenerateRoomOptions) {
  const [furnitures,     setFurnitures]     = useState<FurnitureItem[]>([])
  const [textures,       setTextures]       = useState<TextureResult>({ floor: null, wallpaper: null })
  const [isGenerating,   setIsGenerating]   = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('')

  return {
    furnitures,
    setFurnitures,
    textures,
    setTextures,
    isGenerating,
    loadingMessage,
    error,
    // generate is no longer used — room generation goes through the edge function.
    // Kept as a no-op for any legacy standalone references.
    generate: async (_description: string) => {
      console.warn('[useGenerateRoom] Local generation removed. Use the generate-room edge function instead.')
    },
  }
}
