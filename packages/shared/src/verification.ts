// Browser-compatible SHA-256 using Web Crypto API
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyCrashPoint(hash: string, nextHash: string): Promise<boolean> {
  const computed = await sha256(hash);
  return computed === nextHash;
}
