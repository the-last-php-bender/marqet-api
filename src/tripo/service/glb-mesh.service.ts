import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  COMPONENT_TYPE_FLOAT,
  GltfJson,
  TYPE_VEC3,
  parseGlb,
  serializeGlb,
} from './glb.utils';
import {
  ApplyScaleInput,
  MeshBounds,
  MeshInspector,
  MeshTransformer,
} from '../interfaces/mesh.interface';
import { StorageProvider } from '../../storage/interfaces/storage-provider.interface';

const CONTENT_TYPE_GLB = 'model/gltf-binary';

async function fetchGlb(
  httpService: HttpService,
  modelUrl: string,
): Promise<Buffer> {
  const response = await firstValueFrom(
    httpService.get<ArrayBuffer>(modelUrl, {
      responseType: 'arraybuffer',
      timeout: 60_000,
    }),
  );
  return Buffer.from(response.data);
}

/** Reads mesh bounds from the POSITION accessor min/max (no geometry decode). */
@Injectable()
export class GlbMeshInspector extends MeshInspector {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async getBounds(modelUrl: string): Promise<MeshBounds> {
    const buffer = await fetchGlb(this.httpService, modelUrl);
    const { json } = parseGlb(buffer);

    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (const accessorIndex of this.positionAccessorIndexes(json)) {
      const accessor = json.accessors?.[accessorIndex];
      if (!accessor?.min || !accessor?.max) continue;
      minX = Math.min(minX, accessor.min[0]);
      minY = Math.min(minY, accessor.min[1]);
      minZ = Math.min(minZ, accessor.min[2]);
      maxX = Math.max(maxX, accessor.max[0]);
      maxY = Math.max(maxY, accessor.max[1]);
      maxZ = Math.max(maxZ, accessor.max[2]);
    }

    if (!Number.isFinite(minX))
      throw new Error('GLB contains no usable POSITION accessors.');

    return {
      width: maxX - minX,
      height: maxY - minY,
      depth: maxZ - minZ,
    };
  }

  private positionAccessorIndexes(json: GltfJson): number[] {
    const indexes: number[] = [];
    for (const mesh of json.meshes ?? []) {
      for (const primitive of mesh.primitives ?? []) {
        const positionIndex = primitive.attributes?.POSITION;
        if (typeof positionIndex === 'number') indexes.push(positionIndex);
      }
    }
    return indexes;
  }
}

/**
 * Rewrites every position vertex by `scale` in the BIN chunk, updates the
 * accessor min/max, re-packs the GLB and uploads it.
 */
@Injectable()
export class GlbMeshTransformer extends MeshTransformer {
  private readonly logger = new Logger(GlbMeshTransformer.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly storageProvider: StorageProvider,
  ) {
    super();
  }

  async applyScale({
    modelUrl,
    scale,
    destinationKey,
  }: ApplyScaleInput): Promise<string> {
    if (!Number.isFinite(scale) || scale <= 0)
      throw new Error(`Invalid mesh scale: ${scale}`);

    const buffer = await fetchGlb(this.httpService, modelUrl);
    const { json, bin } = parseGlb(buffer);
    if (!bin)
      throw new Error('GLB has no BIN chunk; cannot rescale vertex data.');

    this.scaleAllPositions(json, bin, scale);

    const serialized = serializeGlb(json, bin);
    const { url } = await this.storageProvider.upload({
      body: serialized,
      key: destinationKey,
      contentType: CONTENT_TYPE_GLB,
    });
    this.logger.log(
      `Scaled mesh uploaded to ${url} (scale=${scale.toFixed(4)})`,
    );
    return url;
  }

  private scaleAllPositions(json: GltfJson, bin: Buffer, scale: number): void {
    const accessors = json.accessors ?? [];
    const bufferViews = json.bufferViews ?? [];

    for (const accessorIndex of this.positionAccessorIndexes(json)) {
      const accessor = accessors[accessorIndex];
      if (!accessor) continue;

      if (
        accessor.componentType !== COMPONENT_TYPE_FLOAT ||
        accessor.type !== TYPE_VEC3
      ) {
        throw new Error(
          `Unsupported POSITION accessor (componentType=${accessor.componentType}, type=${accessor.type}). Only FLOAT VEC3 is supported.`,
        );
      }

      const bufferView = bufferViews[accessor.bufferView ?? -1];
      if (!bufferView)
        throw new Error('POSITION accessor is missing its bufferView.');

      const stride =
        bufferView.byteStride && bufferView.byteStride > 0
          ? bufferView.byteStride
          : 12;
      const start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
      const count = accessor.count ?? 0;

      for (let i = 0; i < count; i += 1) {
        const offset = start + i * stride;
        const x = bin.readFloatLE(offset) * scale;
        const y = bin.readFloatLE(offset + 4) * scale;
        const z = bin.readFloatLE(offset + 8) * scale;
        bin.writeFloatLE(x, offset);
        bin.writeFloatLE(y, offset + 4);
        bin.writeFloatLE(z, offset + 8);
      }

      if (accessor.min)
        accessor.min = accessor.min.map((value) => value * scale);
      if (accessor.max)
        accessor.max = accessor.max.map((value) => value * scale);
    }
  }

  private positionAccessorIndexes(json: GltfJson): number[] {
    const indexes: number[] = [];
    for (const mesh of json.meshes ?? []) {
      for (const primitive of mesh.primitives ?? []) {
        const positionIndex = primitive.attributes?.POSITION;
        if (typeof positionIndex === 'number') indexes.push(positionIndex);
      }
    }
    return indexes;
  }
}
