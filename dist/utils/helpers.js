"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDateFieldNew = exports.convertCurrency = exports.getCurrentCountryCurrency = exports.generateIDs = exports.generateOtp = exports.String = void 0;
exports.setupArctic = setupArctic;
exports.generateUniqueToken = generateUniqueToken;
exports.getCommunityurl = getCommunityurl;
exports.getCountryCodeFromIp = getCountryCodeFromIp;
// arcticSetup.ts
const axios_1 = __importDefault(require("axios"));
const moment_1 = __importDefault(require("moment"));
let generateCodeVerifier;
let generateState;
let Google;
function setupArctic() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!generateCodeVerifier || !generateState || !Google) {
            const arctic = yield Promise.resolve().then(() => __importStar(require('arctic')));
            generateCodeVerifier = arctic.generateCodeVerifier;
            generateState = arctic.generateState;
            Google = arctic.Google;
        }
        return { generateCodeVerifier, generateState, Google };
    });
}
const String = (obj) => {
    if (obj === null || obj === undefined)
        return obj;
    if (typeof obj === 'bigint')
        return obj.toString();
    if (Array.isArray(obj))
        return obj.map(exports.String);
    if (typeof obj === 'object') {
        return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, (0, exports.String)(value)]));
    }
    return obj;
};
exports.String = String;
const generateOtp = () => {
    const min = 100000;
    const max = 999999;
    const otp = Math.floor(Math.random() * (max - min + 1)) + min;
    return otp.toString();
};
exports.generateOtp = generateOtp;
const generateIDs = (starter) => {
    const timeStamp = Date.now(); // get the unix timestamp
    const timeStampToString = timeStamp.toString().slice(-4);
    return `${starter}-${timeStampToString}-${Math.floor(Math.random() * 1000)}`;
};
exports.generateIDs = generateIDs;
function generateUniqueToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
function getCommunityurl(name) {
    return `${process.env.BASE_URL}/community/${name}`;
}
function getCountryCodeFromIp(ipAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`https://ipapi.co/${ipAddress}/json/`);
            return response.data.country_code;
        }
        catch (error) {
            console.error('Error getting country code:', error);
            return null;
        }
    });
}
const getCurrentCountryCurrency = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get user's current location using an IP-based API
        const locationResponse = yield axios_1.default.get('https://ipapi.co/json/');
        const { country_code, currency: locationCurrency } = locationResponse.data;
        return { country_code, locationCurrency };
    }
    catch (error) {
        console.error('Error getting country code:', error);
    }
});
exports.getCurrentCountryCurrency = getCurrentCountryCurrency;
const convertCurrency = (amount, from, to) => __awaiter(void 0, void 0, void 0, function* () {
    if (from === to)
        return amount;
    const response = yield axios_1.default.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
    const rate = response.data.rates[to];
    if (!rate)
        throw new Error('Currency conversion rate not found');
    return amount * rate;
});
exports.convertCurrency = convertCurrency;
// Helper function to parse the date field into DD/MM/YYYY format
const parseDateFieldNew = (date, fieldName) => {
    if (!date)
        return null;
    const formattedDate = (0, moment_1.default)(date, 'DD/MM/YYYY', true);
    if (!formattedDate.isValid()) {
        throw new Error(`Invalid date format for ${fieldName}: "${date}"`);
    }
    return formattedDate.toISOString();
};
exports.parseDateFieldNew = parseDateFieldNew;
