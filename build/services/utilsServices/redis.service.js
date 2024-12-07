"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class RedisService {
    constructor() {
        // this.client = new Redis({
        //     host: '127.0.0.1',
        //     port: 6379,
        // })
        // this.setupListeners();
    }
    setupListeners() {
        this.client.on('connect', () => {
            console.log("Connected to Redis");
        });
        this.client.on('error', (err) => {
            console.error("Error connecting to Redis:", err);
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.client.get(key);
        });
    }
    set(key, value, expires) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client.set(key, value, 'EX', expires);
        });
    }
}
exports.default = RedisService;
