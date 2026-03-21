import { useState, useRef, useEffect, Suspense, Component, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGenerateRoom, getDisplaySize } from '@/hooks/useGenerateRoom';

// Error boundary to catch WebGL context failures gracefully
class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

import type { PlacedItem, FurnitureDetail } from '@/lib/edgeFunctions';

interface RoomCanvasProps {
  className?: string;
  /** When provided, renders in "viewer" mode — no prompt input */
  items?: PlacedItem[];
  /** Furniture details for viewer mode */
  furniture?: FurnitureDetail[];
}

export interface FurnitureItem {
  id: string;
  position: [number, number, number];
  color?: string;
  path?: string;
  rotation?: [number, number, number];
  displaySize?: number;
  size?: [number, number, number];
}

// ── Model: normalize to displaySize, snap to floor ───────────────────────────
function Model({ path, displaySize = 1 }: { path: string; displaySize?: number }) {
  const { scene } = useGLTF(`/furnitures/${path}`);
  const cloned = scene.clone();

  const box = new THREE.Box3().setFromObject(cloned);
  const size = box.getSize(new THREE.Vector3());
  const longestSide = Math.max(size.x, size.y, size.z);
  const scale = longestSide > 0 ? displaySize / longestSide : 1;

  cloned.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(cloned);
  cloned.position.y -= scaledBox.min.y;

  return <primitive object={cloned} />;
}

