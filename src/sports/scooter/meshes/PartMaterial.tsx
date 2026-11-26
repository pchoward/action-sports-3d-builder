"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { MeshPhysicalMaterial } from "three";
import type { Finish } from "@/core/types";

const FINISH: Record<
  Finish,
  { metalness: number; roughness: number; clearcoat?: number; clearcoatRoughness?: number }
> = {
  gloss: { metalness: 0.15, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06 },
  matte: { metalness: 0.2, roughness: 0.72 },
  anodized: { metalness: 0.88, roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.25 },
  raw: { metalness: 1, roughness: 0.34 },
};

const HIGHLIGHT = "#3b82f6";

/** Gentle emissive pulse on the part whose slot is active in the selector. */
function usePulse(highlight: boolean, peak: number) {
  const ref = useRef<MeshPhysicalMaterial>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.emissiveIntensity = highlight ? peak * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 3)) : 0;
  });
  return ref;
}

/** PBR material driven by catalog `colorHex` + `finish`. */
export function PartMaterial({
  color,
  finish,
  highlight = false,
}: {
  color: string;
  finish: Finish;
  highlight?: boolean;
}) {
  const ref = usePulse(highlight, 0.1);
  return <meshPhysicalMaterial ref={ref} color={color} {...FINISH[finish]} emissive={HIGHLIGHT} emissiveIntensity={0} />;
}

export function RubberMaterial({ color, highlight = false }: { color: string; highlight?: boolean }) {
  const ref = usePulse(highlight, 0.08);
  return (
    <meshPhysicalMaterial
      ref={ref}
      color={color}
      metalness={0}
      roughness={0.6}
      sheen={0.4}
      emissive={HIGHLIGHT}
      emissiveIntensity={0}
    />
  );
}
