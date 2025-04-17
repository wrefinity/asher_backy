// arcticSetup.ts
import axios from 'axios';
import moment from 'moment';


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
    const { country_code, currency: locationCurrency } = locationResponse.data;
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


// Helper function to parse the date field into DD/MM/YYYY format
export const parseDateFieldNew = (date: string, fieldName: string): string | null => {
  if (!date) return null;
  const formattedDate = moment(date, 'DD/MM/YYYY', true);
  if (!formattedDate.isValid()) {
      throw new Error(`Invalid date format for ${fieldName}: "${date}"`);
  }
  return formattedDate.toISOString();
};

export const getMimeTypeFromUrl = (url: string): string => {
  const extension = url.split('.').pop()?.toLowerCase();
  switch(extension) {
    case 'pdf': return 'application/pdf';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls': return 'application/vnd.ms-excel';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'jpg': 
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    default: return 'application/octet-stream';
  }
};