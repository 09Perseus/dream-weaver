import { useState, useRef, useEffect, useMemo, useCallback, Suspense, Component, type ReactNode } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useGenerateRoom, getDisplaySize } from "@/hooks/useGenerateRoom";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PlacedItem, FurnitureDetail } from "@/lib/edgeFunctions";
import { getItemKey } from "@/lib/edgeFunctions";
import { RotateCcw, RotateCw } from "lucide-react";

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
  wallpaper?: { path: string } | null;
  flooring?: { path: string } | null;
  onSelectItem?: (id: string) => void;
  onEditItem?: (id: string) => void;
  onDeselect?: () => void;
  onPositionChange?: (id: string, pos: [number, number, number]) => void;
  onRotationChange?: (id: string, rot: [number, number, number]) => void;
  onAllModelsLoaded?: () => void;
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

function Model({ path, displaySize = 1, onLoad, onError, isSelected, isMoving }: { path: string; displaySize?: number; onLoad?: () => void; onError?: () => void; isSelected?: boolean; isMoving?: boolean }) {
  const cleanPath = path
    .replace(/^\/+/, "")
    .replace(/^furnitures\//, "")
    .replace(/\/\//g, "/");

  const { scene } = useGLTF(`/furnitures/${cleanPath}`);

  const cloned = useMemo(() => {
    try {
      const c = scene.clone();

      const cameras: THREE.Camera[] = [];
      c.traverse((node) => {
        if ((node as THREE.Camera).isCamera) {
          cameras.push(node as THREE.Camera);
        }
      });
      cameras.forEach(cam => cam.removeFromParent());

      // Deep-clone materials so emissive changes don't bleed across instances
      c.traverse((node) => {
        if (node instanceof THREE.Mesh && node.material) {
          if (Array.isArray(node.material)) {
            node.material = node.material.map((m: THREE.Material) => m.clone());
          } else {
            node.material = node.material.clone();
          }
        }
      });

      const box = new THREE.Box3().setFromObject(c);
      if (box.isEmpty()) { onLoad?.(); return c; }

      const size = box.getSize(new THREE.Vector3());
      const longestSide = Math.max(size.x, size.y, size.z);

      if (longestSide > 0 && Number.isFinite(longestSide)) {
        const scale = displaySize / longestSide;
        c.scale.setScalar(scale);
      }

      const scaledBox = new THREE.Box3().setFromObject(c);
      if (!scaledBox.isEmpty() && Number.isFinite(scaledBox.min.y)) {
        c.position.y -= scaledBox.min.y;
      }

      onLoad?.();
      return c;
    } catch (err) {
      onError?.();
      return scene;
    }
  }, [scene, displaySize]);

  // Apply emissive glow based on state
  useEffect(() => {
    if (!cloned) return;
    cloned.traverse((child: any) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat: any) => {
          if (mat.emissive) {
            if (isMoving) {
              mat.emissive = new THREE.Color("#00BFFF");
              mat.emissiveIntensity = 0.5;
            } else if (isSelected) {
              mat.emissive = new THREE.Color("#FFD700");
              mat.emissiveIntensity = 0.4;
            } else {
              mat.emissive = new THREE.Color("#000000");
              mat.emissiveIntensity = 0;
            }
            mat.needsUpdate = true;
          }
        });
      }
    });
  }, [isSelected, isMoving, cloned]);

  return <primitive object={cloned} />;
}

