import { useState, useRef, useEffect, useMemo, useCallback, Suspense, Component, type ReactNode } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useGenerateRoom, getDisplaySize } from "@/hooks/useGenerateRoom";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PlacedItem, FurnitureDetail } from "@/lib/edgeFunctions";

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return false;
    const glCtx = gl as WebGLRenderingContext;
    const result = glCtx.getShaderPrecisionFormat(glCtx.VERTEX_SHADER, glCtx.HIGH_FLOAT);
    return result !== null && result.precision > 0;
  } catch {
    return false;
  }
}

function WebGLUnavailable({ items }: { items?: { id: string }[] }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 rounded-lg gap-4 p-8">
      <div className="text-4xl">🛋️</div>
      <p className="font-heading text-lg text-foreground text-center">Room Generated Successfully!</p>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        3D preview requires WebGL support. Open this page in a full browser (Chrome, Firefox, Safari) to see the
        interactive 3D view.
      </p>
      {items && items.length > 0 && (
        <p className="text-xs text-muted-foreground">{items.length} furniture items placed</p>
      )}
    </div>
  );
}

interface RoomCanvasProps {
  className?: string;
  style?: React.CSSProperties;
  items?: PlacedItem[];
  furniture?: FurnitureDetail[];
  selectedItemId?: string | null;
  editingItemId?: string | null;
  onSelectItem?: (id: string) => void;
  onEditItem?: (id: string) => void;
  onPositionChange?: (id: string, pos: [number, number, number]) => void;
}

export interface FurnitureItem {
  id: string;
  name?: string;
  description?: string;
  position: [number, number, number];
  color?: string;
  path?: string;
  rotation?: [number, number, number];
  displaySize?: number;
  size?: [number, number, number];
}

function Model({ path, displaySize = 1 }: { path: string; displaySize?: number }) {
  const cleanPath = path
    .replace(/^\/+/, "")
    .replace(/^furnitures\//, "")
    .replace(/\/\//g, "/");

  const { scene } = useGLTF(`/furnitures/${cleanPath}`);
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

class ModelErrorBoundary extends Component<{ children: ReactNode; itemId: string }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error("Model failed to load:", (this.props as any).itemId, error?.message || error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#ef4444" wireframe />
        </mesh>
      );
    }
    return this.props.children;
  }
}

