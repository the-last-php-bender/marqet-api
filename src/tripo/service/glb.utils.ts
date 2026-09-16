const GLB_MAGIC = 0x46546c67; // 'glTF'
const CHUNK_TYPE_JSON = 0x4e4f534a; // 'JSON'
const CHUNK_TYPE_BIN = 0x004e4942; // 'BIN'
const HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;

export interface GlbBinChunk {
  start: number;
  length: number;
}

export interface ParsedGlb {
  json: Record<string, unknown>;
  bin: GlbBinChunk | null;
}

/** Minimal glTF JSON shape used by our mesh services. */
export interface GltfJson {
  asset?: { version?: string };
  nodes?: Array<{
    scale?: [number, number, number];
    children?: number[];
    mesh?: number;
    name?: string;
  }>;
  meshes?: Array<{
    primitives?: Array<{ attributes?: Record<string, number> }>;
  }>;
  accessors?: Array<{
    componentType?: number;
    type?: string;
    count?: number;
    min?: number[];
    max?: number[];
    bufferView?: number;
    byteOffset?: number;
  }>;
  bufferViews?: Array<{
    buffer?: number;
    byteOffset?: number;
    byteLength?: number;
    byteStride?: number;
  }>;
  [key: string]: unknown;
}

export function parseGlb(buffer: Buffer): {
  json: GltfJson;
  bin: Buffer | null;
} {
  if (buffer.length < HEADER_BYTES || buffer.readUInt32LE(0) !== GLB_MAGIC) {
    throw new Error('Not a valid GLB binary (missing glTF magic).');
  }

  let offset = HEADER_BYTES;
  let json: GltfJson | null = null;
  let bin: Buffer | null = null;

  while (offset + CHUNK_HEADER_BYTES <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const dataStart = offset + CHUNK_HEADER_BYTES;

    if (chunkType === CHUNK_TYPE_JSON) {
      json = JSON.parse(
        buffer.subarray(dataStart, dataStart + chunkLength).toString('utf8'),
      ) as GltfJson;
    } else if (chunkType === CHUNK_TYPE_BIN) {
      bin = Buffer.from(buffer.subarray(dataStart, dataStart + chunkLength));
    }

    offset = dataStart + chunkLength;
  }

  if (!json) throw new Error('GLB file has no JSON chunk.');

  return { json, bin };
}

/** Re-packs glTF JSON (+ optional BIN) into a spec-compliant GLB container. */
export function serializeGlb(json: GltfJson, bin: Buffer | null): Buffer {
  let jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  if (jsonPadding > 0)
    jsonBuffer = Buffer.concat([jsonBuffer, Buffer.alloc(jsonPadding, 0x20)]);

  const binPadding = bin ? (4 - (bin.length % 4)) % 4 : 0;
  const binChunk = bin ? Buffer.concat([bin, Buffer.alloc(binPadding)]) : null;

  const totalLength =
    HEADER_BYTES +
    CHUNK_HEADER_BYTES +
    jsonBuffer.length +
    (binChunk ? CHUNK_HEADER_BYTES + binChunk.length : 0);

  const output = Buffer.alloc(totalLength);
  output.writeUInt32LE(GLB_MAGIC, 0);
  output.writeUInt32LE(2, 4); // GLB version
  output.writeUInt32LE(totalLength, 8);
  output.writeUInt32LE(jsonBuffer.length, 12);
  output.writeUInt32LE(CHUNK_TYPE_JSON, 16);
  jsonBuffer.copy(output, 20);

  if (binChunk) {
    const binHeaderOffset = 20 + jsonBuffer.length;
    output.writeUInt32LE(binChunk.length, binHeaderOffset);
    output.writeUInt32LE(CHUNK_TYPE_BIN, binHeaderOffset + 4);
    binChunk.copy(output, binHeaderOffset + CHUNK_HEADER_BYTES);
  }

  return output;
}

export const COMPONENT_TYPE_FLOAT = 5126;
export const TYPE_VEC3 = 'VEC3';
