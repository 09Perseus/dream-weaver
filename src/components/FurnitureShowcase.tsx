import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useCurrency } from "@/contexts/CurrencyContext";

interface ShowcaseItem {
  id: string;
  name: string;
  price: number;
  file_url: string;
  thumbnail_url: string | null;
  category: string;
}

/* ── Auto-rotating 3D model ── */

function AutoRotatingModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  const clonedScene = useMemo(() => {
    try {
      const cloned = scene.clone(true);

      const box = new THREE.Box3().setFromObject(cloned);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      if (maxDim > 0) {
        const scale = 1.5 / maxDim;
        cloned.scale.setScalar(scale);
      }

      const newBox = new THREE.Box3().setFromObject(cloned);
      const centre = newBox.getCenter(new THREE.Vector3());
      cloned.position.sub(centre);

      return cloned;
    } catch {
      return scene.clone(true);
    }
  }, [scene]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

/* ── Showcase component ── */

export default function FurnitureShowcase({ items }: { items: ShowcaseItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    if (items.length <= 1) return;

    const interval = setInterval(() => {
      setOpacity(0);

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setOpacity(1);
      }, 500);
    }, 5000);

    return () => clearInterval(interval);
  }, [items.length]);

  const currentItem = items[currentIndex];
  if (!currentItem) return null;

  return (
    <div className="max-w-[320px] mx-auto w-full">
      {/* 3D Canvas */}
      <div
        className="aspect-square border border-border bg-background overflow-hidden"
        style={{ transition: "opacity 500ms ease", opacity }}
      >
        <Canvas
          camera={{ position: [0, 0.5, 3], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 3]} intensity={0.8} />
          <directionalLight position={[-3, 2, -2]} intensity={0.3} />
          <Suspense fallback={null}>
            <AutoRotatingModel url={currentItem.file_url} />
          </Suspense>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 2.2}
          />
        </Canvas>
      </div>

      {/* Item info */}
      <div className="mt-4 text-center" style={{ transition: "opacity 500ms ease", opacity }}>
        <p className="font-heading text-[1.1rem] font-normal text-foreground">
          {currentItem.name}
        </p>
        <p className="font-body text-[0.85rem] text-accent mt-1">
          {formatPrice(currentItem.price)}
        </p>
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setOpacity(0);
                setTimeout(() => {
                  setCurrentIndex(i);
                  setOpacity(1);
                }, 300);
              }}
              className="transition-all duration-300"
              style={{
                width: i === currentIndex ? "16px" : "6px",
                height: "6px",
                borderRadius: "3px",
                background: i === currentIndex ? "hsl(var(--accent))" : "hsl(var(--border))",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
              aria-label={`Show item ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
