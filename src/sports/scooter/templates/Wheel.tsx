"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { MM } from "../geometry";
import { resolveStyle } from "../style";
import { HardwareMaterial, PartMaterial, RubberMaterial } from "./PartMaterial";
import { Z_AXIS, useDisposable, useInteract, type TemplateProps } from "./shared";

/** Spoke-shaped window between two spokes (constant spoke width at any radius). */
function sectorHole(rIn: number, rOut: number, a0: number, a1: number, spokeW: number) {
  const pin = (r: number, a: number, side: 1 | -1) => a + side * Math.asin(Math.min(0.99, spokeW / 2 / r));
  const p = new THREE.Path();
  const s0 = pin(rIn, a0, 1);
  const s1 = pin(rIn, a1, -1);
  const o0 = pin(rOut, a0, 1);
  const o1 = pin(rOut, a1, -1);
  p.moveTo(Math.cos(s0) * rIn, Math.sin(s0) * rIn);
  p.lineTo(Math.cos(o0) * rOut, Math.sin(o0) * rOut);
  p.absarc(0, 0, rOut, o0, o1, false);
  p.lineTo(Math.cos(s1) * rIn, Math.sin(s1) * rIn);
  p.absarc(0, 0, rIn, s1, s0, true);
  return p;
}

/**
 * Wheel template: lathe-turned urethane + extruded core.
 * style: core spoked|hollow|solid|fullcore · spokes 3–10 · profile round|flat
 */
export function WheelTemplate({ part, rig, highlight, onSelect, axle }: TemplateProps & { axle?: string }) {
  const h = useInteract("wheels", onSelect);
  const style = resolveStyle("wheels", part.style);
  const r = rig.wheelRadius;
  const w = rig.wheelWidth;
  const coreR = r * (style.core === "fullcore" ? 0.8 : 0.66);
  const axleR = (axle === "12mm" ? 6 : 4) * MM;

  const tire = useDisposable(
    useMemo(() => {
      const cr = Math.min(w * (style.profile === "round" ? 0.45 : 0.2), (r - coreR) * 0.6);
      const pts: THREE.Vector2[] = [new THREE.Vector2(coreR, -w / 2)];
      const arc = (cx: number, cy: number, a0: number, a1: number) => {
        for (let i = 0; i <= 12; i++) {
          const a = a0 + ((a1 - a0) * i) / 12;
          pts.push(new THREE.Vector2(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr));
        }
      };
      arc(r - cr, -w / 2 + cr, -Math.PI / 2, 0);
      arc(r - cr, w / 2 - cr, 0, Math.PI / 2);
      pts.push(new THREE.Vector2(coreR, w / 2), new THREE.Vector2(coreR, -w / 2));
      return new THREE.LatheGeometry(pts, 72);
    }, [r, w, coreR, style.profile]),
  );

  const core = useDisposable(
    useMemo(() => {
      const depth = w * 0.86;
      const bevel = 1.5 * MM;
      const shape = new THREE.Shape();
      shape.absarc(0, 0, coreR, 0, Math.PI * 2, false);
      const bore = new THREE.Path();
      bore.absarc(0, 0, axleR + 1 * MM, 0, Math.PI * 2, true);
      shape.holes.push(bore);
      const n = style.spokes;
      if (style.core === "spoked") {
        const hubR = Math.max(15 * MM, coreR * 0.32);
        const rimR = coreR - 5 * MM;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2;
          shape.holes.push(sectorHole(hubR, rimR, a0, a0 + (Math.PI * 2) / n, 6 * MM));
        }
      } else if (style.core === "hollow" || style.core === "fullcore") {
        const ringR = (coreR + 14 * MM) / 2;
        const holeR = Math.min(((Math.PI * ringR) / n) * 0.62, (coreR - 14 * MM) * 0.42);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const p = new THREE.Path();
          p.absarc(Math.cos(a) * ringR, Math.sin(a) * ringR, holeR, 0, Math.PI * 2, true);
          shape.holes.push(p);
        }
      }
      const g = new THREE.ExtrudeGeometry(shape, {
        depth: depth - bevel * 2,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel * 0.6,
        bevelSegments: 2,
        curveSegments: 40,
      });
      g.translate(0, 0, -(depth - bevel * 2) / 2);
      return g;
    }, [w, coreR, axleR, style.core, style.spokes]),
  );

  return (
    <group name="wheel" {...h}>
      <mesh geometry={tire} rotation={Z_AXIS} castShadow receiveShadow>
        <RubberMaterial color={part.secondaryHex ?? "#f2f2ee"} highlight={highlight} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={core} castShadow>
        <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
      </mesh>
      {/* Bearings + axle */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0, s * (w * 0.43 - 2 * MM)]} rotation={Z_AXIS}>
          <cylinderGeometry args={[11 * MM, 11 * MM, 4 * MM, 24]} />
          <HardwareMaterial color="#3a3d42" />
        </mesh>
      ))}
      <mesh rotation={Z_AXIS}>
        <cylinderGeometry args={[axleR, axleR, w + 30 * MM, 16]} />
        <HardwareMaterial color="#9ea3aa" />
      </mesh>
    </group>
  );
}
