"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { MM } from "../geometry";
import { resolveStyle } from "../style";
import { HardwareMaterial, PartMaterial } from "./PartMaterial";
import {
  Z_AXIS,
  contrastOn,
  roundedRect,
  useCanvasTexture,
  useDisposable,
  useInteract,
  type TemplateProps,
} from "./shared";

const BEVEL = 2 * MM;
const PLATE = 7 * MM; // boxless top plate thickness

/** Extrudes a plan-view (XZ) outline upward from `bottom` by `height`. */
function extrudeUp(shape: THREE.Shape, bottom: number, height: number, bevel = BEVEL) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(height - bevel * 2, 0.0005),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 20,
  });
  geo.rotateX(-Math.PI / 2); // extrusion → +Y, shape Y → -Z
  geo.translate(0, bottom + bevel, 0);
  return geo;
}

/**
 * Deck template.
 * style: body box|boxless · nose square|rounded · neck solid|cutout|double ·
 *        brake fender|flex · sideSlots 0–4 · sideText
 */
export function DeckTemplate({ part, rig, highlight, onSelect }: TemplateProps) {
  const h = useInteract("deck", onSelect);
  const style = resolveStyle("deck", part.style);
  const { start, length, width, thickness, centerY } = rig.deck;
  const top = centerY + thickness / 2;
  const bottom = centerY - thickness / 2;
  const front = start + length;
  const halfW = width / 2;
  const noseR = style.nose === "rounded" ? halfW * 0.85 : 8 * MM;
  const mat = <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />;

  /* Platform */
  const body = useDisposable(
    useMemo(() => {
      const outline = roundedRect(start + BEVEL, front - BEVEL, -halfW + BEVEL, halfW - BEVEL, noseR) as THREE.Shape;
      if (style.body === "box") return extrudeUp(outline, bottom, thickness);
      return extrudeUp(outline, top - PLATE, PLATE, 1.5 * MM);
    }, [style.body, start, front, halfW, noseR, top, bottom, thickness]),
  );
  const rails = useDisposable(
    useMemo(() => {
      if (style.body !== "boxless") return null;
      const ring = roundedRect(start + BEVEL, front - BEVEL, -halfW + BEVEL, halfW - BEVEL, noseR) as THREE.Shape;
      const inset = 11 * MM;
      ring.holes.push(roundedRect(start + inset, front - inset, -halfW + inset, halfW - inset, noseR - inset, new THREE.Path()));
      return extrudeUp(ring, bottom, thickness - PLATE, 1.5 * MM);
    }, [style.body, start, front, halfW, noseR, bottom, thickness]),
  );

  /* Neck: profile from platform nose into the headtube, extruded across the deck */
  const [bx, by] = rig.headtubeBase;
  const tilt = rig.steeringTilt;
  const neckWidth = Math.min(width * 0.6, 60 * MM);
  const neckGeos = useDisposable(
    useMemo(() => {
      const axis = new THREE.Vector2(-Math.sin(tilt), Math.cos(tilt));
      const rear = new THREE.Vector2(-Math.cos(tilt), -Math.sin(tilt));
      const base = new THREE.Vector2(bx, by);
      const htR = 21 * MM;
      const upper = base.clone().add(axis.clone().multiplyScalar(rig.headtubeLength * 0.85)).add(rear.clone().multiplyScalar(htR * 0.6));
      const lower = base.clone().add(axis.clone().multiplyScalar(rig.headtubeLength * 0.08)).add(rear.clone().multiplyScalar(-htR * 0.4));
      const makeShape = (withHole: boolean) => {
        const s = new THREE.Shape();
        s.moveTo(front - 60 * MM, bottom);
        s.lineTo(front - 60 * MM, top);
        s.quadraticCurveTo(front + 5 * MM, top + 2 * MM, upper.x, upper.y);
        s.lineTo(lower.x, lower.y);
        s.quadraticCurveTo(front + 10 * MM, bottom - 4 * MM, front - 60 * MM, bottom);
        if (withHole) {
          const cx = (front + upper.x + lower.x) / 3 + 4 * MM;
          const cy = (top + upper.y + lower.y) / 3;
          const hole = new THREE.Path();
          hole.absellipse(cx, cy, 9 * MM, 14 * MM, 0, Math.PI * 2, false, -tilt);
          s.holes.push(hole);
        }
        return s;
      };
      const extrude = (shape: THREE.Shape, depth: number, z: number) => {
        const g = new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: true,
          bevelThickness: 2.5 * MM,
          bevelSize: 2.5 * MM,
          bevelSegments: 3,
          curveSegments: 20,
        });
        g.translate(0, 0, z - depth / 2);
        return g;
      };
      if (style.neck === "double") {
        const plate = 10 * MM;
        const shape = makeShape(false);
        return [extrude(shape, plate, -(neckWidth / 2 - plate / 2)), extrude(shape, plate, neckWidth / 2 - plate / 2)];
      }
      return [extrude(makeShape(style.neck === "cutout"), neckWidth, 0)];
    }, [style.neck, bx, by, tilt, front, top, bottom, neckWidth, rig.headtubeLength]),
  );

  /* Brakes */
  const flexBrake = useDisposable(
    useMemo(() => {
      if (style.brake !== "flex") return null;
      const r = rig.wheelRadius;
      const t = 3.5 * MM;
      const a = new THREE.Vector2(start + 12 * MM, top);
      const b = new THREE.Vector2(start * 0.35, r + 4.5 * MM);
      const c = new THREE.Vector2(-r * 0.55, r + 1.5 * MM);
      const s = new THREE.Shape([a, b, c, new THREE.Vector2(c.x, c.y - t), new THREE.Vector2(b.x, b.y - t), new THREE.Vector2(a.x, a.y - t)]);
      const depth = Math.min(width * 0.75, rig.wheelWidth + 24 * MM);
      const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 1 * MM, bevelSize: 1 * MM, bevelSegments: 2 });
      g.translate(0, 0, -depth / 2);
      return g;
    }, [style.brake, rig.wheelRadius, rig.wheelWidth, start, top, width]),
  );
  const fenderR = rig.wheelRadius + 5 * MM;
  const dropoutZ = rig.wheelWidth / 2 + 7 * MM;

  /* Side graphics */
  const textColor = contrastOn(part.colorHex);
  const sideText = useCanvasTexture(
    1024,
    128,
    (ctx, w, hgt) => {
      ctx.clearRect(0, 0, w, hgt);
      ctx.fillStyle = textColor;
      ctx.font = `900 ${hgt * 0.72}px system-ui, Arial Black, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.letterSpacing = "6px";
      ctx.fillText(part.brand.toUpperCase(), w / 2, hgt * 0.54, w * 0.96);
    },
    [part.brand, textColor],
  );
  const sideHeight = style.body === "box" ? thickness : thickness - PLATE;
  const sideY = style.body === "box" ? centerY : bottom + sideHeight / 2;
  const slotGeo = useDisposable(
    useMemo(() => {
      if (!style.sideSlots) return null;
      const span = length * 0.32;
      const w = (span / style.sideSlots) * 0.68;
      const hh = sideHeight * 0.42;
      return new THREE.ShapeGeometry(roundedRect(-w / 2, w / 2, -hh / 2, hh / 2, hh / 2) as THREE.Shape, 12);
    }, [style.sideSlots, length, sideHeight]),
  );
  const slotXs = Array.from({ length: style.sideSlots }, (_, i) => start + length * (0.56 + (0.32 * (i + 0.5)) / style.sideSlots));

  return (
    <group name="deck" {...h}>
      <mesh geometry={body} castShadow receiveShadow>
        {mat}
      </mesh>
      {rails && (
        <mesh geometry={rails} castShadow>
          {mat}
        </mesh>
      )}
      {neckGeos.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          {mat}
        </mesh>
      ))}

      {[-1, 1].map((s) => (
        <group key={s} position={[0, sideY, s * (halfW + 0.4 * MM)]} rotation={[0, s < 0 ? Math.PI : 0, 0]}>
          {style.sideText && sideText && (
            <mesh position={[s * (start + length * 0.28), 0, 0]}>
              <planeGeometry args={[length * 0.34, sideHeight * 0.55]} />
              <meshStandardMaterial map={sideText} transparent roughness={0.5} metalness={0.2} depthWrite={false} />
            </mesh>
          )}
          {slotGeo &&
            slotXs.map((x) => (
              <mesh key={x} geometry={slotGeo} position={[s * x, 0, 0]}>
                <meshStandardMaterial color="#09090b" roughness={0.85} />
              </mesh>
            ))}
        </group>
      ))}

      {/* Rear dropouts */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[start / 2 - 6 * MM, centerY / 2 - 2 * MM, s * dropoutZ]} castShadow>
          <boxGeometry args={[start + 36 * MM, 26 * MM, 6 * MM]} />
          {mat}
        </mesh>
      ))}

      {style.brake === "fender" ? (
        <mesh rotation={Z_AXIS} castShadow>
          <cylinderGeometry
            args={[fenderR, fenderR, rig.wheelWidth + 10 * MM, 32, 1, true, THREE.MathUtils.degToRad(160), THREE.MathUtils.degToRad(80)]}
          />
          <meshPhysicalMaterial color="#2b2b30" metalness={0.9} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
      ) : (
        flexBrake && (
          <mesh geometry={flexBrake} castShadow>
            <HardwareMaterial color="#2b2b30" />
          </mesh>
        )
      )}
    </group>
  );
}

/** Headtube lives in the steering frame but belongs to the deck part. */
export function HeadtubeTemplate({ part, rig, highlight, onSelect }: TemplateProps) {
  const h = useInteract("deck", onSelect);
  const r = 21 * MM;
  return (
    <group name="headtube" {...h}>
      <mesh position={[0, rig.headtubeLength / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, rig.headtubeLength, 40]} />
        <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
      </mesh>
      {[1.5 * MM, rig.headtubeLength - 1.5 * MM].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[r + 1.8 * MM, r + 1.8 * MM, 3 * MM, 40]} />
          <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />
        </mesh>
      ))}
    </group>
  );
}
