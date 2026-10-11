/**
 * Wrapper tipis di atas @vladmandic/human — satu-satunya tempat yang boleh
 * mengimpor library ini, supaya tetap gampang dipastikan tidak ikut masuk
 * bundle utama (dipanggil dynamic import dari halaman kiosk & pendaftaran
 * wajah saja). Model dimuat dari /models/ (static assets, di-cache Workbox).
 */
import type Human from "@vladmandic/human";
import type { Config, FaceResult } from "@vladmandic/human";

let humanInstance: Human | null = null;
let loadPromise: Promise<Human> | null = null;

const HUMAN_CONFIG: Partial<Config> = {
  modelBasePath: "/models/",
  backend: "webgl",
  async: true,
  warmup: "face",
  face: {
    enabled: true,
    detector: { enabled: true, rotation: true, maxDetected: 1, return: false },
    mesh: { enabled: true },
    attention: { enabled: false },
    iris: { enabled: false },
    description: { enabled: true },
    emotion: { enabled: false },
    antispoof: { enabled: true },
    liveness: { enabled: true },
    gear: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
  segmentation: { enabled: false },
  filter: { enabled: false },
};

/** Memuat & inisialisasi Human sekali saja (dipanggil ulang = reuse instance yang sama). */
export async function getHuman(): Promise<Human> {
  if (humanInstance) return humanInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const { default: HumanCtor } = await import("@vladmandic/human");
    const human = new HumanCtor(HUMAN_CONFIG);
    await human.load();
    await human.warmup();
    humanInstance = human;
    return human;
  })();

  return loadPromise;
}

export async function detectFace(
  human: Human,
  input: HTMLVideoElement | HTMLCanvasElement,
): Promise<FaceResult | null> {
  const result = await human.detect(input);
  return result.face[0] ?? null;
}

/** Float32Array (embedding Human) <-> base64, untuk disimpan di D1 sebagai TEXT. */
export function descriptorToBase64(embedding: number[]): string {
  const bytes = new Uint8Array(new Float32Array(embedding).buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function base64ToDescriptor(b64: string): number[] {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return Array.from(new Float32Array(bytes.buffer));
}

export interface MatchCandidate {
  guruId: string;
  descriptor: number[];
}

export interface MatchResult {
  guruId: string;
  similarity: number;
}

/**
 * Cocokkan satu embedding ke daftar descriptor guru. Mengembalikan null
 * kalau tidak ada yang melewati ambang, ATAU kalau kandidat terbaik & kedua
 * terbaik terlalu mirip satu sama lain (ragu — sengaja tidak menebak,
 * sesuai bagian 5.2 prompt).
 */
export function matchFace(
  human: Human,
  embedding: number[],
  candidates: MatchCandidate[],
  ambang: number,
): MatchResult | null {
  if (candidates.length === 0) return null;
  const descriptors = candidates.map((c) => c.descriptor);
  const best = human.match.find(embedding, descriptors);
  if (best.index === -1 || best.similarity < ambang) return null;

  // Cek keraguan: hitung similarity ke kandidat kedua terbaik.
  const remaining = descriptors.filter((_, i) => i !== best.index);
  if (remaining.length > 0) {
    const second = human.match.find(embedding, remaining);
    if (second.index !== -1 && best.similarity - second.similarity < 0.08) {
      return null; // terlalu mirip — jangan menebak
    }
  }

  return { guruId: candidates[best.index]!.guruId, similarity: best.similarity };
}
