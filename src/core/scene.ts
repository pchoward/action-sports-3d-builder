import type { Build, Part } from "./types";

/** Props every sport's 3D scene receives from the generic builder UI. */
export interface SceneProps<Cat extends string, P extends Part<Cat>> {
  build: Build<Cat, P>;
  activeCategory: Cat;
  onSelectCategory: (category: Cat) => void;
}
