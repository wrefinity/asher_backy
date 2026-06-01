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

const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'];

const EU_COUNTRY_CODES = [
  'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT',
  'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'HR',
];

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  NG: 'NGN',
  NIGERIA: 'NGN',
  US: 'USD',
  USA: 'USD',
  'UNITED STATES': 'USD',
  'UNITED STATES OF AMERICA': 'USD',
  GB: 'GBP',
  UK: 'GBP',
  'UNITED KINGDOM': 'GBP',
  ENGLAND: 'GBP',
  SCOTLAND: 'GBP',
  WALES: 'GBP',
  'NORTHERN IRELAND': 'GBP',
};

const rateCache = new Map<string, { rate: number; expiresAt: number }>();
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;
const IP_LOOKUP_ERROR_TTL = 5 * 60 * 1000;
const ipCurrencyCache = new Map<string, {
  country_code: string | null;
  locationCurrency: string | null;
  expiresAt: number;
}>();

const normalizeCurrencyCode = (currency?: string | null) => {
  const normalized = currency?.trim().toUpperCase();
  return normalized && SUPPORTED_CURRENCIES.includes(normalized) ? normalized : null;
};

export const getCurrencyForCountry = (country?: string | null) => {
  if (!country) return null;

  const normalizedCountry = country.trim().toUpperCase();
  if (COUNTRY_CURRENCY_MAP[normalizedCountry]) return COUNTRY_CURRENCY_MAP[normalizedCountry];
  if (EU_COUNTRY_CODES.includes(normalizedCountry)) return 'EUR';

  return null;
};

export const resolveCurrencyFromRegion = async (input: {
  currency?: string | null;
  countryCode?: string | null;
  country?: string | null;
  ipAddress?: string | null;
} = {}) => {
  const explicitCurrency = normalizeCurrencyCode(input.currency);
  if (explicitCurrency) {
    return {
      country_code: input.countryCode?.trim().toUpperCase() || null,
      locationCurrency: explicitCurrency,
    };
  }

  const regionCurrency = getCurrencyForCountry(input.countryCode) || getCurrencyForCountry(input.country);
  if (regionCurrency) {
    return {
      country_code: input.countryCode?.trim().toUpperCase() || null,
      locationCurrency: regionCurrency,
    };
  }

  if (input.ipAddress) {
    const ipAddress = input.ipAddress.trim();
    const cachedLocation = ipCurrencyCache.get(ipAddress);
    if (cachedLocation && cachedLocation.expiresAt > Date.now()) {
      return {
        country_code: cachedLocation.country_code,
        locationCurrency: cachedLocation.locationCurrency,
      };
    }

    try {
      const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`);
      const resolvedLocation = {
        country_code: response.data.country_code || null,
        locationCurrency: normalizeCurrencyCode(response.data.currency) || null,
      };

      ipCurrencyCache.set(ipAddress, {
        ...resolvedLocation,
        expiresAt: Date.now() + ONE_DAY,
      });

      return resolvedLocation;
    } catch (error) {
      console.error('Error resolving currency from IP:', error);
      ipCurrencyCache.set(ipAddress, {
        country_code: null,
        locationCurrency: null,
        expiresAt: Date.now() + IP_LOOKUP_ERROR_TTL,
      });
    }
  }

  return {
    country_code: null,
    locationCurrency: null,
  };
};

export const getCurrentCountryCurrency = async (ipAddress?: string | null) => {
  try {
    // Get user's current location using an IP-based API
    const locationResponse = await axios.get(ipAddress ? `https://ipapi.co/${ipAddress}/json/` : 'https://ipapi.co/json/');
    const { country_code, currency: locationCurrency } = locationResponse.data;
    return { country_code, locationCurrency: normalizeCurrencyCode(locationCurrency) || locationCurrency }
  } catch (error) {
    console.error('Error getting country code:', error)
  }
}

export const getCurrencyConversionRate = async (from: string, to: string): Promise<number> => {
  const normalizedFrom = normalizeCurrencyCode(from);
  const normalizedTo = normalizeCurrencyCode(to);

  if (!normalizedFrom || !normalizedTo) throw new Error('Unsupported currency');
  if (normalizedFrom === normalizedTo) return 1;

  const cacheKey = `${normalizedFrom}:${normalizedTo}`;
  const cachedRate = rateCache.get(cacheKey);
  if (cachedRate && cachedRate.expiresAt > Date.now()) return cachedRate.rate;

  const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${normalizedFrom}`);
  const rate = response.data.rates[normalizedTo];
  if (!rate) throw new Error('Currency conversion rate not found');
  rateCache.set(cacheKey, { rate, expiresAt: Date.now() + ONE_HOUR });
  return rate;
};

export const convertCurrency = async  (amount: number, from: string, to: string): Promise<number> =>{
  const rate = await getCurrencyConversionRate(from, to);
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
