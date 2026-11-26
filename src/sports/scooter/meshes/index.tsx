"use client";

import { RoundedBox } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { MM, type ScooterRig } from "../geometry";
import type { ScooterCategory, ScooterPart } from "../types";
import { PartMaterial, RubberMaterial } from "./PartMaterial";

export interface MeshProps {
  part: ScooterPart;
  rig: ScooterRig;
  highlight?: boolean;
  onSelect?: (category: ScooterCategory) => void;
}

/** Shared pointer handlers so clicking a part in 3D jumps to its selector step. */
function useInteract(category: ScooterCategory, onSelect?: MeshProps["onSelect"]) {
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

const Z_AXIS: [number, number, number] = [Math.PI / 2, 0, 0]; // rotate Y-aligned primitives onto Z

/* ─────────────────────────── Deck (chassis frame) ─────────────────────────── */

export function DeckMesh({ part, rig, highlight, onSelect }: MeshProps) {
  const h = useInteract("deck", onSelect);
  const { start, length, width, thickness, centerY } = rig.deck;
  const top = centerY + thickness / 2;
  const bottom = centerY - thickness / 2;
  const front = start + length;
  const [bx, by] = rig.headtubeBase;
  const tilt = rig.steeringTilt;

  // Neck: a profile from the platform nose up into the headtube, extruded across the deck.
  const neckGeo = useMemo(() => {
    const axis = new THREE.Vector2(-Math.sin(tilt), Math.cos(tilt));
    const rear = new THREE.Vector2(-Math.cos(tilt), -Math.sin(tilt)); // perpendicular, toward rider
    const base = new THREE.Vector2(bx, by);
    const htR = 21 * MM;
    const upper = base.clone().add(axis.clone().multiplyScalar(rig.headtubeLength * 0.85)).add(rear.clone().multiplyScalar(htR * 0.6));
    const lower = base.clone().add(axis.clone().multiplyScalar(rig.headtubeLength * 0.08)).add(rear.clone().multiplyScalar(-htR * 0.4));
    const shape = new THREE.Shape();
    shape.moveTo(front - 60 * MM, bottom);
    shape.lineTo(front - 60 * MM, top);
    shape.quadraticCurveTo(front + 5 * MM, top + 2 * MM, upper.x, upper.y);
    shape.lineTo(lower.x, lower.y);
    shape.quadraticCurveTo(front + 10 * MM, bottom - 4 * MM, front - 60 * MM, bottom);
    const neckWidth = Math.min(width * 0.6, 60 * MM);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: neckWidth,
      bevelEnabled: true,
      bevelThickness: 3 * MM,
      bevelSize: 3 * MM,
      bevelSegments: 3,
      curveSegments: 16,
    });
    geo.translate(0, 0, -neckWidth / 2);
    return geo;
  }, [bx, by, tilt, front, top, bottom, width, rig.headtubeLength]);

  // Brake: a curved fender over the rear wheel.
  const brakeR = rig.wheelRadius + 5 * MM;
  const dropoutZ = rig.wheelWidth / 2 + 7 * MM;

  return (
    <group name="deck" {...h}>
      <RoundedBox
        args={[length, thickness, width]}
        radius={Math.min(thickness, width) * 0.25}
        smoothness={4}
        position={[start + length / 2, centerY, 0]}
        castShadow
        receiveShadow
      >
        <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
      </RoundedBox>

      <mesh geometry={neckGeo} castShadow>
        <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
      </mesh>

      {/* Rear dropouts */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[start / 2 - 6 * MM, centerY / 2 - 2 * MM, s * dropoutZ]} castShadow>
          <boxGeometry args={[start + 36 * MM, 26 * MM, 6 * MM]} />
          <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
        </mesh>
      ))}

      {/* Brake fender (arc from 70° to 160° above/behind the axle) */}
      <mesh rotation={Z_AXIS} castShadow>
        <cylinderGeometry
          args={[brakeR, brakeR, rig.wheelWidth + 10 * MM, 32, 1, true, THREE.MathUtils.degToRad(160), THREE.MathUtils.degToRad(80)]}
        />
        <meshPhysicalMaterial color="#2b2b30" metalness={0.9} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Headtube lives in the steering frame but belongs to the deck part. */
export function HeadtubeMesh({ part, rig, highlight, onSelect }: MeshProps) {
  const h = useInteract("deck", onSelect);
  return (
    <mesh name="headtube" position={[0, rig.headtubeLength / 2, 0]} castShadow {...h}>
      <cylinderGeometry args={[21 * MM, 21 * MM, rig.headtubeLength, 32]} />
      <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
    </mesh>
  );
}

