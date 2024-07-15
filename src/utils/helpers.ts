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

export const generateOtp = (): string => {
  const min = 100000;
  const max = 999999;

  const otp = Math.floor(Math.random() * (max - min + 1)) + min;
  return otp.toString();
}

export function generateUniqueToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getCommunityurl(name: string) {
  return `${process.env.BASE_URL}/community/${name}`;
}