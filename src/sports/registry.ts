/**
 * Registry of pluggable sport modules. Phase 2 adds `skateboard` here with its
 * own catalog, compatibility rules and scene — the store and UI stay unchanged.
 */
import { scooterModule } from "./scooter";

export const SPORTS = {
  scooter: scooterModule,
  // skateboard: skateboardModule, // Phase 2
} as const;

export type SportId = keyof typeof SPORTS;
