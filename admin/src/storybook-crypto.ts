// A stand-in for `node:crypto` in Storybook only, which runs in a browser (see
// `.storybook/vite.config.ts`). The stories use the real server code through
// `fake-api.ts`, and the sign-in code uses just these three things. Nothing in
// the admin build or the server imports this file.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

/** SHA-256 of the bytes. */
function sha256(data: Uint8Array): Uint8Array {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ]);
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor((data.length * 8) / 2 ** 32));
  view.setUint32(padded.length - 4, (data.length * 8) >>> 0);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15] as number;
      const b = w[i - 2] as number;
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      w[i] = ((w[i - 16] as number) + s0 + (w[i - 7] as number) + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h as unknown as number[] as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + s1 + ch + (K[i] as number) + (w[i] as number)) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((value, i) => {
      h[i] = ((h[i] as number) + value) >>> 0;
    });
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  h.forEach((value, i) => {
    outView.setUint32(i * 4, value);
  });
  return out;
}

const encoder = new TextEncoder();
const bytes = (value: string | Uint8Array): Uint8Array =>
  typeof value === "string" ? encoder.encode(value) : value;
const hex = (data: Uint8Array): string =>
  [...data].map((byte) => byte.toString(16).padStart(2, "0")).join("");

/** What `createHash` and `createHmac` give: add text, then take the bytes, or hex text when asked. */
interface Hasher {
  update(value: string | Uint8Array): Hasher;
  digest(): Uint8Array;
  digest(encoding: "hex"): string;
}

const finish = (data: Uint8Array) =>
  ((encoding?: "hex") => (encoding ? hex(data) : data)) as Hasher["digest"];

const join = (parts: Uint8Array[]): Uint8Array => {
  const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    all.set(part, at);
    at += part.length;
  }
  return all;
};

export function createHash(algorithm: "sha256"): Hasher {
  if (algorithm !== "sha256") throw new Error("Only sha256 is available here.");
  const parts: Uint8Array[] = [];
  const hash: Hasher = {
    update(value) {
      parts.push(bytes(value));
      return hash;
    },
    digest: ((encoding?: "hex") =>
      finish(sha256(join(parts)))(encoding as "hex")) as Hasher["digest"],
  };
  return hash;
}

export function createHmac(
  algorithm: "sha256",
  key: string | Uint8Array,
): Hasher {
  if (algorithm !== "sha256") throw new Error("Only sha256 is available here.");
  let secret = bytes(key);
  if (secret.length > 64) secret = sha256(secret);
  const inner = new Uint8Array(64).fill(0x36);
  const outer = new Uint8Array(64).fill(0x5c);
  secret.forEach((byte, i) => {
    inner[i] = (inner[i] as number) ^ byte;
    outer[i] = (outer[i] as number) ^ byte;
  });
  const parts: Uint8Array[] = [];
  const hmac: Hasher = {
    update(value) {
      parts.push(bytes(value));
      return hmac;
    },
    digest: ((encoding?: "hex") =>
      finish(sha256(join([outer, sha256(join([inner, ...parts]))])))(
        encoding as "hex",
      )) as Hasher["digest"],
  };
  return hmac;
}

/** Compares two byte strings of the same length without stopping at the first difference. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) throw new RangeError("Lengths differ.");
  let difference = 0;
  for (let i = 0; i < a.length; i++) {
    difference |= (a[i] as number) ^ (b[i] as number);
  }
  return difference === 0;
}
