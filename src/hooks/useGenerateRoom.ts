// hooks/useGenerateRoom.ts

import { useState, useCallback, useEffect, useRef } from 'react'
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

interface EmbeddedItem {
  name: string
  path: string
  price: number
  currency: string
  description: string
  embedding?: number[]
  keyword?: number[]
}

// ── Category detection ────────────────────────────────────────────────────────

type Category =
  | 'bed' | 'sofa' | 'table' | 'chair'
  | 'lamp' | 'plant' | 'carpet' | 'shelf' | 'other'

function detectCategory(path: string): Category {
  const p = path.toLowerCase()
  if (p.includes('bed')) return 'bed'
  if (p.includes('sofa') || p.includes('couch')) return 'sofa'
  if (p.includes('table') || p.includes('desk')) return 'table'
  if (p.includes('chair')) return 'chair'
  if (p.includes('lamp')) return 'lamp'
  if (p.includes('plant')) return 'plant'
  if (p.includes('carpet') || p.includes('rug') || p.includes('mat')) return 'carpet'
  if (p.includes('shelf') || p.includes('cabinet')) return 'shelf'
  return 'other'
}

// ── Random helpers ────────────────────────────────────────────────────────────

/** Returns a random integer between min and max (inclusive) */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ── Randomised category limits ────────────────────────────────────────────────
// Called once per generate() so every room has a different feel.
// Tweak the ranges and probabilities to taste.

function rollCategoryLimits(): Record<Category, number> {
  return {
    // 25% chance of no bed — studio / living room vibes
    bed: Math.random() < 0.75 ? 1 : 0,

    // 40% chance of no sofa — keeps bedrooms minimal
    sofa: Math.random() < 0.6 ? 1 : 0,

    // 1–3 tables — dining table, side tables, desk
    table: randInt(1, 3),

    // 1–4 chairs — sometimes a single accent chair, sometimes a full set
    chair: randInt(1, 4),

    // 0–3 lamps — moody low-light or bright & practical
    lamp: randInt(0, 3),

    // 0–5 plants — sparse to jungle
    plant: randInt(0, 5),

    // 50/50 whether there's a rug
    carpet: Math.random() < 0.5 ? 1 : 0,

    // 0–3 shelves
    shelf: randInt(0, 3),

    // 1–4 miscellaneous accent items
    other: randInt(1, 4),
  }
}

// ── Cosine similarity ─────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0

  const len = Math.min(a.length, b.length)

  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  return magnitude === 0 ? 0 : dot / magnitude
}

// ── Position slots per category ───────────────────────────────────────────────

interface Slot { x: number; z: number; rotation: number }

function getCandidateSlots(category: Category, halfW: number): Slot[] {
  // Flat padding to fit larger rooms tighter without clipping
  const pad = 0.4
  const inner = halfW - pad
  const corner = halfW - pad * 0.5

  switch (category) {
    case 'bed':
      return [
        { x: 0, z: -inner, rotation: 0 },
        { x: -inner * 0.5, z: -inner, rotation: 0 },
        { x: inner * 0.5, z: -inner, rotation: 0 },
      ]
    case 'sofa':
      return [
        { x: 0, z: -inner * 0.4, rotation: 0 },
        { x: 0, z: inner * 0.3, rotation: 180 },
        { x: -inner, z: 0, rotation: 90 },
        { x: inner, z: 0, rotation: -90 },
      ]
    case 'table':
      return [
        { x: 0, z: 0, rotation: 0 },
        { x: 0, z: inner * 0.4, rotation: 0 },
        { x: 0, z: -inner * 0.3, rotation: 0 },
        { x: -inner * 0.4, z: 0, rotation: 0 },
        { x: inner * 0.4, z: 0, rotation: 0 },
      ]
    case 'chair':
      return [
        { x: -inner * 0.4, z: inner * 0.3, rotation: 0 },
        { x: inner * 0.4, z: inner * 0.3, rotation: 0 },
        { x: -inner * 0.4, z: -inner * 0.3, rotation: 180 },
        { x: inner * 0.4, z: -inner * 0.3, rotation: 180 },
        { x: -inner, z: inner * 0.4, rotation: 90 },
        { x: inner, z: inner * 0.4, rotation: -90 },
        { x: -inner * 0.6, z: 0, rotation: 90 },
        { x: inner * 0.6, z: 0, rotation: -90 },
      ]
    case 'lamp':
      return [
        { x: -corner, z: -corner, rotation: 45 },
        { x: corner, z: -corner, rotation: -45 },
        { x: -inner * 0.6, z: -inner, rotation: 0 },
        { x: inner * 0.6, z: -inner, rotation: 0 },
        { x: -corner, z: corner * 0.5, rotation: 135 },
        { x: corner, z: corner * 0.5, rotation: -135 },
      ]
    case 'plant':
      return [
        { x: -corner, z: -corner, rotation: 0 },
        { x: corner, z: -corner, rotation: 0 },
        { x: -corner, z: corner * 0.6, rotation: 0 },
        { x: corner, z: corner * 0.6, rotation: 0 },
        { x: -inner, z: -inner * 0.5, rotation: 0 },
        { x: inner, z: -inner * 0.5, rotation: 0 },
        { x: -inner, z: inner * 0.3, rotation: 0 },
        { x: inner, z: inner * 0.3, rotation: 0 },
      ]
    case 'carpet':
      return [
        { x: 0, z: 0, rotation: 0 },
        { x: 0, z: inner * 0.2, rotation: 0 },
      ]
    case 'shelf':
      return [
        { x: -inner, z: -inner * 0.4, rotation: 90 },
        { x: inner, z: -inner * 0.4, rotation: -90 },
        { x: -inner, z: inner * 0.2, rotation: 90 },
        { x: inner, z: inner * 0.2, rotation: -90 },
        { x: 0, z: -inner, rotation: 0 },
      ]
    default:
      return [
        { x: inner * 0.3, z: inner * 0.3, rotation: 0 },
        { x: -inner * 0.3, z: inner * 0.3, rotation: 0 },
        { x: inner * 0.3, z: -inner * 0.2, rotation: 0 },
        { x: -inner * 0.3, z: -inner * 0.2, rotation: 0 },
      ]
  }
}

