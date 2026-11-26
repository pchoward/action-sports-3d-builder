"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { MM } from "../geometry";
import { resolveStyle } from "../style";
import type { ScooterPart } from "../types";
import { PartMaterial, RubberMaterial } from "./PartMaterial";
import { Strut, useCanvasTexture, useDisposable, useInteract, type TemplateProps } from "./shared";

/**
 * Pure bar layout (bars frame: origin at bar base on the steering axis).
 * Shared by the bars and grips templates so grips always follow the crossbar.
 */
export function barLayout(bars: ScooterPart | undefined) {
  const style = resolveStyle("bars", bars?.style);
  const od = (bars?.dimensions.outerDiameter ?? 34.9) * MM;
  const r = od / 2;
  const crossR = r * 0.9;
  const height = (bars?.dimensions.height ?? 600) * MM;
  const width = (bars?.dimensions.width ?? 580) * MM;
  const crossY = height - crossR;
  const q = width / 4;
  const back = -q * Math.tan(THREE.MathUtils.degToRad(style.backsweep));
  const up = q * Math.tan(THREE.MathUtils.degToRad(style.upsweep));
  const end = (s: number) => new THREE.Vector3(back, crossY + up, s * (width / 2));
  const knee = (s: number) => new THREE.Vector3(0, crossY, s * q);
  /** Grip anchor on side s: centre + outward axis along the end segment. */
  const gripAnchor = (s: number, gripLen: number) => {
    const dir = end(s).sub(knee(s)).normalize();
    return { center: end(s).sub(dir.clone().multiplyScalar(gripLen / 2 - 2 * MM)), dir };
  };
  return { style, r, crossR, height, width, crossY, end, knee, gripAnchor };
}

/**
 * Bars template.
 * style: shape T|Y · gussets · backsweep° · upsweep°
 */
export function BarsTemplate({ part, rig, highlight, onSelect }: TemplateProps) {
  const h = useInteract("bars", onSelect);
  const L = useMemo(() => barLayout(part), [part]);
  const { style, r, crossR, crossY, width } = L;
  const mat = <PartMaterial color={part.colorHex} finish={part.finish} highlight={highlight} />;

  const crossbar = useDisposable(
    useMemo(() => {
      const curve = new THREE.CatmullRomCurve3(
        [L.end(-1), L.knee(-1), new THREE.Vector3(0, crossY, 0), L.knee(1), L.end(1)],
        false,
        "centripetal",
      );
      return new THREE.TubeGeometry(curve, 96, crossR, 24, false);
    }, [L, crossY, crossR]),
  );

  const splitY = crossY * 0.6;
  const armZ = width * 0.17;
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  return (
    <group name="bars" position={[0, rig.clampBase, 0]} {...h}>
      <mesh geometry={crossbar} castShadow>
        {mat}
      </mesh>
      {style.shape === "T" ? (
        <>
          <Strut from={v(0, 0, 0)} to={v(0, crossY, 0)} radius={r}>
            {mat}
          </Strut>
          {style.gussets &&
            [-1, 1].map((s) => (
              <Strut key={s} from={v(0, crossY - 62 * MM, 0)} to={v(0, crossY - crossR * 0.4, s * 62 * MM)} radius={r * 0.32} segments={12}>
                {mat}
              </Strut>
            ))}
        </>
      ) : (
        <>
          <Strut from={v(0, 0, 0)} to={v(0, splitY, 0)} radius={r}>
            {mat}
          </Strut>
          {[-1, 1].map((s) => (
            <Strut key={s} from={v(0, splitY - r * 0.5, 0)} to={v(0, crossY, s * armZ)} radius={r * 0.82}>
              {mat}
            </Strut>
          ))}
          <mesh position={[0, splitY, 0]}>
            <sphereGeometry args={[r * 1.02, 24, 16]} />
            {mat}
          </mesh>
        </>
      )}
    </group>
  );
}

/* ─────────────────────────────── Grips ─────────────────────────────── */

/**
 * Grips template — a lathe profile, so ribs and flanges are real geometry.
 * style: pattern ribbed|diamond|smooth · flange
 */
export function GripsTemplate({ part, rig, bars, highlight, onSelect }: TemplateProps & { bars?: ScooterPart }) {
  const h = useInteract("grips", onSelect);
  const style = resolveStyle("grips", part.style);
  const L = useMemo(() => barLayout(bars), [bars]);
  const len = part.dimensions.length * MM;
  const gripR = Math.max((part.dimensions.outerDiameter * MM) / 2, L.crossR + 3 * MM);

  // Profile runs from inboard (y=-len/2) to outboard (y=+len/2); lathe axis = +Y.
  const lathe = useDisposable(
    useMemo(() => {
      const pts: THREE.Vector2[] = [];
      const y0 = -len / 2;
      const y1 = len / 2;
      pts.push(new THREE.Vector2(L.crossR, y0));
      if (style.flange) {
        pts.push(new THREE.Vector2(gripR + 4 * MM, y0), new THREE.Vector2(gripR + 4.5 * MM, y0 + 2 * MM));
        pts.push(new THREE.Vector2(gripR + 3 * MM, y0 + 4.5 * MM));
      } else {
        pts.push(new THREE.Vector2(gripR - 1 * MM, y0), new THREE.Vector2(gripR, y0 + 2 * MM));
      }
      const bodyStart = y0 + (style.flange ? 7 * MM : 3 * MM);
      const bodyEnd = y1 - 3 * MM;
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const y = bodyStart + ((bodyEnd - bodyStart) * i) / steps;
        const rib = style.pattern === "ribbed" ? Math.max(0, Math.sin(((y - bodyStart) / (5 * MM)) * Math.PI * 2)) * 0.9 * MM : 0;
        pts.push(new THREE.Vector2(gripR + rib, y));
      }
      pts.push(new THREE.Vector2(gripR - 1.5 * MM, y1), new THREE.Vector2(L.crossR * 0.5, y1));
      return new THREE.LatheGeometry(pts, 40);
    }, [len, gripR, style.flange, style.pattern, L.crossR]),
  );

  const diamond = useCanvasTexture(
    256,
    256,
    (ctx, w, hh) => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, hh);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 10;
      for (let i = -w; i < w * 2; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + hh, hh);
        ctx.moveTo(i, hh);
        ctx.lineTo(i + hh, 0);
        ctx.stroke();
      }
    },
    [],
    { srgb: false, repeat: [4, 6] },
  );

  return (
    <group name="grips" position={[0, rig.clampBase, 0]} {...h}>
      {[-1, 1].map((s) => {
        const { center, dir } = L.gripAnchor(s, len);
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        return (
          <mesh key={s} geometry={lathe} position={center} quaternion={quat} castShadow>
            <RubberMaterial
              color={part.colorHex}
              highlight={highlight}
              roughness={0.75}
              bumpMap={style.pattern === "diamond" ? diamond : null}
              bumpScale={style.pattern === "diamond" ? 1.5 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}
