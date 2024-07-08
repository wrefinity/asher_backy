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

export const bigIntToString = (obj: any) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(bigIntToString);
  if (typeof obj === 'object') {
      return Object.fromEntries(
          Object.entries(obj).map(([key, value]) => [key, bigIntToString(value)])
      );
  }
  return obj;
};