export function GripTapeMesh({ part, rig, highlight, onSelect }: MeshProps) {
  const h = useInteract("griptape", onSelect);
  const { start, length, width, thickness, centerY } = rig.deck;
  const tapeL = Math.min(part.dimensions.length * MM, length - 8 * MM);
  const tapeW = Math.min(part.dimensions.width * MM, width) - 4 * MM;
  return (
    <mesh name="griptape" position={[start + length / 2, centerY + thickness / 2 + 0.6 * MM, 0]} receiveShadow {...h}>
      <boxGeometry args={[tapeL, 1 * MM, tapeW]} />
      <RubberMaterial color={part.colorHex} highlight={highlight} />
    </mesh>
  );
}

/* ─────────────────────────── Steering frame parts ─────────────────────────── */

export function HeadsetMesh({ part, rig, highlight, onSelect }: MeshProps) {
  const h = useInteract("headset", onSelect);
  return (
    <group name="headset" {...h}>
      <mesh position={[0, -rig.stackBottom / 2, 0]} castShadow>
        <cylinderGeometry args={[23 * MM, 22 * MM, rig.stackBottom, 32]} />
        <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
      </mesh>
      <mesh position={[0, rig.headtubeLength + rig.stackTop / 2, 0]} castShadow>
        <cylinderGeometry args={[21 * MM, 23 * MM, rig.stackTop, 32]} />
        <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
      </mesh>
    </group>
  );
}

export function ForkMesh({ part, rig, highlight, onSelect }: MeshProps) {
  const h = useInteract("fork", onSelect);
  const steererR = (part.dimensions.steererDiameter * MM) / 2;
  const steererLen = part.dimensions.steererLength * MM;
  const crownTop = -rig.stackBottom;
  const crownH = 18 * MM;
  const legT = 8 * MM;
  const legDepth = 26 * MM;
  const legZ = rig.wheelWidth / 2 + 4 * MM + legT / 2;
  const legLen = crownTop - crownH - rig.frontAxleY + 12 * MM; // runs a little past the axle
  const legCenterY = crownTop - crownH - legLen / 2 + 6 * MM;
  return (
    <group name="fork" {...h}>
      {/* Steerer runs up through the headtube into the clamp */}
      <mesh position={[0, crownTop + steererLen / 2, 0]}>
        <cylinderGeometry args={[steererR, steererR, steererLen, 24]} />
        <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
      </mesh>
      <RoundedBox args={[34 * MM, crownH, legZ * 2 + legT]} radius={5 * MM} smoothness={3} position={[0, crownTop - crownH / 2, 0]} castShadow>
        <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[legDepth, legLen, legT]} radius={3.5 * MM} smoothness={3} position={[0, legCenterY, s * legZ]} castShadow>
          <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
        </RoundedBox>
      ))}
    </group>
  );
}

export function ClampMesh({ part, rig, highlight, onSelect }: MeshProps) {
  const h = useInteract("clamp", onSelect);
  const r = (part.dimensions.outerDiameter * MM) / 2;
  const height = rig.clampHeight;
  const system = part.compatibility.compression?.[0] ?? "SCS";
  const boltRows = system === "SCS" ? 4 : system === "HIC" ? 3 : 2;
  const boltPositions = Array.from({ length: boltRows }, (_, i) => ((i + 1) / (boltRows + 1)) * height);
  return (
    <group name="clamp" position={[0, rig.clampBase, 0]} {...h}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, height, 40]} />
        <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
      </mesh>
      {/* Bolt boss + bolts on the front of the clamp */}
      <mesh position={[r + 3 * MM, height / 2, 0]} castShadow>
        <boxGeometry args={[10 * MM, height * 0.96, 18 * MM]} />
        <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
      </mesh>
      {boltPositions.map((y) =>
        [-1, 1].map((s) => (
          <mesh key={`${y}-${s}`} position={[r + 3 * MM, y, s * 10 * MM]} rotation={Z_AXIS}>
            <cylinderGeometry args={[3.2 * MM, 3.2 * MM, 4 * MM, 6]} />
            <meshStandardMaterial color="#1a1a1a" metalness={1} roughness={0.25} />
          </mesh>
        )),
      )}
      {system === "SCS" && (
        <mesh position={[0, height + 1.5 * MM, 0]}>
          <cylinderGeometry args={[r * 0.55, r * 0.6, 3 * MM, 24]} />
          <meshStandardMaterial color="#1a1a1a" metalness={1} roughness={0.25} />
        </mesh>
      )}
    </group>
  );
}

export function BarsMesh({ part, rig, highlight, onSelect }: MeshProps) {
  const h = useInteract("bars", onSelect);
  const r = (part.dimensions.outerDiameter * MM) / 2;
  const height = part.dimensions.height * MM;
  const width = part.dimensions.width * MM;
  const crossY = height - r;
  return (
    <group name="bars" position={[0, rig.clampBase, 0]} {...h}>
      <mesh position={[0, crossY / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, crossY, 28]} />
        <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
      </mesh>
      <mesh position={[0, crossY, 0]} rotation={Z_AXIS} castShadow>
        <cylinderGeometry args={[r * 0.92, r * 0.92, width, 28]} />
        <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
      </mesh>
      {/* Gussets */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, crossY - 26 * MM, s * 26 * MM]} rotation={[s * Math.PI / 4, 0, 0]} castShadow>
          <boxGeometry args={[r * 1.1, 78 * MM, 7 * MM]} />
          <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
        </mesh>
      ))}
      {/* mount_grips: child anchor at crossbar ends */}
      <group name="mount_grips" position={[0, crossY, 0]} userData={{ barRadius: r * 0.92, width }} />
    </group>
  );
}

