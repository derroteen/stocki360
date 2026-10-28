"use client";

import dynamic from "next/dynamic";

const Warehouse3D = dynamic(() => import("./Warehouse3D"), {
  ssr: false,
});

export default function Warehouse3DBoundary() {
  return <Warehouse3D />;
}
