"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { MeshPhysicalMaterial, Side, Texture } from "three";
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

interface MaterialProps {
  color: string;
  highlight?: boolean;
  map?: Texture | null;
  bumpMap?: Texture | null;
  bumpScale?: number;
  flatShading?: boolean;
  side?: Side;
}

/** PBR material driven by catalog `colorHex` + `finish`. */
export function PartMaterial({ finish, highlight = false, ...rest }: MaterialProps & { finish: Finish }) {
  const ref = usePulse(highlight, 0.1);
  return <meshPhysicalMaterial ref={ref} {...FINISH[finish]} {...rest} emissive={HIGHLIGHT} emissiveIntensity={0} />;
}

/** Urethane / rubber / grip tape. */
export function RubberMaterial({ highlight = false, roughness = 0.6, ...rest }: MaterialProps & { roughness?: number }) {
  const ref = usePulse(highlight, 0.08);
  return (
    <meshPhysicalMaterial
      ref={ref}
      metalness={0}
      roughness={roughness}
      sheen={0.4}
      {...rest}
      emissive={HIGHLIGHT}
      emissiveIntensity={0}
    />
  );
}

/** Small hardware (bolts, axles, plugs). */
export function HardwareMaterial({ color = "#1a1a1a" }: { color?: string }) {
  return <meshStandardMaterial color={color} metalness={1} roughness={0.28} />;
}
