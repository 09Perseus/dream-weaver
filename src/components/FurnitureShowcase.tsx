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

/* ── Auto-rotating 3D model with wireframe-to-solid crossfade ── */

function AutoRotatingModel({ url, revealKey }: { url: string; revealKey: number }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const solidMaterials = useRef<Map<string, { mat: THREE.Material; original: THREE.Material }>>(new Map());
  const wireMaterials = useRef<Map<string, THREE.MeshBasicMaterial>>(new Map());

  // Clone and normalize the scene, create both wireframe + solid layers
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

    // Solid clone — starts fully transparent, fades in
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

    // Wireframe clone — starts fully visible, fades out
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
  }, [scene, revealKey]);

  useFrame((_, delta) => {
    // Rotate both clones together
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }

    // Crossfade: wireframe out, solid in over ~2s
    if (progressRef.current < 1) {
      progressRef.current = Math.min(1, progressRef.current + delta / 2);
      const t = progressRef.current;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      // Fade solid materials in
      solidMaterials.current.forEach(({ mat }) => {
        if (Array.isArray(mat)) {
          (mat as THREE.Material[]).forEach((m) => { m.opacity = ease; m.needsUpdate = true; });
        } else {
          mat.opacity = ease;
          mat.needsUpdate = true;
        }
      });

      // Fade wireframe materials out
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
            <AutoRotatingModel url={currentItem.file_url} revealKey={currentIndex} />
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
