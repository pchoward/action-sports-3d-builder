"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { MM } from "../geometry";
import { resolveStyle } from "../style";
import { HardwareMaterial, PartMaterial } from "./PartMaterial";
import { Z_AXIS, useDisposable, useInteract, type TemplateProps } from "./shared";

/* ───────────────────────────── Headset ───────────────────────────── */

export function HeadsetTemplate({ part, rig, highlight, onSelect }: TemplateProps) {
  const h = useInteract("headset", onSelect);
  const mat = <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />;
  return (
    <group name="headset" {...h}>
      <mesh position={[0, -rig.stackBottom / 2, 0]} castShadow>
        <cylinderGeometry args={[23.5 * MM, 22 * MM, rig.stackBottom, 40]} />
        {mat}
      </mesh>
      <mesh position={[0, rig.headtubeLength + rig.stackTop / 2, 0]} castShadow>
        <cylinderGeometry args={[21 * MM, 23.5 * MM, rig.stackTop, 40]} />
        {mat}
      </mesh>
    </group>
  );
}

/* ─────────────────────────────── Fork ─────────────────────────────── */

const CROWN_H = 18 * MM;

/**
 * Fork template.
 * style: legs straight|tapered · cutouts
 */
export function ForkTemplate({ part, rig, highlight, onSelect }: TemplateProps) {
  const h = useInteract("fork", onSelect);
  const style = resolveStyle("fork", part.style);
  const steererR = (part.dimensions.steererDiameter * MM) / 2;
  const steererLen = part.dimensions.steererLength * MM;
  const crownTop = -rig.stackBottom;
  const legT = 8 * MM;
  const legZ = rig.wheelWidth / 2 + 4 * MM + legT / 2;
  const legLen = Math.max(part.dimensions.legLength * MM - CROWN_H, 20 * MM);

  // Leg profile in XY: top at y=0 (under crown), axle at y=-legLen, extruded in Z.
  const leg = useDisposable(
    useMemo(() => {
      const wTop = style.legs === "tapered" ? 32 * MM : 24 * MM;
      const rb = (style.legs === "tapered" ? 18 * MM : 24 * MM) / 2 + 2 * MM;
      const s = new THREE.Shape();
      s.moveTo(-wTop / 2, 0);
      s.lineTo(wTop / 2, 0);
      s.lineTo(rb, -legLen);
      s.absarc(0, -legLen, rb, 0, -Math.PI, true);
      s.lineTo(-wTop / 2, 0);
      if (style.cutouts) {
        const hw = Math.min(wTop, rb * 2) * 0.22;
        const slot = new THREE.Path();
        slot.absarc(0, -legLen * 0.2, hw, 0, Math.PI, false);
        slot.absarc(0, -legLen * 0.62, hw, Math.PI, Math.PI * 2, false);
        s.holes.push(slot);
      }
      const g = new THREE.ExtrudeGeometry(s, {
        depth: legT - 3 * MM,
        bevelEnabled: true,
        bevelThickness: 1.5 * MM,
        bevelSize: 1.5 * MM,
        bevelSegments: 3,
        curveSegments: 24,
      });
      g.translate(0, 0, -(legT - 3 * MM) / 2);
      return g;
    }, [style.legs, style.cutouts, legLen, legT]),
  );
  const mat = <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />;

  return (
    <group name="fork" {...h}>
      <mesh position={[0, crownTop + steererLen / 2, 0]}>
        <cylinderGeometry args={[steererR, steererR, steererLen, 24]} />
        {mat}
      </mesh>
      <RoundedBox args={[36 * MM, CROWN_H, legZ * 2 + legT]} radius={5 * MM} smoothness={3} position={[0, crownTop - CROWN_H / 2, 0]} castShadow>
        {mat}
      </RoundedBox>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={leg} position={[0, crownTop - CROWN_H, s * legZ]} castShadow>
          {mat}
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────────────────────── Clamp ─────────────────────────────── */

const AUTO_BOLTS = { SCS: 4, HIC: 3, IHC: 2 } as const;

/**
 * Clamp template.
 * style: shape round|faceted · bolts 0(auto)–4 · slit
 */
export function ClampTemplate({ part, rig, highlight, onSelect }: TemplateProps) {
  const h = useInteract("clamp", onSelect);
  const style = resolveStyle("clamp", part.style);
  const r = (part.dimensions.outerDiameter * MM) / 2;
  const height = rig.clampHeight;
  const system = part.compatibility.compression?.[0] ?? "SCS";
  const bolts = style.bolts || AUTO_BOLTS[system];
  const faceted = style.shape === "faceted";
  const boltYs = Array.from({ length: bolts }, (_, i) => ((i + 1) / (bolts + 1)) * height);
  const mat = <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} flatShading={faceted} />;
  return (
    <group name="clamp" position={[0, rig.clampBase, 0]} {...h}>
      <mesh position={[0, height / 2, 0]} rotation={[0, faceted ? Math.PI / 8 : 0, 0]} castShadow>
        <cylinderGeometry args={[r, r, height, faceted ? 8 : 48]} />
        {mat}
      </mesh>
      {/* Bolt boss on the front */}
      <mesh position={[r + 3 * MM, height / 2, 0]} castShadow>
        <boxGeometry args={[12 * MM, height * 0.96, 22 * MM]} />
        {mat}
      </mesh>
      {style.slit && (
        <mesh position={[r + 9.1 * MM, height / 2, 0]}>
          <boxGeometry args={[0.4 * MM, height * 0.97, 1.4 * MM]} />
          <meshStandardMaterial color="#050505" />
        </mesh>
      )}
      {boltYs.map((y) =>
        [-1, 1].map((s) => (
          <mesh key={`${y}-${s}`} position={[r + 4 * MM, y, s * 12.2 * MM]} rotation={Z_AXIS}>
            <cylinderGeometry args={[3.4 * MM, 3.4 * MM, 2.5 * MM, 6]} />
            <HardwareMaterial />
          </mesh>
        )),
      )}
      {system === "SCS" && (
        <mesh position={[0, height + 1.5 * MM, 0]}>
          <cylinderGeometry args={[r * 0.55, r * 0.6, 3 * MM, 24]} />
          <HardwareMaterial />
        </mesh>
      )}
    </group>
  );
}
