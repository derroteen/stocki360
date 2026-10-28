"use client";

import { forwardRef, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  WAREHOUSE_BOX_SLOTS,
  type WAREHOUSE_COLORS,
} from "./warehouseData";

type Palette = (typeof WAREHOUSE_COLORS)[keyof typeof WAREHOUSE_COLORS];

type WarehouseSceneProps = {
  phase: number;
  progress: number;
  reduced: boolean;
  palette: Palette;
  lowEnd: boolean;
};

export default function WarehouseScene({
  phase,
  progress,
  reduced,
  palette,
  lowEnd,
}: WarehouseSceneProps) {
  const boxesRef = useRef<THREE.InstancedMesh>(null);
  const shelvesRef = useRef<THREE.InstancedMesh>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const checkRef = useRef<THREE.Group>(null);
  const sceneRef = useRef<THREE.Group>(null);
  const workingObject = useMemo(() => new THREE.Object3D(), []);
  const workingColor = useMemo(() => new THREE.Color(), []);
  const boxGeometry = useMemo(() => new THREE.BoxGeometry(0.5, 0.38, 0.4), []);
  const boxMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: palette.cardboard, roughness: 0.86 }),
    [palette.cardboard],
  );
  const shelfGeometry = useMemo(() => new THREE.BoxGeometry(3.7, 0.1, 0.09), []);
  const shelfMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: palette.rack, roughness: 0.75 }),
    [palette.rack],
  );

  useFrame(({ clock }) => {
    const boxes = boxesRef.current;
    const shelves = shelvesRef.current;
    if (!boxes || !shelves) return;

    const slots = lowEnd ? WAREHOUSE_BOX_SLOTS.slice(0, 30) : WAREHOUSE_BOX_SLOTS;
    const count = slots.length;
    const startingStock = phase === 0 ? 0 : phase === 1 ? 34 : phase === 2 ? 18 : 28;
    const revealAmount = progress * count;
    const changingStock =
      phase === 0
        ? reduced
          ? Math.min(count, 30)
          : Math.floor(progress * count)
        : phase === 1
          ? Math.floor(34 - Math.max(0, progress - 0.45) * 18)
          : phase === 3
            ? Math.floor(28 + Math.min(1, Math.max(0, (progress - 0.25) / 0.5)) * 14)
            : startingStock;
    const visibleBoxes = Math.min(count, Math.max(0, changingStock));

    for (let index = 0; index < count; index += 1) {
      const slot = slots[index];
      const isVisible =
        phase === 0 && !reduced
          ? index < Math.ceil(revealAmount)
          : index < visibleBoxes;
      const revealScale =
        phase === 0 && !reduced
          ? Math.min(1, Math.max(0.08, revealAmount - index))
          : 1;
      const isHighlightedBox = slot.rack === 1 && slot.level === 0;
      const isLowStockBox = phase === 2 && isHighlightedBox;
      const pulse = isLowStockBox ? 1 + Math.sin(clock.elapsedTime * 5) * 0.09 : 1;
      workingObject.position.set(
        slot.x,
        isVisible ? slot.y - (phase === 0 ? (1 - revealScale) * 0.2 : 0) : -5,
        slot.z,
      );
      workingObject.scale.set(pulse * revealScale, pulse * revealScale, pulse * revealScale);
      workingObject.rotation.set(0, 0, 0);
      workingObject.updateMatrix();
      boxes.setMatrixAt(index, workingObject.matrix);
      workingColor.set(
        isLowStockBox
          ? palette.amber
          : phase === 3 && isHighlightedBox
            ? palette.green
            : index % 3 === 0
              ? palette.cardboardLight
              : palette.cardboard,
      );
      boxes.setColorAt(index, workingColor);
    }

    const deliveryStart = phase === 1 ? 0.08 : 0.35;
    const deliveryProgress =
      phase === 1
        ? Math.min(1, Math.max(0, progress / deliveryStart))
        : phase === 3
          ? Math.min(1, Math.max(0, (progress - 0.12) / 0.55))
          : 0;
    const deliveryCount = phase === 1 || phase === 3 ? 5 : 0;
    for (let index = 0; index < 6; index += 1) {
      const visible = index < deliveryCount && deliveryProgress < 1;
      const travel = THREE.MathUtils.smoothstep(deliveryProgress, 0, 1);
      workingObject.position.set(
        THREE.MathUtils.lerp(3.9, 0.55, travel),
        visible ? 0.42 + Math.floor(index / 3) * 0.42 : -5,
        1.9 + (index % 3) * 0.48,
      );
      workingObject.scale.setScalar(visible ? 1 : 0);
      workingObject.updateMatrix();
      boxes.setMatrixAt(count + index, workingObject.matrix);
      workingColor.set(phase === 3 ? palette.green : palette.cardboardLight);
      boxes.setColorAt(count + index, workingColor);
    }
    boxes.count = count + 6;
    boxes.instanceMatrix.needsUpdate = true;
    if (boxes.instanceColor) boxes.instanceColor.needsUpdate = true;

    let shelfIndex = 0;
    for (let rack = 0; rack < 3; rack += 1) {
      const z = -1.65 + rack * 1.65;
      for (const x of [-1.85, 1.85]) {
        workingObject.position.set(x, 1.12, z);
        workingObject.scale.set(0.025, 21.5, 1);
        workingObject.updateMatrix();
        shelves.setMatrixAt(shelfIndex++, workingObject.matrix);
      }
      for (const y of [0.2, 0.88, 1.56, 2.24]) {
        workingObject.position.set(0, y, z);
        workingObject.scale.set(1, 0.55, 8);
        workingObject.updateMatrix();
        shelves.setMatrixAt(shelfIndex++, workingObject.matrix);
      }
      workingObject.scale.set(1, 1, 1);
    }
    shelves.count = shelfIndex;
    shelves.instanceMatrix.needsUpdate = true;

    if (sceneRef.current && !reduced && !lowEnd) {
      sceneRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.22) * 0.045;
      sceneRef.current.position.y = Math.sin(clock.elapsedTime * 0.45) * 0.025;
    }
    if (markerRef.current) {
      markerRef.current.visible = phase === 2;
      markerRef.current.position.y = 2.8 + (phase === 2 ? Math.sin(clock.elapsedTime * 3) * 0.12 : 0);
      markerRef.current.rotation.y = clock.elapsedTime * 0.4;
      (markerRef.current.material as THREE.MeshStandardMaterial).color.set(
        palette.amber,
      );
    }
    if (checkRef.current) {
      checkRef.current.visible = phase === 3;
      checkRef.current.position.y = 2.8;
    }
  });

  const shelfCount = 18;

  return (
    <group ref={sceneRef}>
      <ambientLight intensity={1.6} />
      <directionalLight position={[5, 8, 6]} intensity={2.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow={false}>
        <planeGeometry args={[10, 7]} />
        <meshStandardMaterial color={palette.floor} roughness={1} />
      </mesh>
      <gridHelper args={[10, 20, palette.floorLine, palette.floorLine]} position={[0, -0.015, 0]} />
      <InstancedMeshWrapper
        ref={shelvesRef}
        count={shelfCount}
        geometry={shelfGeometry}
        material={shelfMaterial}
      />
      <InstancedMeshWrapper
        ref={boxesRef}
        count={lowEnd ? 36 : 60}
        geometry={boxGeometry}
        material={boxMaterial}
      />
      <mesh position={[4.15, 0.12, 1.9]}>
        <boxGeometry args={[1.1, 0.24, 2.2]} />
        <meshStandardMaterial color={palette.loading} roughness={0.9} />
      </mesh>
      <mesh ref={markerRef} position={[0, 2.8, 0]} visible={false}>
        <octahedronGeometry args={[0.24]} />
        <meshStandardMaterial color={palette.amber} emissive={palette.amber} emissiveIntensity={0.22} />
      </mesh>
      <group ref={checkRef} position={[0, 2.8, 0]} visible={false}>
        <mesh position={[-0.08, -0.02, 0]} rotation={[0, 0, -0.72]}>
          <boxGeometry args={[0.09, 0.32, 0.09]} />
          <meshStandardMaterial color={palette.green} />
        </mesh>
        <mesh position={[0.09, 0.04, 0]} rotation={[0, 0, 0.68]}>
          <boxGeometry args={[0.09, 0.52, 0.09]} />
          <meshStandardMaterial color={palette.green} />
        </mesh>
      </group>
    </group>
  );
}

const InstancedMeshWrapper = forwardRef<
  THREE.InstancedMesh,
  {
    count: number;
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
  }
>(function InstancedMeshWrapper({ count, geometry, material }, ref) {
  return <instancedMesh ref={ref} args={[geometry, material, count]} />;
});
