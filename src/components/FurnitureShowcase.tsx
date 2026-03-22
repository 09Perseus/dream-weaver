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

/* ── Auto-rotating 3D model with wireframe-to-solid reveal ── */

function AutoRotatingModel({ url, revealKey }: { url: string; revealKey: number }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const originalMaterials = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
  const wireframeMaterials = useRef<Map<THREE.Mesh, THREE.Material>>(new Map());
  const initialized = useRef(false);

  const clonedScene = useMemo(() => {
    // Reset on new scene
    initialized.current = false;
    progressRef.current = 0;
    originalMaterials.current.clear();
    wireframeMaterials.current.clear();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, revealKey]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }

    // Initialize wireframe materials on first frame
    if (!initialized.current && clonedScene) {
      clonedScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          // Store original
          originalMaterials.current.set(mesh, mesh.material);

          // Create wireframe version
          const origMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          const color = (origMat as THREE.MeshStandardMaterial).color?.clone?.() ?? new THREE.Color("hsl(36, 45%, 70%)");
          const wireMat = new THREE.MeshBasicMaterial({
            color,
            wireframe: true,
            transparent: true,
            opacity: 1,
          });
          wireframeMaterials.current.set(mesh, wireMat);
          mesh.material = wireMat;
        }
      });
      initialized.current = true;
    }

    // Animate transition: 0 → 1 over ~1.5 seconds
    if (progressRef.current < 1) {
      progressRef.current = Math.min(1, progressRef.current + delta / 1.5);
      const t = progressRef.current;
      // Smooth ease-in-out
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      clonedScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const wireMat = wireframeMaterials.current.get(mesh);
          const origMats = originalMaterials.current.get(mesh);

          if (wireMat && origMats && ease >= 1) {
            // Fully revealed — swap to original
            mesh.material = origMats;
            wireMat.dispose();
          } else if (wireMat) {
            // Fade wireframe opacity down as we approach solid
            (wireMat as THREE.MeshBasicMaterial).opacity = 1 - ease * 0.7;
          }
        }
      });
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
