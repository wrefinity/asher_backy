// arcticSetup.ts
import axios from 'axios';

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

export const generateIDs = (starter: string) => {
  const timeStamp = Date.now(); // get the unix timestamp
  const timeStampToString = timeStamp.toString().slice(-4)
  return `${starter}-${timeStampToString}-${Math.floor(Math.random() * 1000)}`;
}


export function generateUniqueToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getCommunityurl(name: string) {
  return `${process.env.BASE_URL}/community/${name}`;
}

export async function getCountryCodeFromIp(ipAddress) {
  try {
    const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`);
    return response.data.country_code;
  } catch (error) {
    console.error('Error getting country code:', error);
    return null;
  }
}

export const getCurrentCountryCurrency = async () => {
  try {
    // Get user's current location using an IP-based API
    const locationResponse = await axios.get('https://ipapi.co/json/');
    const { country_code, locationCurrency } = locationResponse.data;
    return {country_code, locationCurrency}
  } catch (error) {
    console.error('Error getting country code:', error)
  }
}

export const convertCurrency = async  (amount: number, from: string, to: string): Promise<number> =>{
  if (from === to) return amount;
  const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
  const rate = response.data.rates[to];
  if (!rate) throw new Error('Currency conversion rate not found');
  return amount * rate;
}