// ── MovableFurniture ──────────────────────────────────────────────────────────
function MovableFurniture({
  furniture,
  isSelected,
  onSelect,
  onPositionChange,
}: {
  furniture: FurnitureItem;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (pos: [number, number, number]) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <>
      <group
        ref={groupRef}
        position={furniture.position}
        rotation={furniture.rotation}
        onClick={(e) => { e.stopPropagation(); }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {furniture.path && furniture.path !== 'PENDING_UPLOAD' ? (
          <Suspense fallback={
            <mesh>
              <boxGeometry args={furniture.size ?? [1, 1, 1]} />
              <meshStandardMaterial color="gray" wireframe />
            </mesh>
          }>
            <Model path={furniture.path} displaySize={furniture.displaySize} />
          </Suspense>
        ) : (
          <mesh castShadow receiveShadow>
            <boxGeometry args={furniture.size ?? [1, 1, 1]} />
            <meshStandardMaterial
              color={furniture.color || 'white'}
              emissive={isSelected ? '#333333' : '#000000'}
            />
          </mesh>
        )}
      </group>

      {isSelected && (
        <TransformControls
          object={groupRef}
          mode="translate"
          onMouseUp={() => {
            if (groupRef.current) {
              onPositionChange(
                groupRef.current.position.toArray() as [number, number, number]
              );
            }
          }}
        />
      )}
    </>
  );
}

// ── RoomCanvas ────────────────────────────────────────────────────────────────
export default function RoomCanvas({ className = '', items, furniture }: RoomCanvasProps) {
  const isViewerMode = !!(items && furniture);
  const roomSize = 7;
  const roomHeight = 3.5;
  const halfW = roomSize / 2;
  const halfH = roomHeight / 2;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wallTexture, setWallTexture] = useState<THREE.Texture | null>(null);
  const [description, setDescription] = useState('');

  const {
    furnitures: generatedFurnitures,
    setFurnitures,
    isGenerating,
    loadingMessage,
    error,
    generate,
  } = useGenerateRoom({ roomSize, roomHeight });

  // In viewer mode, convert PlacedItem[] + FurnitureDetail[] → FurnitureItem[]
  const viewerFurnitures: FurnitureItem[] = isViewerMode
    ? items.map((item) => {
        const detail = furniture.find((f) => f.id === item.id);
        const width = Math.max(detail?.real_width ?? 0.8, 0.4);
        const height = Math.max(detail?.real_height ?? 0.8, 0.2);
        const depth = Math.max(detail?.real_depth ?? 0.8, 0.4);

        return {
          id: `${item.id}_${item.x}_${item.z}`,
          position: [item.x, 0, item.z] as [number, number, number],
          rotation: [0, (item.rotation * Math.PI) / 180, 0] as [number, number, number],
          path: detail?.file_url && detail.file_url !== 'PENDING_UPLOAD' ? detail.file_url : undefined,
          displaySize: detail?.file_url && detail.file_url !== 'PENDING_UPLOAD' ? getDisplaySize(detail.file_url) : Math.max(width, height, depth),
          size: [width, height, depth] as [number, number, number],
          color: '#d4d4d8',
        };
      })
    : [];

  const activeFurnitures = isViewerMode ? viewerFurnitures : generatedFurnitures;

  // Load wall texture
  useEffect(() => {
    new THREE.TextureLoader().load(
      '/furnitures/wallpapers/japanese_bamboo_pattern.png',
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        setWallTexture(texture);
      }
    );
  }, []);

  const updateFurniturePosition = (id: string, newPos: [number, number, number]) => {
    setFurnitures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, position: newPos } : f))
    );
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* ── Prompt input (generate mode only) ────────────────────────── */}
      {!isViewerMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-xl">
          <div className="flex gap-2">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generate(description)}
              placeholder="Describe your dream room..."
              disabled={isGenerating}
              className="flex-1 px-4 py-2 rounded-lg bg-black/60 text-white border border-white/20 backdrop-blur-sm text-sm placeholder:text-white/40 focus:outline-none focus:border-white/50 disabled:opacity-50"
            />
            <button
              onClick={() => generate(description)}
              disabled={isGenerating || !description.trim()}
              className="px-4 py-2 rounded-lg bg-amber-500 text-black font-medium text-sm disabled:opacity-50 hover:bg-amber-400 transition-colors"
            >
              {isGenerating ? '...' : 'Generate'}
            </button>
          </div>
        </div>
      )}

      {/* ── Loading overlay ──────────────────────────────────────────── */}
      {!isViewerMode && isGenerating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-lg">
          <div className="text-center">
            <p className="text-2xl mb-3">✦</p>
            <p className="text-sm text-white/80 animate-pulse">{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* ── Error message ────────────────────────────────────────────── */}
      {!isViewerMode && error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-destructive/90 text-white px-4 py-2 rounded-lg text-sm max-w-md text-center">
          {error}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {!isViewerMode && activeFurnitures.length === 0 && !isGenerating && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
          <p className="text-sm text-muted-foreground/60">
            Describe a room above to get started
          </p>
        </div>
      )}

      {/* ── Three.js Canvas ──────────────────────────────────────────── */}
      <WebGLErrorBoundary fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground text-center px-4">
            3D preview unavailable — WebGL is not supported in this browser context.<br />
            Try opening in a new tab or a different browser.
          </p>
        </div>
      }>
        <Canvas
          shadows
          camera={{ position: [12, 8, 12], fov: 50 }}
          onPointerMissed={() => setSelectedId(null)}
          gl={{
            powerPreference: 'high-performance',
            antialias: true,
            failIfMajorPerformanceCaveat: false,
          }}
          onCreated={({ gl }) => {
            if (!gl) console.warn('WebGL context unavailable');
          }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[20, 30, 20]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />

          {/* Floor */}
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={() => null}>
            <planeGeometry args={[roomSize, roomSize]} />
            <meshStandardMaterial color="#f0f0f0" />
          </mesh>

          {/* Ceiling */}
          <mesh position={[0, roomHeight, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
            <planeGeometry args={[roomSize, roomSize]} />
            <meshStandardMaterial color="#e8e8e8" />
          </mesh>

          {/* Back wall */}
          <mesh position={[0, halfH, -halfW]} raycast={() => null}>
            <planeGeometry args={[roomSize, roomHeight]} />
            <meshStandardMaterial map={wallTexture ?? undefined} color="#ffffff" side={THREE.FrontSide} />
          </mesh>

          {/* Front wall */}
          <mesh position={[0, halfH, halfW]} rotation={[0, Math.PI, 0]} raycast={() => null}>
            <planeGeometry args={[roomSize, roomHeight]} />
            <meshStandardMaterial map={wallTexture ?? undefined} color="#ffffff" side={THREE.FrontSide} />
          </mesh>

          {/* Left wall */}
          <mesh position={[-halfW, halfH, 0]} rotation={[0, Math.PI / 2, 0]} raycast={() => null}>
            <planeGeometry args={[roomSize, roomHeight]} />
            <meshStandardMaterial map={wallTexture ?? undefined} color="#ffffff" side={THREE.FrontSide} />
          </mesh>

          {/* Right wall */}
          <mesh position={[halfW, halfH, 0]} rotation={[0, -Math.PI / 2, 0]} raycast={() => null}>
            <planeGeometry args={[roomSize, roomHeight]} />
            <meshStandardMaterial map={wallTexture ?? undefined} color="#ffffff" side={THREE.FrontSide} />
          </mesh>

          {/* Grid */}
          <gridHelper
            args={[roomSize, roomSize, '#94a3b8', '#cbd5e1']}
            position={[0, 0.01, 0]}
            raycast={() => null}
          />

          {activeFurnitures.map((furniture) => (
            <MovableFurniture
              key={furniture.id}
              furniture={furniture}
              isSelected={selectedId === furniture.id}
              onSelect={() => setSelectedId(furniture.id)}
              onPositionChange={(newPos) => updateFurniturePosition(furniture.id, newPos)}
            />
          ))}

          <OrbitControls
            makeDefault
            enableZoom
            target={[0, 0, 0]}
            maxDistance={220}
            minDistance={5}
          />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
