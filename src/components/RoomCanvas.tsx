import { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import React, { forwardRef } from "react";
import type { PlacedItem, FurnitureDetail } from "@/lib/edgeFunctions";

interface RoomCanvasProps {
  className?: string;
  items?: PlacedItem[];
  furniture?: FurnitureDetail[];
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
  const [wallTexture, setWallTexture] = useState<THREE.Texture | null>(null);

  // Load wallpaper texture on mount
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/furnitures/wallpapers/japanese_bamboo_pattern.png', (texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(4, 4);
      setWallTexture(texture);
    });
  }, []);

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
          // Exclude tall_house_plant as it's missing from the public folder
          if (fromName === 'tall_house_plant') return false;
          return fromPath.startsWith('plants/') || fromName.includes('plant');
        });

        // Arrange items in a 6-column grid to view them all side by side
        const items = plantItems.map((item: any, i: number) => {
          const cols = 6;
          const cellSize = roomSize / cols; // divide room width evenly
          
          const x = -roomSize / 2 + (i % cols) * cellSize + cellSize / 2;
          const z = -roomSize / 2 + Math.floor(i / cols) * cellSize + cellSize / 2;

          const rawScale = Number(item.scale_factor) || 1;
          const plantScale = Math.max(0.05, Math.min(rawScale,1));

          return {
            id: item.name,
            path: item.path,
            position: [x, floorY + 0.01, z] as [number, number, number],
            scale: plantScale as number,
          };
        });

        setFurnitures(items);
      });
  }, [roomHeight]);

  const updateFurniturePosition = (id: string, newPos: [number, number, number]) => {
    setFurnitures(prev => prev.map(f => f.id === id ? { ...f, position: newPos } : f));
  };

const RoomCanvas = forwardRef<HTMLDivElement, RoomCanvasProps>(({ className = "", items = [], furniture = [] }, ref) => {
  return (
    <div
      ref={ref}
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

        {/* Floor */}
        <mesh 
          position={[0, -roomHeight / 2, 0]} 
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow 
          raycast={() => null}
        >
          <planeGeometry args={[roomSize, roomSize]} />
          <meshStandardMaterial color="#f0f0f0" />
        </mesh>

        {/* Front Wall */}
        <mesh 
          position={[0, 0, roomSize / 2]}
          raycast={() => null}
        >
          <planeGeometry args={[roomSize, roomHeight]} />
          <meshStandardMaterial 
            map={wallTexture}
            side={THREE.BackSide} 
            color="#ffffff"
          />
        </mesh>

        {/* Back Wall */}
        <mesh 
          position={[0, 0, -roomSize / 2]}
          rotation={[0, Math.PI, 0]}
          raycast={() => null}
        >
          <planeGeometry args={[roomSize, roomHeight]} />
          <meshStandardMaterial 
            map={wallTexture}
            side={THREE.BackSide} 
            color="#ffffff"
          />
        </mesh>

        {/* Left Wall */}
        <mesh 
          position={[-roomSize / 2, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          raycast={() => null}
        >
          <planeGeometry args={[roomSize, roomHeight]} />
          <meshStandardMaterial 
            map={wallTexture}
            side={THREE.BackSide} 
            color="#ffffff"
          />
        </mesh>

        {/* Right Wall */}
        <mesh 
          position={[roomSize / 2, 0, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          raycast={() => null}
        >
          <planeGeometry args={[roomSize, roomHeight]} />
          <meshStandardMaterial 
            map={wallTexture}
            side={THREE.BackSide} 
            color="#ffffff"
          />
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
});

RoomCanvas.displayName = "RoomCanvas";

export default RoomCanvas;
