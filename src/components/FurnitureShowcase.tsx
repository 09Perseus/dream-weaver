import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
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

/* ── Auto-rotating 3D model with wireframe-to-solid crossfade ── */

function AutoRotatingModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const solidMaterials = useRef<Map<string, { mat: THREE.Material; original: THREE.Material }>>(new Map());
  const wireMaterials = useRef<Map<string, THREE.MeshBasicMaterial>>(new Map());

  const { wireClone, solidClone } = useMemo(() => {
    progressRef.current = 0;
    solidMaterials.current.clear();
    wireMaterials.current.clear();

    const normalize = (obj: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) obj.scale.setScalar(1.5 / maxDim);
      const newBox = new THREE.Box3().setFromObject(obj);
      const centre = newBox.getCenter(new THREE.Vector3());
      obj.position.sub(centre);
    };

    const solid = scene.clone(true);
    normalize(solid);
    let meshIdx = 0;
    solid.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const id = `mesh_${meshIdx++}`;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const clonedMats = mats.map((m) => {
          const c = m.clone();
          c.transparent = true;
          c.opacity = 0;
          c.needsUpdate = true;
          return c;
        });
        const result = Array.isArray(mesh.material) ? clonedMats : clonedMats[0];
        solidMaterials.current.set(id, { mat: result as THREE.Material, original: mats[0] });
        mesh.material = result as any;
      }
    });

    const wire = scene.clone(true);
    normalize(wire);
    meshIdx = 0;
    wire.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const id = `mesh_${meshIdx++}`;
        const origMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const color = (origMat as THREE.MeshStandardMaterial).color?.clone?.() ?? new THREE.Color(0xc8b89a);
        const wireMat = new THREE.MeshBasicMaterial({
          color,
          wireframe: true,
          transparent: true,
          opacity: 1,
          depthWrite: false,
        });
        wireMaterials.current.set(id, wireMat);
        mesh.material = wireMat;
      }
    });

    return { wireClone: wire, solidClone: solid };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, url]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }

    if (progressRef.current < 1) {
      progressRef.current = Math.min(1, progressRef.current + delta / 2);
      const t = progressRef.current;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      solidMaterials.current.forEach(({ mat }) => {
        if (Array.isArray(mat)) {
          (mat as THREE.Material[]).forEach((m) => { m.opacity = ease; m.needsUpdate = true; });
        } else {
          mat.opacity = ease;
          mat.needsUpdate = true;
        }
      });

      wireMaterials.current.forEach((wireMat) => {
        wireMat.opacity = 1 - ease;
        wireMat.needsUpdate = true;
      });
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={wireClone} />
      <primitive object={solidClone} />
    </group>
  );
}

/* ── Showcase component ── */

export default function FurnitureShowcase({ items }: { items: ShowcaseItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [modelsReady, setModelsReady] = useState(false);
  const { formatPrice } = useCurrency();

  const resolveUrl = (raw: string) =>
    raw.startsWith("/") || raw.startsWith("http") ? raw : `/furnitures/${raw.replace(/^furnitures\//, "")}`;

  // Preload first 3 models before starting carousel
  useEffect(() => {
    if (items.length === 0) return;

    const preloadPromises = items.slice(0, 3).map(
      (item) =>
        new Promise<void>((resolve) => {
          if (!item.file_url) { resolve(); return; }
          useGLTF.preload(resolveUrl(item.file_url));
          setTimeout(resolve, 3000);
        })
    );

    Promise.all(preloadPromises).then(() => setModelsReady(true));

    // Preload remaining in background
    items.slice(3).forEach((item) => {
      if (item.file_url) useGLTF.preload(resolveUrl(item.file_url));
    });
  }, [items]);

  // Only start interval when models are ready
  useEffect(() => {
    if (!modelsReady || items.length <= 1) return;

    const interval = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setTimeout(() => setOpacity(1), 100);
      }, 400);
    }, 5000);

    return () => clearInterval(interval);
  }, [modelsReady, items.length]);

  const currentItem = items[currentIndex];
  if (!currentItem) return null;

  return (
    <div className="max-w-[320px] mx-auto w-full">
      {/* Loading state while preloading */}
      {!modelsReady ? (
        <div
          className="aspect-square border border-border bg-background flex items-center justify-center"
        >
          <div className="w-10 h-px bg-border overflow-hidden relative">
            <div
              className="absolute inset-0 bg-accent"
              style={{ animation: "slide 1s ease-in-out infinite" }}
            />
          </div>
          <style>{`@keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
        </div>
      ) : (
        <div
          className="aspect-square border border-border bg-background overflow-hidden"
          style={{ transition: "opacity 400ms ease", opacity, pointerEvents: "none" }}
        >
          {/* Single persistent Canvas — only the model swaps */}
          <Canvas
            camera={{ position: [0, 0.5, 3], fov: 40 }}
            gl={{ antialias: true, alpha: true }}
            style={{ background: "transparent" }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 5, 3]} intensity={0.8} />
            <directionalLight position={[-3, 2, -2]} intensity={0.3} />
            <Suspense fallback={null}>
              <AutoRotatingModel
                key={currentItem.id}
                url={resolveUrl(currentItem.file_url)}
              />
            </Suspense>
          </Canvas>
        </div>
      )}

      {/* Item info */}
      <div className="mt-4 text-center" style={{ transition: "opacity 400ms ease", opacity: modelsReady ? opacity : 0 }}>
        <p className="font-heading text-[1.1rem] font-normal text-foreground">
          {currentItem.name}
        </p>
        <p className="font-body text-[0.85rem] text-accent mt-1">
          {formatPrice(currentItem.price)}
        </p>
      </div>

      {/* Dot indicators */}
      {items.length > 1 && modelsReady && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setOpacity(0);
                setTimeout(() => {
                  setCurrentIndex(i);
                  setTimeout(() => setOpacity(1), 100);
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