// ── Collision detection ───────────────────────────────────────────────────────

function hasCollision(
  x: number,
  z: number,
  placed: { x: number; z: number }[],
  minGap = 0.9
): boolean {
  return placed.some((p) => {
    const dx = x - p.x
    const dz = z - p.z
    return Math.sqrt(dx * dx + dz * dz) < minGap
  })
}

// ── Wall boundary clamp ───────────────────────────────────────────────────────

function clampToRoom(
  x: number,
  z: number,
  halfW: number,
  padding: number
): { x: number; z: number } {
  return {
    x: Math.max(-halfW + padding, Math.min(halfW - padding, x)),
    z: Math.max(-halfW + padding, Math.min(halfW - padding, z)),
  }
}

// ── Position assignment ───────────────────────────────────────────────────────
// Now accepts rolled limits so quantities vary per generate() call

function assignPositions(
  items: EmbeddedItem[],
  halfW: number,
  categoryLimits: Record<Category, number>
): (EmbeddedItem & { x: number; z: number; rotation: number })[] {
  const placed: { x: number; z: number }[] = []
  const categoryCount: Partial<Record<Category, number>> = {}
  const usedSlotKeys = new Set<string>()
  const result: (EmbeddedItem & { x: number; z: number; rotation: number })[] = []

  for (const item of items) {
    const category = detectCategory(item.path)
    const currentCount = categoryCount[category] ?? 0
    const limit = categoryLimits[category]   // ← rolled limit, not static

    if (currentCount >= limit) continue

    const itemSize = getDisplaySize(item.path)
    const dynamicPadding = (itemSize / 2) + 0.15 // Offset by half the item's longest side

    const candidates = getCandidateSlots(category, halfW)
    let chosen: Slot | null = null

    for (const candidate of candidates) {
      const clamped = clampToRoom(candidate.x, candidate.z, halfW, dynamicPadding)
      const key = `${clamped.x.toFixed(2)},${clamped.z.toFixed(2)}`

      if (!usedSlotKeys.has(key) && !hasCollision(clamped.x, clamped.z, placed, Math.max(0.8, dynamicPadding))) {
        chosen = { ...candidate, ...clamped }
        usedSlotKeys.add(key)
        break
      }
    }

    if (!chosen) {
      const step = 0.6
      outer:
      for (let z = -(halfW - dynamicPadding); z <= halfW - dynamicPadding; z += step) {
        for (let x = -(halfW - dynamicPadding); x <= halfW - dynamicPadding; x += step) {
          if (!hasCollision(x, z, placed, Math.max(0.8, dynamicPadding))) {
            chosen = { x, z, rotation: 0 }
            break outer
          }
        }
      }
    }

    if (!chosen) continue

    placed.push({ x: chosen.x, z: chosen.z })
    categoryCount[category] = currentCount + 1

    result.push({
      ...item,
      x: chosen.x,
      z: chosen.z,
      rotation: chosen.rotation,
    })
  }

  return result
}

