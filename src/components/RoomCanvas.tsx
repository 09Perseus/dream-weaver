import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface RoomCanvasProps {
  className?: string;
}

export interface FurnitureItem {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

export default function RoomCanvas({ className = "" }: RoomCanvasProps) {
  const roomSize = 50;
  const roomHeight = 20;

  const [furnitures, setFurnitures] = useState<FurnitureItem[]>([
    {
      id: "main-box",
      position: [0, -roomHeight / 2 + 3, 0],
      size: [6, 6, 6],
      color: "#3b82f6"
    },
    {
      id: "side-box",
      position: [12, -roomHeight / 2 + 2, -8],
      size: [4, 4, 4],
      color: "#f59e0b"
    },
    {
      id: "small-box",
      position: [-10, -roomHeight / 2 + 1.5, 5],
      size: [3, 3, 3],
      color: "#ef4444"
    }
  ]);

  return (
    <div
      id="room-canvas"
      className={`room-canvas relative bg-zinc-900 rounded-lg border border-border/50 overflow-hidden ${className}`}
    >
      <Canvas shadows camera={{ position: [40, 30, 45], fov: 60 }}>
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
          <mesh
            key={furniture.id}
            position={furniture.position}
            castShadow
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              console.log(`Clicked on furniture: ${furniture.id}`);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              console.log(`Double-clicked on furniture: ${furniture.id}`);
            }}
          >
            <boxGeometry args={furniture.size} />
            <meshStandardMaterial color={furniture.color} />
          </mesh>
        ))}

        <OrbitControls
          makeDefault
          enableZoom={true}
          target={[0, 0, 0]}
          maxDistance={120}
          minDistance={10}
        />
      </Canvas>
    </div>
  );
}