function MovableFurniture({
  furniture,
  isSelected,
  isEditMode,
  onSingleClick,
  onDoubleClick,
  onPositionChange,
}: {
  furniture: FurnitureItem;
  isSelected: boolean;
  isEditMode: boolean;
  onSingleClick: () => void;
  onDoubleClick: () => void;
  onPositionChange: (pos: [number, number, number]) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef(new THREE.Vector3());
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const intersection = useMemo(() => new THREE.Vector3(), []);
  const { camera, gl, raycaster, pointer } = useThree();

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isEditMode) return;
    e.stopPropagation();
    isDragging.current = true;
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(floorPlane, intersection);
    dragOffset.current.set(intersection.x - furniture.position[0], 0, intersection.z - furniture.position[2]);
  };

  useFrame(() => {
    if (!isDragging.current || !isEditMode) return;
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(floorPlane, intersection);
    const newX = intersection.x - dragOffset.current.x;
    const newZ = intersection.z - dragOffset.current.z;
    onPositionChange([newX, 0, newZ]);
  });

  useEffect(() => {
    const canvas = gl.domElement;
    const handleUp = () => {
      isDragging.current = false;
    };
    canvas.addEventListener("pointerup", handleUp);
    canvas.addEventListener("pointerleave", handleUp);
    return () => {
      canvas.removeEventListener("pointerup", handleUp);
      canvas.removeEventListener("pointerleave", handleUp);
    };
  }, [gl]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      onDoubleClick();
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        onSingleClick();
      }, 220);
    }
  };

  return (
    <group
      ref={groupRef}
      position={furniture.position}
      rotation={furniture.rotation}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      {furniture.path && furniture.path !== "PENDING_UPLOAD" ? (
        <ModelErrorBoundary itemId={furniture.id}>
          <Suspense
            fallback={
              <mesh>
                <boxGeometry args={furniture.size ?? [1, 1, 1]} />
                <meshStandardMaterial color="gray" wireframe />
              </mesh>
            }
          >
            <Model path={furniture.path} displaySize={furniture.displaySize} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={furniture.size ?? [1, 1, 1]} />
          <meshStandardMaterial color={furniture.color || "white"} emissive={isSelected ? "#333333" : "#000000"} />
        </mesh>
      )}

      {isSelected && !isEditMode && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.55, 0.7, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.7} />
        </mesh>
      )}

      {isSelected && isEditMode && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.55, 0.7, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

function ItemListRow({
  furniture,
  isActive,
  onClick,
}: {
  furniture: FurnitureItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const displayName =
    furniture.name ?? furniture.path?.split("/").pop()?.replace(".glb", "").replace(/_/g, " ") ?? "Furniture";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-border transition-colors
                  cursor-pointer min-h-[44px] flex items-center gap-3
                  ${isActive ? "bg-accent/10 border-l-2 border-l-accent" : "hover:bg-background"}`}
    >
      <div className="h-10 w-10 shrink-0 border border-border bg-muted rounded flex items-center justify-center">
        <span className="text-lg">🛋️</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-body text-[0.8rem] text-foreground truncate capitalize">{displayName}</p>
        <p className="font-body text-[0.7rem] text-accent">$1.00</p>
      </div>
      {isActive && (
        <span className="font-body text-[0.6rem] tracking-[0.1em] uppercase text-accent shrink-0">Selected</span>
      )}
    </button>
  );
}

function InfoCard({
  furniture,
  isEditMode,
  onDelete,
  onBack,
}: {
  furniture: FurnitureItem;
  isEditMode: boolean;
  onDelete: () => void;
  onBack: () => void;
}) {
  const displayName =
    furniture.name ?? furniture.path?.split("/").pop()?.replace(".glb", "").replace(/_/g, " ") ?? "Furniture";

  const size = furniture.displaySize ?? 1;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="font-body text-[0.75rem] text-muted-foreground
                     hover:text-foreground transition-colors flex items-center gap-1"
        >
          ← Back
        </button>
        <span className="font-body text-[0.7rem] tracking-[0.1em] uppercase text-muted-foreground ml-auto">
          {isEditMode ? "Edit Mode" : "Item Details"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="w-full aspect-square bg-muted rounded-lg border border-border flex items-center justify-center">
          <span className="text-6xl">🛋️</span>
        </div>

        <div>
          <p className="font-heading text-lg text-foreground capitalize">{displayName}</p>
          <p className="font-body text-[0.75rem] text-muted-foreground mt-1">
            {furniture.description ?? "A beautifully crafted piece for your room."}
          </p>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-border">
          <span className="font-body text-[0.75rem] text-muted-foreground uppercase tracking-wide">Price</span>
          <span className="font-heading text-xl text-accent">$1.00</span>
        </div>

        <div className="py-3 border-t border-border space-y-1">
          <span className="font-body text-[0.7rem] text-muted-foreground uppercase tracking-wide">Dimensions</span>
          <p className="font-body text-[0.8rem] text-foreground">
            {size.toFixed(2)}m × {(size * 0.6).toFixed(2)}m × {(size * 0.8).toFixed(2)}m
          </p>
        </div>

        {isEditMode && (
          <div className="py-3 px-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="font-body text-[0.75rem] text-amber-600 dark:text-amber-400">
              Drag to reposition · Double-click again to exit edit mode
            </p>
          </div>
        )}

        <div className="space-y-2 pt-1">
          <button className="w-full py-2 px-4 bg-accent text-white text-sm font-body rounded-lg hover:opacity-90 transition-opacity">
            Add to Cart
          </button>
          <button
            onClick={onDelete}
            className="w-full py-2 px-4 bg-destructive text-destructive-foreground text-sm font-body rounded-lg hover:opacity-90 transition-opacity"
          >
            Delete from Room
          </button>
        </div>
      </div>
    </div>
  );
}

function StandaloneSidebar({
  furnitures,
  selectedId,
  editId,
  isMobile,
  onSelectItem,
  onDelete,
  onBack,
}: {
  furnitures: FurnitureItem[];
  selectedId: string | null;
  editId: string | null;
  isMobile: boolean;
  onSelectItem: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}) {
  const selectedFurniture = furnitures.find((f) => f.id === selectedId);

  return (
    <aside
      className={`shrink-0 border-border bg-surface overflow-hidden flex flex-col
                  ${isMobile ? "w-full h-64 border-t" : "w-72 border-l"}`}
    >
      {selectedFurniture ? (
        <InfoCard
          furniture={selectedFurniture}
          isEditMode={editId === selectedFurniture.id}
          onDelete={() => onDelete(selectedFurniture.id)}
          onBack={onBack}
        />
      ) : (
        <>
          <div className="p-4 border-b border-border shrink-0">
            <h3 className="font-body text-[0.7rem] tracking-[0.1em] uppercase text-muted-foreground">
              Room Items ({furnitures.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {furnitures.length === 0 ? (
              <p className="font-body text-[0.75rem] text-muted-foreground text-center py-8 px-4">
                No furniture yet. Generate a room to get started.
              </p>
            ) : (
              furnitures.map((f) => (
                <ItemListRow
                  key={f.id}
                  furniture={f}
                  isActive={selectedId === f.id}
                  onClick={() => onSelectItem(f.id)}
                />
              ))
            )}
          </div>
        </>
      )}
    </aside>
  );
}

export default function RoomCanvas({
  className = "",
  style,
  items,
  furniture,
  selectedItemId: controlledSelectedId,
  editingItemId: controlledEditingId,
  onSelectItem: externalOnSelect,
  onEditItem: externalOnEdit,
  onPositionChange: externalOnPositionChange,
}: RoomCanvasProps) {
  const isControlled = externalOnSelect !== undefined;
  const isViewerMode = !!(items && furniture);

  const roomSize = 5;
  const roomHeight = 3.5;
  const halfW = roomSize / 2;
  const halfH = roomHeight / 2;
  const isMobile = useIsMobile();

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [internalEditId, setInternalEditId] = useState<string | null>(null);

  const selectedId = isControlled ? (controlledSelectedId ?? null) : internalSelectedId;
  const editId = isControlled ? (controlledEditingId ?? null) : internalEditId;

  const [wallTexture, setWallTexture] = useState<THREE.Texture | null>(null);
  const [description, setDescription] = useState("");

  const {
    furnitures: generatedFurnitures,
    setFurnitures,
    isGenerating,
    loadingMessage,
    error,
    generate,
  } = useGenerateRoom({ roomSize, roomHeight });

  const viewerFurnitures: FurnitureItem[] = isViewerMode
    ? items.map((item) => {
        const detail = furniture.find((f) => f.id === item.id);
        const width = Math.max(detail?.real_width ?? 0.8, 0.4);
        const height = Math.max(detail?.real_height ?? 0.8, 0.2);
        const depth = Math.max(detail?.real_depth ?? 0.8, 0.4);
        return {
          id: item.id,
          name: detail?.name,
          position: [item.x, 0, item.z] as [number, number, number],
          rotation: [0, (item.rotation * Math.PI) / 180, 0] as [number, number, number],
          path: detail?.file_url && detail.file_url !== "PENDING_UPLOAD" ? detail.file_url : undefined,
          displaySize:
            detail?.file_url && detail.file_url !== "PENDING_UPLOAD"
              ? getDisplaySize(detail.file_url)
              : Math.max(width, height, depth),
          size: [width, height, depth] as [number, number, number],
          color: "#d4d4d8",
        };
      })
    : [];

  const normalizedGenerated = generatedFurnitures.map((f) => ({
    ...f,
    position: [f.position[0], 0, f.position[2]] as [number, number, number],
  }));

  const activeFurnitures = isViewerMode ? viewerFurnitures : normalizedGenerated;

  useEffect(() => {
    new THREE.TextureLoader().load("/furnitures/wallpapers/japanese_bamboo_pattern.png", (texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(4, 4);
      setWallTexture(texture);
    });
  }, []);

  const handlePositionChange = (id: string, newPos: [number, number, number]) => {
    if (externalOnPositionChange) {
      externalOnPositionChange(id, [newPos[0], 0, newPos[2]]);
    } else {
      setFurnitures((prev) => prev.map((f) => (f.id === id ? { ...f, position: [newPos[0], 0, newPos[2]] } : f)));
    }
  };

  const handleSingleClick = (id: string) => {
    if (isControlled) {
      externalOnSelect!(id);
    } else {
      setInternalSelectedId((prev) => (prev === id ? null : id));
      setInternalEditId(null);
    }
  };

  const handleDoubleClick = (id: string) => {
    if (isControlled) {
      externalOnEdit!(id);
    } else {
      setInternalSelectedId(id);
      setInternalEditId((prev) => (prev === id ? null : id));
    }
  };

  const handleInternalDelete = (id: string) => {
    setFurnitures((prev) => prev.filter((f) => f.id !== id));
    setInternalSelectedId(null);
    setInternalEditId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && internalSelectedId && !isControlled) {
        if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
        e.preventDefault();
        handleInternalDelete(internalSelectedId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [internalSelectedId, isControlled]);

  const webglSupported = useMemo(() => detectWebGL(), []);

  return (
    <div
      className={`relative flex ${isMobile ? "flex-col" : "flex-row"} ${className}`}
      style={{ width: "100%", height: "100%", minHeight: "400px", ...style }}
    >
      <div className="relative flex-1 min-h-0 min-w-0">
        {!webglSupported && <WebGLUnavailable items={isViewerMode ? items : undefined} />}

        {!isViewerMode && !isControlled && webglSupported && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-xl">
            <div className="flex gap-2">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generate(description)}
                placeholder="Describe your dream room..."
                disabled={isGenerating}
                className="flex-1 px-4 py-2 rounded-lg bg-black/60 text-white border border-white/20
                           backdrop-blur-sm text-sm placeholder:text-white/40 focus:outline-none
                           focus:border-white/50 disabled:opacity-50"
              />
              <button
                onClick={() => generate(description)}
                disabled={isGenerating || !description.trim()}
                className="px-4 py-2 rounded-lg bg-amber-500 text-black font-medium text-sm
                           disabled:opacity-50 hover:bg-amber-400 transition-colors"
              >
                {isGenerating ? "..." : "Generate"}
              </button>
            </div>
          </div>
        )}

        {activeFurnitures.length > 0 && !isGenerating && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <p className="text-[0.7rem] text-white/50 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
              Click to inspect · Double-click to move
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-lg">
            <div className="text-center">
              <p className="text-2xl mb-3">✦</p>
              <p className="text-sm text-white/80 animate-pulse">{loadingMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-destructive/90 text-white px-4 py-2 rounded-lg text-sm max-w-md text-center">
            {error}
          </div>
        )}

        {activeFurnitures.length === 0 && !isGenerating && (
          <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground/60">
              {isControlled ? "Add furniture from the picker on the left" : "Describe a room above to get started"}
            </p>
          </div>
        )}

        {webglSupported && (
          <Canvas
            shadows
            // ✅ FIXED — centered position, no teleport jump
            camera={{
              position: [0, 12, 10],
              fov: 45,
              near: 0.1,
              far: 100,
            }}
            style={{ width: "100%", height: "100%" }}
            onPointerMissed={() => {
              if (!isControlled) {
                setInternalSelectedId(null);
                setInternalEditId(null);
              }
            }}
            gl={{
              powerPreference: "default",
              antialias: true,
              failIfMajorPerformanceCaveat: false,
              preserveDrawingBuffer: true,
            }}
            // ✅ FIXED — removed lookAt, OrbitControls handles orientation
            onCreated={({ gl }) => {
              const canvas = gl.domElement;
              canvas.addEventListener("webglcontextlost", (e) => {
                e.preventDefault();
                console.warn("WebGL context lost");
              });
              canvas.addEventListener("webglcontextrestored", () => {
                console.log("WebGL context restored");
              });
            }}
          >
            <ambientLight intensity={0.7} />
            <directionalLight position={[0, 10, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[0, 4, 8]} intensity={0.5} />

            {/* Floor */}
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={() => null}>
              <planeGeometry args={[roomSize, roomSize]} />
              <meshStandardMaterial color="#f0ece4" />
            </mesh>

            {/* Back wall */}
            <mesh position={[0, halfH, -halfW]} raycast={() => null}>
              <planeGeometry args={[roomSize, roomHeight]} />
              <meshStandardMaterial map={wallTexture ?? undefined} color="#faf7f2" side={THREE.DoubleSide} />
            </mesh>

            {/* Left wall */}
            <mesh position={[-halfW, halfH, 0]} rotation={[0, Math.PI / 2, 0]} raycast={() => null}>
              <planeGeometry args={[roomSize, roomHeight]} />
              <meshStandardMaterial map={wallTexture ?? undefined} color="#faf7f2" side={THREE.DoubleSide} />
            </mesh>

            {/* Right wall */}
            <mesh position={[halfW, halfH, 0]} rotation={[0, -Math.PI / 2, 0]} raycast={() => null}>
              <planeGeometry args={[roomSize, roomHeight]} />
              <meshStandardMaterial map={wallTexture ?? undefined} color="#faf7f2" side={THREE.DoubleSide} />
            </mesh>

            {/* Grid */}
            <gridHelper
              args={[roomSize, roomSize, "#c4bdb4", "#dbd5cc"]}
              position={[0, 0.01, 0]}
              raycast={() => null}
            />

            {activeFurnitures.map((f) => (
              <MovableFurniture
                key={f.id}
                furniture={f}
                isSelected={selectedId === f.id}
                isEditMode={editId === f.id}
                onSingleClick={() => handleSingleClick(f.id)}
                onDoubleClick={() => handleDoubleClick(f.id)}
                onPositionChange={(pos) => handlePositionChange(f.id, pos)}
              />
            ))}

            {/* ✅ DOLLHOUSE ORBIT — constrained angles, no teleport */}
            <OrbitControls
              makeDefault
              enableZoom
              enabled={!editId}
              target={[0, 0.5, 0]}
              maxPolarAngle={Math.PI / 2.2}
              minPolarAngle={Math.PI / 6}
              maxDistance={20}
              minDistance={4}
            />
          </Canvas>
        )}
      </div>

      {!isControlled && (internalSelectedId || internalEditId) && (
        <StandaloneSidebar
          furnitures={activeFurnitures}
          selectedId={internalSelectedId}
          editId={internalEditId}
          isMobile={isMobile}
          onSelectItem={(id) => {
            setInternalSelectedId((prev) => (prev === id ? null : id));
            setInternalEditId(null);
          }}
          onDelete={handleInternalDelete}
          onBack={() => {
            setInternalSelectedId(null);
            setInternalEditId(null);
          }}
        />
      )}
    </div>
  );
}
