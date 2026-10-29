export type ChannelConfig = { shots: 1024 | 4096 | 16384; seed: number; noise: number; interception: number };
export type Measurement = { verifier: string; transmitted: number; sifted: number; errors: number; qber: number; expected_qber: number; interval_95: number[]; accepted: boolean; matched_counts: Record<string, number> };
export type Experiment = { backend: string; qiskit_version: string; aer_version: string; config: ChannelConfig; cutoff: number; circuit_count: number; circuit_text: string; circuit_qasm: string; measurements: Measurement[] };
export type Receipt = { algorithm: 'Ed25519'; signature: string; manifest: { version: string; receipt_id: string; issued_at: string; key_id: string; image: { width: number; height: number; pixel_sha256: string; file_sha256: string; tile_hashes: string[] }; experiment: Experiment } };
export type Verification = { signature_valid: boolean; pixels_match: boolean; file_match: boolean; dimensions_match: boolean; changed_tiles: number[]; changed_tile_count: number; candidate_sha256: string; verdict: 'VERIFIED' | 'IMAGE_CHANGED' | 'CHANNEL_REJECTED' | 'UNTRUSTED_RECEIPT'; explanation: string; verifiers: { verifier: string; accepted: boolean; channel_accepted: boolean; qber: number }[] };
export type Capabilities = { public_key: string; key_id: string; persistent_key: boolean; limitations: string[] };
export type ImageAsset = { data: string; name: string; width: number; height: number };

const API = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '');
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API}/image-lab${path}`, {
    method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.detail === 'string' ? error.detail : `Request failed (${response.status}). Check the API configuration and image limits.`);
  }
  return response.json();
}
export const imageLab = {
  capabilities: () => request<Capabilities>('/capabilities'),
  seal: (image: ImageAsset, config: ChannelConfig) => request<Receipt>('/seal', { image_base64: image.data.split(',')[1], config }),
  verify: (image: ImageAsset, receipt: Receipt) => request<Verification>('/verify', { image_base64: image.data.split(',')[1], receipt }),
};
export function loadImage(data: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not open the image. Try a PNG, JPEG, or WebP.'));
    image.src = data;
  });
}
export async function readImage(file: File): Promise<ImageAsset> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Choose a PNG, JPEG, or WebP under 2 MiB.');
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read this file.'));
    reader.readAsDataURL(file);
  });
  const image = await loadImage(data);
  if (Math.min(image.width, image.height) < 8 || Math.max(image.width, image.height) > 2048 || image.width * image.height > 2_000_000) throw new Error('Use an image at least 8×8, at most 2048 per side and 2 megapixels.');
  return { data, name: file.name, width: image.width, height: image.height };
}
export async function sampleImage(): Promise<ImageAsset> {
  const image = await loadImage('/samples/orbital-survey.svg');
  const canvas = document.createElement('canvas');
  canvas.width = 960; canvas.height = 600;
  canvas.getContext('2d')!.drawImage(image, 0, 0, 960, 600);
  return { data: canvas.toDataURL('image/png'), name: 'orbital-survey.png', width: 960, height: 600 };
}
export async function editImage(source: ImageAsset, kind: 'region' | 'pixel'): Promise<ImageAsset> {
  const image = await loadImage(source.data);
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0);
  const x = Math.floor(image.width * 0.62), y = Math.floor(image.height * 0.38);
  if (kind === 'pixel') {
    const pixel = context.getImageData(x, y, 1, 1);
    pixel.data[0] ^= 255;
    context.putImageData(pixel, x, y);
  } else {
    const width = Math.max(2, Math.floor(image.width * 0.19)), height = Math.max(2, Math.floor(image.height * 0.22));
    context.fillStyle = '#ff715b'; context.fillRect(x, y, width, height);
    context.fillStyle = '#261c32'; context.font = `bold ${Math.max(8, Math.floor(image.width * 0.015))}px monospace`;
    context.fillText('ALTERED', x + width * 0.13, y + height * 0.55, width * 0.75);
  }
  const data = canvas.toDataURL('image/png');
  if (data.length > 2_800_000) throw new Error('Edited PNG exceeds 2 MiB. Try a smaller source image.');
  return { ...source, data, name: kind === 'pixel' ? 'one-pixel-edit.png' : 'altered-image.png' };
}
export function downloadFile(name: string, value: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadImage(image: ImageAsset) {
  const anchor = document.createElement('a');
  anchor.href = image.data;
  anchor.download = image.name;
  anchor.click();
}
