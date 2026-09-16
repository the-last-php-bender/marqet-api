export interface MeshBounds {
  width: number;
  height: number;
  depth: number;
}

export interface ApplyScaleInput {
  /** Current public URL of the GLB. */
  modelUrl: string;
  /** Uniform scale factor to apply to the mesh geometry. */
  scale: number;
  /** Storage key for the rescaled GLB, e.g. products/<id>/model.glb */
  destinationKey: string;
}

/** Read side of the scale-correction pipeline (Dependency Inversion boundary). */
export abstract class MeshInspector {
  abstract getBounds(modelUrl: string): Promise<MeshBounds>;
}

/** Write side of the scale-correction pipeline (Dependency Inversion boundary). */
export abstract class MeshTransformer {
  abstract applyScale(input: ApplyScaleInput): Promise<string>;
}
