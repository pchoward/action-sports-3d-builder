"use client";

import dynamic from "next/dynamic";
import BuilderUI from "./BuilderUI";
import { scooterModule } from "@/sports/scooter";
import { useBuilderStore } from "@/store/useBuilderStore";

// WebGL only exists in the browser — keep the Canvas out of the server render.
const ScooterScene = dynamic(() => import("./ScooterScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading 3D viewport…</div>
  ),
});

export default function ScooterBuilder() {
  return <BuilderUI sport={scooterModule} useStore={useBuilderStore} Scene={ScooterScene} />;
}