class ModelErrorBoundary extends Component<{ children: ReactNode; itemId: string; onError?: () => void }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error("Model failed to load:", (this.props as any).itemId, error?.message || error);
    this.props.onError?.();
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
  onRotationChange,
  activeRotationDir,
  onModelLoad,
}: {
  furniture: FurnitureItem;
  isSelected: boolean;
  isEditMode: boolean;
  onSingleClick: () => void;
  onDoubleClick: () => void;
  onPositionChange: (pos: [number, number, number]) => void;
  onRotationChange?: (rot: [number, number, number]) => void;
  activeRotationDir?: number;
  onModelLoad?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef(new THREE.Vector3());
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const lastClickTime = useRef(0);
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const intersection = useMemo(() => new THREE.Vector3(), []);
  const { camera, gl, raycaster, pointer } = useThree();

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    if (!isEditMode) return;
    isDragging.current = false;
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(floorPlane, intersection);
    dragOffset.current.set(intersection.x - furniture.position[0], 0, intersection.z - furniture.position[2]);
  };

  useFrame((state, delta) => {
    if (isEditMode && activeRotationDir && onRotationChange) {
      const currentRot = furniture.rotation || [0, 0, 0];
      const speed = Math.PI / 3;
      onRotationChange([currentRot[0], currentRot[1] + activeRotationDir * speed * delta, currentRot[2]]);
    }

    if (!isEditMode || !isDragging.current) return;
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(floorPlane, intersection);
    const newX = intersection.x - dragOffset.current.x;
    const newZ = intersection.z - dragOffset.current.z;
    onPositionChange([newX, 0, newZ]);
  });

  useEffect(() => {
    const canvas = gl.domElement;
    const handleMove = (e: PointerEvent) => {
      if (!pointerDownPos.current || !isEditMode) return;
      const dx = Math.abs(e.clientX - pointerDownPos.current.x);
      const dy = Math.abs(e.clientY - pointerDownPos.current.y);
      if (dx > 5 || dy > 5) {
        isDragging.current = true;
      }
    };
    const handleUp = (e: PointerEvent) => {
      if (pointerDownPos.current && !isDragging.current) {
        const dx = Math.abs(e.clientX - pointerDownPos.current.x);
        const dy = Math.abs(e.clientY - pointerDownPos.current.y);
        if (dx < 5 && dy < 5) {
          const now = Date.now();
          if (now - lastClickTime.current < 350) {
            // Double click — enter move mode
            onDoubleClick();
            lastClickTime.current = 0;
          } else {
            // Single click — select
            lastClickTime.current = now;
            onSingleClick();
          }
        }
      }
      isDragging.current = false;
      pointerDownPos.current = null;
    };
    canvas.addEventListener("pointermove", handleMove);
    canvas.addEventListener("pointerup", handleUp);
    canvas.addEventListener("pointerleave", handleUp);
    return () => {
      canvas.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("pointerup", handleUp);
      canvas.removeEventListener("pointerleave", handleUp);
    };
  }, [gl, isEditMode, onSingleClick]);

  useEffect(() => {
    if (!isEditMode || !onRotationChange) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r") {
        const r = furniture.rotation || [0, 0, 0];
        onRotationChange([r[0], r[1] + Math.PI / 8, r[2]]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditMode, furniture.rotation, onRotationChange]);

  const handleWheel = (e: ThreeEvent<WheelEvent>) => {
    if (!isEditMode || !onRotationChange) return;
    e.stopPropagation();
    const r = furniture.rotation || [0, 0, 0];
    const delta = Math.sign(e.deltaY) * (Math.PI / 12);
    onRotationChange([r[0], r[1] + delta, r[2]]);
  };

  return (
    <group
      ref={groupRef}
      position={furniture.position}
      rotation={furniture.rotation}
      onPointerDown={handlePointerDown}
      onWheel={handleWheel}
    >
      {furniture.path && furniture.path !== "PENDING_UPLOAD" ? (
        <ModelErrorBoundary itemId={furniture.id} onError={onModelLoad}>
          <Suspense
            fallback={
              <mesh>
                <boxGeometry args={furniture.size ?? [1, 1, 1]} />
                <meshStandardMaterial color="gray" wireframe />
              </mesh>
            }
          >
            <Model path={furniture.path} displaySize={furniture.displaySize} onLoad={onModelLoad} onError={onModelLoad} isSelected={isSelected} isMoving={isEditMode} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={furniture.size ?? [1, 1, 1]} />
          <meshStandardMaterial color={furniture.color || "white"} emissive={isEditMode ? "#00BFFF" : (isSelected ? "#FFD700" : "#000000")} emissiveIntensity={isEditMode ? 0.5 : (isSelected ? 0.4 : 0)} />
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
          {furniture?.description && (
            <p className="font-body text-[0.75rem] text-muted-foreground mt-1">
              {furniture.description}
            </p>
          )}
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

function CameraController({ editId }: { editId: string | null }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    camera.position.set(3, 3, 5);
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableZoom
      enabled={!editId}
      maxDistance={40}
      minDistance={2}
    />
  );
}

function StoreExposer() {
  const state = useThree();
  useEffect(() => {
    (window as any).__r3f_store = { getState: () => state };
    return () => { delete (window as any).__r3f_store; };
  }, [state]);
  return null;
}

// ── Texture loader helper ─────────────────────────────────────────────────────
// Loads a texture from a path, sets repeat wrapping, and calls back with the result.

function loadTexture(
  path: string,
  repeat: number,
  onLoad: (texture: THREE.Texture) => void
): () => void {
  let cancelled = false;
  const loader = new THREE.TextureLoader();
  loader.load(
    path,
    (texture) => {
      if (cancelled) {
        texture.dispose();
        return;
      }
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeat, repeat);
      texture.needsUpdate = true;
      onLoad(texture);
    },
    undefined,
    (err) => {
      console.warn("[RoomCanvas] Failed to load texture:", path, err);
    }
  );
  return () => { cancelled = true; };
}

export default function RoomCanvas({
  className = "",
  style,
  items,
  furniture,
  wallpaper,
  flooring,
  selectedItemId: controlledSelectedId,
  editingItemId: controlledEditingId,
  onSelectItem: externalOnSelect,
  onEditItem: externalOnEdit,
  onDeselect: externalOnDeselect,
  onPositionChange: externalOnPositionChange,
  onRotationChange: externalOnRotationChange,
  onAllModelsLoaded,
}: RoomCanvasProps) {
  const isControlled = externalOnSelect !== undefined;
  const isViewerMode = !!(items && furniture);

  const roomSize = 7.5;
  const roomHeight = 3.5;
  const halfW = roomSize / 2;
  const halfH = roomHeight / 2;
  const isMobile = useIsMobile();

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [internalEditId, setInternalEditId] = useState<string | null>(null);
  const [rotationDir, setRotationDir] = useState<number>(0);
  const [loadedCount, setLoadedCount] = useState(0);

  const selectedId = isControlled ? (controlledSelectedId ?? null) : internalSelectedId;
  const editId = isControlled ? (controlledEditingId ?? null) : internalEditId;

  const [description, setDescription] = useState("");

  // ── Texture state ──────────────────────────────────────────────────────────
  const [wallTexture, setWallTexture] = useState<THREE.Texture | null>(null);
  const [floorTexture, setFloorTexture] = useState<THREE.Texture | null>(null);

  // ── Hook ───────────────────────────────────────────────────────────────────
  const {
    furnitures: generatedFurnitures,
    setFurnitures,
    textures,         // { floor: string|null, wallpaper: string|null }
    isGenerating,
    loadingMessage,
    error,
    generate,
  } = useGenerateRoom({ roomSize, roomHeight });

  // ── Load wallpaper texture ─────────────────────────────────────────────────
  // Priority: prop (viewer mode) → generated texture (standalone mode)
  useEffect(() => {
    // Determine which path to load
    const rawPath = wallpaper?.path ?? (isViewerMode ? null : textures.wallpaper);
    if (!rawPath) return;

    // Textures from the hook are relative (e.g. "wallpapers/foo.png"), so prefix with /furnitures/
    // Prop paths from viewer mode are already absolute URLs — don't double-prefix them
    const fullPath = wallpaper?.path
      ? rawPath                          // viewer mode: already a full URL/path
      : `/furnitures/${rawPath}`;        // standalone: relative path from catalogue

    const cancel = loadTexture(fullPath, 4, (texture) => {
      setWallTexture((prev) => { prev?.dispose(); return texture; });
    });
    return () => {
      cancel();
    };
  }, [wallpaper?.path, textures.wallpaper, isViewerMode]);

  // ── Load floor texture ─────────────────────────────────────────────────────
  useEffect(() => {
    const rawPath = flooring?.path ?? (isViewerMode ? null : textures.floor);
    if (!rawPath) return;

    const fullPath = flooring?.path
      ? rawPath
      : `/furnitures/${rawPath}`;

    const cancel = loadTexture(fullPath, 4, (texture) => {
      setFloorTexture((prev) => { prev?.dispose(); return texture; });
    });
    return () => {
      cancel();
    };
  }, [flooring?.path, textures.floor, isViewerMode]);

  // ── Map viewer data ────────────────────────────────────────────────────────
  const viewerFurnitures: FurnitureItem[] = useMemo(() => {
    if (!isViewerMode) return [];
    return items.map((item) => {
      const detail = furniture.find((f) => f.id === item.id);
      const key = getItemKey(item);
      const width  = Math.max(detail?.real_width  ?? 0.8, 0.4);
      const height = Math.max(detail?.real_height ?? 0.8, 0.2);
      const depth  = Math.max(detail?.real_depth  ?? 0.8, 0.4);
      return {
        id: key,
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
    });
  }, [isViewerMode, items, furniture]);

  const activeFurnitures = isViewerMode
    ? viewerFurnitures
    : generatedFurnitures.map(f => ({
        ...f,
        position: [f.position[0], 0, f.position[2]] as [number, number, number],
      }));

  const totalModels = activeFurnitures.filter(f => f.path && f.path !== "PENDING_UPLOAD").length;
  const allLoaded = totalModels === 0 || loadedCount >= totalModels;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePositionChange = (id: string, newPos: [number, number, number]) => {
    if (externalOnPositionChange) {
      externalOnPositionChange(id, [newPos[0], 0, newPos[2]]);
    } else {
      setFurnitures((prev) =>
        prev.map((f) => (f.id === id ? { ...f, position: [newPos[0], 0, newPos[2]] } : f))
      );
    }
  };

  const handleRotationChange = (id: string, rot: [number, number, number]) => {
    if (externalOnRotationChange) {
      externalOnRotationChange(id, rot);
    } else {
      setFurnitures((prev) => prev.map((f) => (f.id === id ? { ...f, rotation: rot } : f)));
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

  const webglSupported = useMemo(() => detectWebGL(), []);

  // Escape to exit move mode and deselect
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isControlled && externalOnDeselect) {
          externalOnDeselect();
        } else if (!isControlled) {
          setInternalEditId(null);
          setInternalSelectedId(null);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isControlled, externalOnDeselect]);

  return (
    <div
      className={`relative flex ${isMobile ? "flex-col" : "flex-row"} ${className}`}
      style={{ width: "100%", height: "100%", minHeight: "400px", ...style }}
    >
      <div className="relative flex-1 min-h-0 min-w-0">
        {!webglSupported && <WebGLUnavailable items={isViewerMode ? items : undefined} />}

        {/* Standalone generate input */}
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

        {/* Loading overlay */}
        {isGenerating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-lg">
            <div className="text-center">
              <p className="text-2xl mb-3">✦</p>
              <p className="text-sm text-white/80 animate-pulse">{loadingMessage}</p>
            </div>
          </div>
        )}

        {/* Rotation buttons */}
        {editId && webglSupported && (
          <div className="absolute bottom-6 right-6 z-20 flex gap-2">
            <button
              onPointerDown={() => setRotationDir(1)}
              onPointerUp={() => setRotationDir(0)}
              onPointerLeave={() => setRotationDir(0)}
              className="p-3 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors border border-white/20 shadow-lg"
              title="Rotate Left"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onPointerDown={() => setRotationDir(-1)}
              onPointerUp={() => setRotationDir(0)}
              onPointerLeave={() => setRotationDir(0)}
              className="p-3 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors border border-white/20 shadow-lg"
              title="Rotate Right"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Move mode hint */}
        {editId && webglSupported && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none font-body text-[0.75rem] tracking-[0.08em]"
            style={{
              background: "hsl(var(--surface))",
              border: "1px solid hsl(var(--accent))",
              padding: "0.4rem 1rem",
              color: "hsl(var(--text-muted))",
            }}
          >
            DRAG TO MOVE · CLICK ANYWHERE TO STOP · ESC TO EXIT
          </div>
        )}

        {/* Model loading overlay */}
        {webglSupported && !allLoaded && totalModels > 0 && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6"
            style={{ background: "hsl(var(--bg))" }}
          >
            <div
              style={{ width: "200px", height: "1px", background: "hsl(var(--border))", overflow: "hidden" }}
            >
              <div
                style={{
                  height: "100%",
                  background: "hsl(var(--accent))",
                  width: `${totalModels > 0 ? (loadedCount / totalModels) * 100 : 0}%`,
                  transition: "width 400ms ease",
                }}
              />
            </div>
            <p className="font-heading text-base italic font-light text-muted-foreground tracking-wide">
              {loadedCount === 0
                ? "Designing your room..."
                : loadedCount < totalModels
                  ? `Placing furniture... ${loadedCount}/${totalModels}`
                  : "Welcome home."}
            </p>
          </div>
        )}

        {webglSupported && (
          <div style={{ opacity: allLoaded ? 1 : 0, transition: "opacity 600ms ease", width: "100%", height: "100%" }}>
          <Canvas
            shadows
            style={{ width: "100%", height: "100%" }}
            onPointerMissed={() => {
              if (isControlled && externalOnDeselect) {
                externalOnDeselect();
              } else if (!isControlled) {
                setInternalSelectedId(null);
                setInternalEditId(null);
              }
            }}
            gl={{ antialias: true, preserveDrawingBuffer: true }}
          >
            <ambientLight intensity={0.7} />
            <directionalLight position={[0, 10, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[0, 4, 8]} intensity={0.5} />

            {/* ── Floor ── */}
            <mesh
              position={[0, 0, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              receiveShadow
              raycast={() => null}
            >
              <planeGeometry args={[roomSize, roomSize]} />
              <meshStandardMaterial
                map={floorTexture ?? undefined}
                color={floorTexture ? "#ffffff" : "#f0ece4"}
                side={THREE.BackSide}
              />
            </mesh>

            {/* ── Ceiling ── */}
            <mesh
              position={[0, roomHeight, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              raycast={() => null}
            >
              <planeGeometry args={[roomSize, roomSize]} />
              <meshStandardMaterial color="#faf7f2" side={THREE.BackSide} transparent opacity={0.9} />
            </mesh>

            {/* ── Back Wall (-Z) ── */}
            <mesh
              position={[0, halfH, -halfW]}
              rotation={[0, Math.PI, 0]}
              raycast={() => null}
            >
              <planeGeometry args={[roomSize, roomHeight]} />
              <meshStandardMaterial
                map={wallTexture ?? undefined}
                color={wallTexture ? "#ffffff" : "#faf7f2"}
                side={THREE.BackSide}
              />
            </mesh>

            {/* ── Front Wall (+Z) ── */}
            <mesh
              position={[0, halfH, halfW]}
              rotation={[0, 0, 0]}
              raycast={() => null}
            >
              <planeGeometry args={[roomSize, roomHeight]} />
              <meshStandardMaterial
                map={wallTexture ?? undefined}
                color={wallTexture ? "#ffffff" : "#faf7f2"}
                side={THREE.BackSide}
              />
            </mesh>

            {/* ── Left Wall (-X) ── */}
            <mesh
              position={[-halfW, halfH, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              raycast={() => null}
            >
              <planeGeometry args={[roomSize, roomHeight]} />
              <meshStandardMaterial
                map={wallTexture ?? undefined}
                color={wallTexture ? "#ffffff" : "#faf7f2"}
                side={THREE.BackSide}
              />
            </mesh>

            {/* ── Right Wall (+X) ── */}
            <mesh
              position={[halfW, halfH, 0]}
              rotation={[0, Math.PI / 2, 0]}
              raycast={() => null}
            >
              <planeGeometry args={[roomSize, roomHeight]} />
              <meshStandardMaterial
                map={wallTexture ?? undefined}
                color={wallTexture ? "#ffffff" : "#faf7f2"}
                side={THREE.BackSide}
              />
            </mesh>

            <gridHelper
              args={[roomSize, roomSize, "#c4bdb4", "#dbd5cc"]}
              position={[0, 0.01, 0]}
              raycast={() => null}
            />

            {/* ── Furniture ── */}
            {activeFurnitures.map((f) => (
              <MovableFurniture
                key={f.id}
                furniture={f}
                isSelected={selectedId === f.id}
                isEditMode={editId === f.id}
                activeRotationDir={editId === f.id ? rotationDir : 0}
                onSingleClick={() => handleSingleClick(f.id)}
                onDoubleClick={() => handleDoubleClick(f.id)}
                onPositionChange={(pos) => handlePositionChange(f.id, pos)}
                onRotationChange={(rot) => handleRotationChange(f.id, rot)}
                onModelLoad={() => setLoadedCount(prev => prev + 1)}
              />
            ))}

            <StoreExposer />
            <CameraController editId={editId} />
          </Canvas>
          </div>
        )}
      </div>

      {/* Sidebar */}
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