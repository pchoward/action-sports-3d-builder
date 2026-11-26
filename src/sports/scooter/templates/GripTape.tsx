"use client";

import { useTexture } from "@react-three/drei";
import { Suspense } from "react";
import * as THREE from "three";
import { MM } from "../geometry";
import { resolveStyle } from "../style";
import { RubberMaterial } from "./PartMaterial";
import { tint, useCanvasTexture, useInteract, type TemplateProps } from "./shared";

/** Tiny deterministic PRNG so patterns don't change between renders. */
function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Grip tape template — a printed canvas texture with grit.
 * style: pattern plain|logo|camo|stripe · accentHex
 */
export function GripTapeTemplate(props: TemplateProps) {
  const graphic = props.part.images?.graphic;
  if (!graphic) return <PrintedGripTape {...props} />;
  // Real print artwork (WebP); show the procedural tape while it loads.
  return (
    <Suspense fallback={<PrintedGripTape {...props} />}>
      <GraphicGripTape {...props} url={graphic} />
    </Suspense>
  );
}

function GraphicGripTape({ url, ...props }: TemplateProps & { url: string }) {
  const tex = useTexture(url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  });
  return <PrintedGripTape {...props} graphic={tex} />;
}

function PrintedGripTape({ part, rig, highlight, onSelect, graphic }: TemplateProps & { graphic?: THREE.Texture }) {
  const h = useInteract("griptape", onSelect);
  const style = resolveStyle("griptape", part.style);
  const { start, length, width, thickness, centerY } = rig.deck;
  const tapeL = Math.min(part.dimensions.length * MM, length - 8 * MM);
  const tapeW = Math.min(part.dimensions.width * MM, width) - 4 * MM;
  const accent = style.accentHex ?? tint(part.colorHex, 0.35);

  const tex = useCanvasTexture(
    2048,
    Math.round((2048 * tapeW) / tapeL),
    (ctx, w, hh) => {
      const rand = rng(part.id);
      ctx.fillStyle = part.colorHex;
      ctx.fillRect(0, 0, w, hh);
      if (style.pattern === "camo") {
        const shades = [accent, tint(part.colorHex, -0.35), tint(accent, 0.25)];
        for (let i = 0; i < 140; i++) {
          ctx.fillStyle = shades[i % shades.length];
          ctx.beginPath();
          const x = rand() * w;
          const y = rand() * hh;
          ctx.ellipse(x, y, 30 + rand() * 90, 18 + rand() * 45, rand() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (style.pattern === "stripe") {
        ctx.fillStyle = accent;
        for (let x = -hh; x < w; x += 140) {
          ctx.beginPath();
          ctx.moveTo(x, hh);
          ctx.lineTo(x + 50, hh);
          ctx.lineTo(x + 50 + hh, 0);
          ctx.lineTo(x + hh, 0);
          ctx.fill();
        }
      } else if (style.pattern === "logo") {
        ctx.fillStyle = accent;
        ctx.font = `900 ${hh * 0.5}px system-ui, Arial Black, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(part.brand.toUpperCase(), w / 2, hh / 2, w * 0.7);
      }
      // Grit
      const img = ctx.getImageData(0, 0, w, hh);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (rand() - 0.5) * 38;
        img.data[i] += n;
        img.data[i + 1] += n;
        img.data[i + 2] += n;
      }
      ctx.putImageData(img, 0, 0);
    },
    [part.id, part.colorHex, part.brand, style.pattern, accent, tapeL, tapeW],
  );

  return (
    <mesh
      name="griptape"
      position={[start + length / 2, centerY + thickness / 2 + 0.4 * MM, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      {...h}
    >
      <planeGeometry args={[tapeL, tapeW]} />
      <RubberMaterial color="#ffffff" map={graphic ?? tex} highlight={highlight} roughness={1} />
    </mesh>
  );
}

