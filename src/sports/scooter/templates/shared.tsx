"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import type { ScooterRig } from "../geometry";
import type { ScooterCategory, ScooterPart } from "../types";

export interface TemplateProps {
  part: ScooterPart;
  rig: ScooterRig;
  highlight?: boolean;
  onSelect?: (category: ScooterCategory) => void;
}

/** Rotates Y-aligned primitives (cylinders, lathes) onto the Z axis. */
export const Z_AXIS: [number, number, number] = [Math.PI / 2, 0, 0];

/** Pointer handlers so clicking a part in 3D jumps to its selector step. */
export function useInteract(category: ScooterCategory, onSelect?: TemplateProps["onSelect"]) {
  return useMemo(
    () => ({
      onClick: (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect?.(category);
      },
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      },
      onPointerOut: () => {
        document.body.style.cursor = "";
      },
    }),
    [category, onSelect],
  );
}

/** A cylinder between two points — tubes, struts, arms. */
export function Strut({
  from,
  to,
  radius,
  segments = 24,
  children,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  radius: number;
  segments?: number;
  children: ReactNode;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const dir = to.clone().sub(from);
    return {
      length: dir.length(),
      position: from.clone().add(to).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
    };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, segments]} />
      {children}
    </mesh>
  );
}

/** Disposes a geometry/texture when it's replaced or unmounted. */
type Disposable = { dispose(): void };
export function useDisposable<T extends Disposable | Disposable[] | null>(value: T): T {
  useEffect(
    () => () => {
      if (Array.isArray(value)) value.forEach((v) => v.dispose());
      else value?.dispose();
    },
    [value],
  );
  return value;
}

/** Procedurally drawn texture (brand text, grip patterns, bump maps). */
export function useCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  deps: unknown[],
  { srgb = true, repeat }: { srgb?: boolean; repeat?: [number, number] } = {},
) {
  // `draw` is a fresh closure each render; redraw only when the inputs it uses change.
  const key = JSON.stringify([width, height, deps, srgb, repeat]);
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    draw(ctx, width, height);
    const t = new THREE.CanvasTexture(canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    if (repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(...repeat);
    }
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return useDisposable(tex);
}

/** Black or white, whichever reads better on `hex`. */
export function contrastOn(hex: string) {
  const c = new THREE.Color(hex);
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return lum > 0.45 ? "#111111" : "#f4f4f4";
}

/** Mix `hex` toward white (amt>0) or black (amt<0). */
export function tint(hex: string, amt: number) {
  const c = new THREE.Color(hex);
  return "#" + c.lerp(new THREE.Color(amt > 0 ? "#ffffff" : "#000000"), Math.abs(amt)).getHexString();
}

/** Rounded-rectangle outline in the XY plane. */
export function roundedRect(x0: number, x1: number, y0: number, y1: number, r: number, path: THREE.Path = new THREE.Shape()) {
  const rr = Math.max(0.0005, Math.min(r, (x1 - x0) / 2 - 1e-5, (y1 - y0) / 2 - 1e-5));
  path.moveTo(x0 + rr, y0);
  path.lineTo(x1 - rr, y0);
  path.absarc(x1 - rr, y0 + rr, rr, -Math.PI / 2, 0, false);
  path.lineTo(x1, y1 - rr);
  path.absarc(x1 - rr, y1 - rr, rr, 0, Math.PI / 2, false);
  path.lineTo(x0 + rr, y1);
  path.absarc(x0 + rr, y1 - rr, rr, Math.PI / 2, Math.PI, false);
  path.lineTo(x0, y0 + rr);
  path.absarc(x0 + rr, y0 + rr, rr, Math.PI, Math.PI * 1.5, false);
  return path;
}
