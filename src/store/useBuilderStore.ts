import { scooterModule } from "@/sports/scooter";
import { createBuilderStore } from "./createBuilderStore";

/** Phase 1 store: the builder bound to the Pro Scooter module. */
export const useBuilderStore = createBuilderStore(scooterModule);
