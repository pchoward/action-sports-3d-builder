/**
 * Parametric scooter part templates. Each template is driven by the part's
 * catalog dimensions (mm), colour/finish and optional `style` (see ../style.ts).
 * To swap in a real .glb for a specific part later, render it at the same
 * mount point — the rig in ../geometry.ts doesn't change.
 */
export { BarsTemplate, GripsTemplate, barLayout } from "./Bars";
export { DeckTemplate, HeadtubeTemplate } from "./Deck";
export { GripTapeTemplate } from "./GripTape";
export { ClampTemplate, ForkTemplate, HeadsetTemplate } from "./Steering";
export { WheelTemplate } from "./Wheel";
export type { TemplateProps } from "./shared";
