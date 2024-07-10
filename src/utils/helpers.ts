// arcticSetup.ts

let generateCodeVerifier: () => string;
let generateState: () => string;
let Google: any;

export async function setupArctic() {
  if (!generateCodeVerifier || !generateState || !Google) {
    const arctic = await import('arctic');
    generateCodeVerifier = arctic.generateCodeVerifier;
    generateState = arctic.generateState;
    Google = arctic.Google;
  }
  return { generateCodeVerifier, generateState, Google };
}

export const String = (obj: any) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(String);
  if (typeof obj === 'object') {
      return Object.fromEntries(
          Object.entries(obj).map(([key, value]) => [key, String(value)])
      );
  }
  return obj;
};