import { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface RoomCanvasProps {
  className?: string;
}

export interface FurnitureItem {
  id: string;
  position: [number, number, number];
  color?: string;
  path?: string;
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
}

// Sub-component to dynamically load GLTF models
function Model({ path }: { path: string }) {
  const { scene } = useGLTF(`/furnitures/${path}`);
  return <primitive object={scene.clone()} />;
}

function MovableFurniture({
  furniture,
  isSelected,
  onSelect,
  onPositionChange
}: {
  furniture: FurnitureItem,
  isSelected: boolean,
  onSelect: () => void,
  onPositionChange: (pos: [number, number, number]) => void
}) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <>
      <group
        ref={groupRef}
        position={furniture.position}
        rotation={furniture.rotation}
        scale={furniture.scale}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {furniture.path ? (
          <Suspense fallback={
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="gray" wireframe />
            </mesh>
          }>
            <Model path={furniture.path} />
          </Suspense>
        ) : (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} /> {/* Default size if no path */}
            <meshStandardMaterial
              color={furniture.color || "white"}
              emissive={isSelected ? "#333333" : "#000000"}
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
              onPositionChange(groupRef.current.position.toArray() as [number, number, number]);
            }
          }}
        />
      )}
    </>
  );
}

export default function RoomCanvas({ className = "" }: RoomCanvasProps) {
  const roomScale= 0.7; 
  const roomSize = 10*roomScale;
  const roomHeight = 5*roomScale;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [furnitures, setFurnitures] = useState<FurnitureItem[]>([]);

  // Dynamically fetch and layout the 31 JSON furniture items on component mount
  useEffect(() => {
    fetch('/furnitures/furniture-list.json')
      .then(res => res.json())
      .then(data => {
        const floorY = -roomHeight / 2;

        // Show only plant models in the canvas
        const plantItems = data.furnitures.filter((item: any) => {
          if (!item.path && !item.name) return false;
          const fromPath = String(item.path || '').toLowerCase();
          const fromName = String(item.name || '').toLowerCase();
          return fromPath.startsWith('plants/') || fromName.includes('plant');
        });

        // Arrange items in a 6-column grid to view them all side by side
        const items = plantItems.map((item: any, i: number) => {
          const cols = 6;
          const spacing = 4; // 4 meters apart

          const x = (i % cols) * spacing - (cols * spacing) / 2 + (spacing / 2);
          const z = Math.floor(i / cols) * spacing - 10;

          const rawScale = Number(item.scale_factor) || 1;
          const maxModelScale = 0.35;
          const adjustedScale = Math.min(rawScale, maxModelScale);

          return {
            id: item.name,
            path: item.path,
            position: [x, floorY, z] as [number, number, number],
            scale: adjustedScale,
          };
        });

        setFurnitures(items);
      });
  }, [roomHeight]);

  const updateFurniturePosition = (id: string, newPos: [number, number, number]) => {
    setFurnitures(prev => prev.map(f => f.id === id ? { ...f, position: newPos } : f));
  };

  return (
    <div
      id="room-canvas"
      className={`room-canvas relative bg-zinc-900 rounded-lg border border-border/50 overflow-hidden ${className}`}
    >
      <Canvas
        shadows
        camera={{ position: [25, 18, 30], fov: 60 }}
        onPointerMissed={() => setSelectedId(null)}
      >
        <ambientLight intensity={0.5} />

        <directionalLight
          position={[20, 30, 20]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />

        <mesh receiveShadow raycast={() => null}>
          <boxGeometry args={[roomSize, roomHeight, roomSize]} />
          <meshStandardMaterial color="#f1f5f9" side={THREE.BackSide} />
        </mesh>

        <gridHelper
          args={[roomSize, roomSize, '#94a3b8', '#cbd5e1']}
          position={[0, -roomHeight / 2 + 0.01, 0]}
          raycast={() => null}
        />

        {furnitures.map((furniture) => (
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
          enableZoom={true}
          target={[0, 0, 0]}
          maxDistance={220}
          minDistance={5}
        />
      </Canvas>
    </div>
  );
}