// ── Query encoder singleton ───────────────────────────────────────────────────

let encoderInstance: any = null

async function getEncoder() {
  if (!encoderInstance) {
    const { pipeline } = await import('@xenova/transformers')
    encoderInstance = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { quantized: true }
    )
  }
  return encoderInstance
}

async function encodeQuery(text: string): Promise<number[]> {
  const encoder = await getEncoder()
  const output = await encoder(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data as Float32Array)
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useGenerateRoom({ roomSize, roomHeight }: GenerateRoomOptions) {
  const [furnitures, setFurnitures] = useState<FurnitureItem[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('')

  const halfW = roomSize / 2
  const catalogueRef = useRef<EmbeddedItem[]>([])

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/furnitures/furniture-list.json')
        const data = await res.json()
        catalogueRef.current = data.furnitures ?? []
        getEncoder().catch(() => { })
      } catch (err) {
        console.warn('[useGenerateRoom] init failed:', err)
      }
    }
    init()
  }, [])

  const generate = useCallback(async (description: string) => {
    setIsGenerating(true)
    setError(null)

    try {
      // ── Step 1: Load catalogue ────────────────────────────────────────────
      if (catalogueRef.current.length === 0) {
        setLoadingMessage('Loading furniture catalogue...')
        const res = await fetch('/furnitures/furniture-list.json')
        const data = await res.json()
        catalogueRef.current = data.furnitures ?? []
      }

      // ── Step 2: Roll category limits for this generation ──────────────────
      // Every call gets different quantities — no two rooms are identical
      const categoryLimits = rollCategoryLimits()

      // ── Step 3: Encode query ──────────────────────────────────────────────
      setLoadingMessage('Understanding your room...')
      const queryVector = await encodeQuery(description.trim())

      // ── Step 4: Score items by similarity ────────────────────────────────
      setLoadingMessage('Finding matching furniture...')

      const scored = catalogueRef.current.map((item) => {
        const vec = item.embedding || item.keyword || []
        return {
          item,
          score: vec.length > 0 ? cosineSimilarity(queryVector, vec) : -1,
        }
      })

      scored.sort((a, b) => b.score - a.score)

      // ── Step 5: Pick top matches using rolled limits ──────────────────────
      const catCount: Partial<Record<Category, number>> = {}
      const picked: EmbeddedItem[] = []

      for (const { item, score } of scored) {
        const cat = detectCategory(item.path)
        const count = catCount[cat] ?? 0

        // 🌟 Responsive Limits: If an item is a strongly matched theme (score > 0.45),
        // we dynamically boost its category limit, letting it override the random bounds!
        const isStrongMatch = score > 0.45
        if (isStrongMatch && count >= categoryLimits[cat]) {
          categoryLimits[cat] += 1
        }

        if (count < categoryLimits[cat]) {
          picked.push(item)
          catCount[cat] = count + 1
        }

        // Inflate max items if we're accommodating strong theme matches
        const maxItems = 8 + (categoryLimits.plant ?? 0) + (categoryLimits.chair ?? 0) + (categoryLimits.other ?? 0)
        if (picked.length >= Math.min(maxItems, 18)) break
      }

      // ── Step 6: Assign positions with rolled limits ───────────────────────
      setLoadingMessage('Arranging your room...')
      const positioned = assignPositions(picked, halfW, categoryLimits)

      // ── Step 7: Convert to FurnitureItem[] ───────────────────────────────
      const items: FurnitureItem[] = positioned.map((item) => ({
        id: `${item.name}-${Math.random().toString(36).slice(2, 7)}`,
        name: item.name.replace(/_/g, ' '),
        description: item.description,
        price: item.price,
        currency: item.currency,
        path: item.path,
        position: [item.x, 0, item.z] as [number, number, number],
        rotation: [0, (item.rotation * Math.PI) / 180, 0] as [number, number, number],
        displaySize: getDisplaySize(item.path),
      }))

      setFurnitures(items)

    } catch (err: any) {
      console.error('[useGenerateRoom]', err)
      setError('Failed to generate room. Please try again.')
    } finally {
      setIsGenerating(false)
      setLoadingMessage('')
    }
  }, [halfW])

  return {
    furnitures,
    setFurnitures,
    isGenerating,
    loadingMessage,
    error,
    generate,
  }
}