import { useState, useCallback } from 'react'
import type { FurnitureItem } from '@/components/RoomCanvas'

export function getDisplaySize(path: string): number {
  const p = path.toLowerCase()
  if (p.includes('bed'))                                               return 2.0
  if (p.includes('table'))                                             return 1.5
  if (p.includes('chair'))                                             return 1.0
  if (p.includes('lamp'))                                              return 1.5
  if (p.includes('plant'))                                             return 1.2
  if (p.includes('carpet') || p.includes('rug') || p.includes('mat')) return 2.0
  return 1.0
}

function clampToRoom(
  x: number,
  z: number,
  halfW: number,
  padding = 0.15
): { x: number; z: number } {
  return {
    x: Math.max(-halfW + padding, Math.min(halfW - padding, x)),
    z: Math.max(-halfW + padding, Math.min(halfW - padding, z)),
  }
}

export interface GenerateRoomOptions {
  roomSize: number
  roomHeight: number
}

export function useGenerateRoom({ roomSize, roomHeight }: GenerateRoomOptions) {
  const [furnitures, setFurnitures]         = useState<FurnitureItem[]>([])
  const [isGenerating, setIsGenerating]     = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('')

  const halfW  = roomSize / 2
  const floorY = -(roomHeight / 2)

  const generate = useCallback(async (_description: string) => {
    setIsGenerating(true)
    setError(null)
    setLoadingMessage('Picking furniture...')

    try {
      const res  = await fetch('/furnitures/furniture-list.json')
      const data = await res.json()
      const allItems: any[] = data.furnitures.filter(
        (i: any) => i.path && i.name
      )

      const picked = [...allItems]
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)

      const positions: [number, number, number][] = [
        [0,               floorY, -halfW + 0.8],
        [-halfW + 0.8,    floorY, 0],
        [halfW - 0.8,     floorY, 0],
        [0,               floorY, 0],
        [halfW - 0.8,     floorY, -halfW + 0.8],
      ]

      const items: FurnitureItem[] = picked.map((item: any, i: number) => {
        const [px, py, pz] = positions[i]
        const safe = clampToRoom(px, pz, halfW)

        return {
          id:          item.name,
          path:        item.path,
          position:    [safe.x, py, safe.z] as [number, number, number],
          rotation:    [0, 0, 0] as [number, number, number],
          displaySize: getDisplaySize(item.path),
        }
      })

      setFurnitures(items)
    } catch (err: any) {
      setError('Failed to load furniture. Please try again.')
      console.error(err)
    } finally {
      setIsGenerating(false)
      setLoadingMessage('')
    }
  }, [halfW, floorY])

  return {
    furnitures,
    setFurnitures,
    isGenerating,
    loadingMessage,
    error,
    generate,
  }
}
