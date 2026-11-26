"use client";

import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo, useState } from "react";
import { PCFShadowMap } from "three";
import type { SceneProps } from "@/core/scene";
import { SceneErrorBoundary } from "./SceneErrorBoundary";
import { solveScooterRig } from "@/sports/scooter/geometry";
import {
  BarsTemplate,
  ClampTemplate,
  DeckTemplate,
  ForkTemplate,
  GripTapeTemplate,
  GripsTemplate,
  HeadsetTemplate,
  HeadtubeTemplate,
  WheelTemplate,
} from "@/sports/scooter/templates";
import type { ScooterCategory, ScooterPart } from "@/sports/scooter/types";

type Props = SceneProps<ScooterCategory, ScooterPart>;

/**
 * Mount hierarchy (mirrors the named empties a Blender .glb would carry):
 *
 * root (on ground, centred)
 * └─ chassis (pitched so both wheels touch ground; origin = rear axle)
 *    ├─ deck, griptape, rear wheel
 *    └─ mount_headtube (at headtube base, tilted to headtube angle)
 *       ├─ headtube, headset, fork
 *       ├─ mount_front_axle → front wheel
 *       └─ mount_clamp → clamp, bars → grips
 */
function ScooterAssembly({ build, activeCategory, onSelectCategory }: Props) {
  const rig = useMemo(() => solveScooterRig(build), [build]);
  const { deck, fork, headset, clamp, bars, grips, wheels, griptape } = build;
  const common = { rig, onSelect: onSelectCategory };
  const hl = (c: ScooterCategory) => activeCategory === c;

  return (
    <group name="root" position={[rig.centerOffsetX, rig.wheelRadius, 0]}>
      <group name="chassis" rotation={[0, 0, rig.pitch]}>
        {deck && <DeckTemplate part={deck} {...common} highlight={hl("deck")} />}
        {griptape && deck && <GripTapeTemplate part={griptape} {...common} highlight={hl("griptape")} />}
        <group name="mount_rear_axle">
          {wheels && <WheelTemplate part={wheels} axle={deck?.compatibility.axle} {...common} highlight={hl("wheels")} />}
        </group>

        <group
          name="mount_headtube"
          position={[rig.headtubeBase[0], rig.headtubeBase[1], 0]}
          rotation={[0, 0, rig.steeringTilt]}
        >
          {deck && <HeadtubeTemplate part={deck} {...common} highlight={hl("deck")} />}
          {headset && <HeadsetTemplate part={headset} {...common} highlight={hl("headset")} />}
          {fork && <ForkTemplate part={fork} {...common} highlight={hl("fork")} />}
          <group name="mount_front_axle" position={[0, rig.frontAxleY, 0]} rotation={[0, 0, -rig.steeringTilt - rig.pitch]}>
            {wheels && fork && <WheelTemplate part={wheels} axle={fork.compatibility.axle} {...common} highlight={hl("wheels")} />}
          </group>
          {clamp && <ClampTemplate part={clamp} {...common} highlight={hl("clamp")} />}
          {bars && <BarsTemplate part={bars} {...common} highlight={hl("bars")} />}
          {grips && bars && <GripsTemplate part={grips} bars={bars} {...common} highlight={hl("grips")} />}
        </group>
      </group>
    </group>
  );
}

/** Optional `?cam=px,py,pz,tx,ty,tz` (metres) — for screenshots, docs and visual QA. */
function cameraFromUrl() {
  const raw = new URLSearchParams(window.location.search).get("cam");
  const v = raw?.split(",").map(Number);
  if (!v || v.length !== 6 || v.some(Number.isNaN)) return null;
  return { position: v.slice(0, 3) as [number, number, number], target: v.slice(3) as [number, number, number] };
}

export default function ScooterScene(props: Props) {
  const [cam] = useState(cameraFromUrl);
  return (
    <Canvas
      shadows={{ type: PCFShadowMap }}
      dpr={[1, 2]}
      camera={{ position: cam?.position ?? [1.5, 0.95, 1.85], fov: 30, near: 0.01, far: 50 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onPointerMissed={() => (document.body.style.cursor = "")}
    >
      <color attach="background" args={["#0e1014"]} />
      <fog attach="fog" args={["#0e1014", 4, 9]} />

      {/* Studio lighting: key, fill, rim */}
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[2.5, 4, 2]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-1}
        shadow-camera-right={1}
        shadow-camera-top={1.2}
        shadow-camera-bottom={-0.4}
      />
      <directionalLight position={[-3, 2, -1.5]} intensity={0.7} color="#9db8ff" />
      <spotLight position={[-1.5, 2.5, 2.5]} intensity={8} angle={0.5} penumbra={1} color="#ffe6c7" />

      {/* "city" HDRI, self-hosted (CC0, from @pmndrs/assets) so no CDN fetch can take the scene down */}
      <SceneErrorBoundary fallback={<hemisphereLight args={["#dfe8ff", "#1a1a1a", 1.2]} />}>
        <Suspense fallback={null}>
          <Environment files="/hdri/city.exr" />
        </Suspense>
      </SceneErrorBoundary>

      <ScooterAssembly {...props} />

      <ContactShadows position={[0, 0.0005, 0]} opacity={0.65} scale={2.4} blur={2.4} far={1} resolution={1024} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[20, 64]} />
        <meshStandardMaterial color="#15181d" roughness={0.95} />
      </mesh>

      <OrbitControls
        makeDefault
        target={cam?.target ?? [0, 0.4, 0]}
        enableDamping
        minDistance={0.25}
        maxDistance={3.5}
        maxPolarAngle={Math.PI / 2 - 0.04}
      />
    </Canvas>
  );
}
