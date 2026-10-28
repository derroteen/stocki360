"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeToggle";
import WarehousePoster from "./WarehousePoster";
import WarehouseScene from "./WarehouseScene";
import { WAREHOUSE_COLORS } from "./warehouseData";

type WarehouseCanvasProps = {
  phase: number;
  progress: number;
  active: boolean;
  tabVisible: boolean;
  reduced: boolean;
  lowEnd: boolean;
  onContextLost: () => void;
};

function hasWebGLSupport() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!context) return false;
    const loseContext = context.getExtension("WEBGL_lose_context");
    loseContext?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export default function WarehouseCanvas({
  phase,
  progress,
  active,
  tabVisible,
  reduced,
  lowEnd,
  onContextLost,
}: WarehouseCanvasProps) {
  const theme = useTheme();
  const [webglAvailable] = useState(hasWebGLSupport);
  const palette = WAREHOUSE_COLORS[theme];

  useEffect(() => {
    if (!webglAvailable) onContextLost();
  }, [webglAvailable, onContextLost]);

  if (!webglAvailable) {
    return <WarehousePoster />;
  }

  return (
    <>
      <Canvas
        aria-label="Interactive 3D illustration of warehouse stock"
        dpr={[1, 1.5]}
        frameloop={active ? "always" : tabVisible ? "demand" : "never"}
        camera={{ position: [8, 6.5, 9], fov: 40 }}
        gl={{ alpha: true, antialias: !lowEnd, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.domElement.style.touchAction = "pan-y";
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            onContextLost();
          });
        }}
        style={{ position: "absolute", inset: 0, touchAction: "pan-y" }}
      >
        <Suspense fallback={null}>
          <WarehouseScene
            phase={phase}
            progress={progress}
            reduced={reduced}
            palette={palette}
            lowEnd={lowEnd}
          />
        </Suspense>
      </Canvas>
    </>
  );
}