export function GripsMesh({
  part,
  rig,
  bars,
  highlight,
  onSelect,
}: MeshProps & { bars?: ScooterPart }) {
  const h = useInteract("grips", onSelect);
  const barR = ((bars?.dimensions.outerDiameter ?? 34.9) * MM * 0.92) / 2;
  const width = (bars?.dimensions.width ?? 580) * MM;
  const barHeight = (bars?.dimensions.height ?? 600) * MM;
  const len = part.dimensions.length * MM;
  const gripR = Math.max((part.dimensions.outerDiameter * MM) / 2, barR + 3 * MM);
  return (
    <group name="grips" position={[0, rig.clampBase + barHeight - barR / 0.92, 0]} {...h}>
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0, s * (width / 2 - len / 2 + 2 * MM)]}>
          <mesh rotation={Z_AXIS} castShadow>
            <cylinderGeometry args={[gripR, gripR, len, 28]} />
            <RubberMaterial color={part.colorHex} highlight={highlight} />
          </mesh>
          {/* Flange on the inboard end */}
          <mesh position={[0, 0, -s * (len / 2 - 3 * MM)]}>
            <torusGeometry args={[gripR + 1 * MM, 2.2 * MM, 10, 28]} />
            <RubberMaterial color={part.colorHex} highlight={highlight} />
          </mesh>
          {/* Bar-end plug */}
          <mesh position={[0, 0, s * (len / 2 + 1 * MM)]} rotation={Z_AXIS}>
            <cylinderGeometry args={[gripR * 0.9, gripR * 0.9, 3 * MM, 24]} />
            <meshStandardMaterial color="#111" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─────────────────────────────── Wheels ─────────────────────────────── */

export function WheelMesh({
  part,
  rig,
  highlight,
  onSelect,
  axle,
}: MeshProps & { axle?: string }) {
  const h = useInteract("wheels", onSelect);
  const r = rig.wheelRadius;
  const w = rig.wheelWidth;
  const coreR = r * 0.66;

  const tire = useMemo(() => {
    const cr = Math.min(w * 0.42, (r - coreR) * 0.5);
    const pts: THREE.Vector2[] = [new THREE.Vector2(coreR, -w / 2)];
    const arc = (cx: number, cy: number, a0: number, a1: number) => {
      for (let i = 0; i <= 10; i++) {
        const a = a0 + ((a1 - a0) * i) / 10;
        pts.push(new THREE.Vector2(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr));
      }
    };
    arc(r - cr, -w / 2 + cr, -Math.PI / 2, 0);
    arc(r - cr, w / 2 - cr, 0, Math.PI / 2);
    pts.push(new THREE.Vector2(coreR, w / 2));
    pts.push(new THREE.Vector2(coreR, -w / 2));
    return new THREE.LatheGeometry(pts, 64);
  }, [r, w, coreR]);

  const holes = 6;
  const axleR = (axle === "12mm" ? 6 : 4) * MM;
  return (
    <group name="wheel" {...h}>
      <mesh geometry={tire} rotation={Z_AXIS} castShadow receiveShadow>
        <RubberMaterial color={part.secondaryHex ?? "#f2f2ee"} highlight={highlight} />
      </mesh>
      <mesh rotation={Z_AXIS} castShadow>
        <cylinderGeometry args={[coreR + 0.4 * MM, coreR + 0.4 * MM, w * 0.94, 48]} />
        <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
      </mesh>
      {/* Core cut-outs */}
      {Array.from({ length: holes }, (_, i) => {
        const a = (i / holes) * Math.PI * 2;
        return [-1, 1].map((s) => (
          <mesh key={`${i}${s}`} position={[Math.cos(a) * coreR * 0.62, Math.sin(a) * coreR * 0.62, s * w * 0.471]} rotation={Z_AXIS}>
            <cylinderGeometry args={[coreR * 0.2, coreR * 0.2, 0.6 * MM, 20]} />
            <meshStandardMaterial color="#0d0d0f" roughness={0.8} />
          </mesh>
        ));
      })}
      <mesh rotation={Z_AXIS}>
        <cylinderGeometry args={[axleR, axleR, w + 30 * MM, 12]} />
        <meshStandardMaterial color="#9ea3aa" metalness={1} roughness={0.25} />
      </mesh>
    </group>
  );
}
