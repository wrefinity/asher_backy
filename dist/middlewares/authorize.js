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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Authorize = void 0;
const secrets_1 = require("../secrets");
const Jtoken_1 = require("./Jtoken");
const user_services_1 = __importDefault(require("../services/user.services"));
class Authorize {
    constructor() {
        // super()
        this.tokenService = new Jtoken_1.Jtoken(secrets_1.JWT_SECRET);
        this.authorize = this.authorize.bind(this);
    }
    authorize(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            let token;
            if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
                token = req.headers.authorization.split(" ")[1];
            }
            console.log("==========" + token);
            if (!token) {
                return res.status(401).json({ message: "Not authorized, token failed" });
            }
            try {
                const decoded = yield this.tokenService.decodeToken(token);
                if (!decoded) {
                    return res.status(401).json({ message: "Not authorized, invalid token" });
                }
                const user = yield user_services_1.default.findAUserById(String(decoded.id));
                console.log(user);
                if (!user) {
                    return res.status(401).json({ message: "Not authorized, user not found" });
                }
                req.user = user;
                next();
            }
            catch (error) {
                console.error('Authorization error:', error);
                return res.status(401).json({ message: "Not authorized, token failed" });
            }
        });
    }
    authorizeRole(role) {
        return (req, res, next) => {
            var _a;
            if (req.user && ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role.includes(role)))
                return next();
            res.status(401).json({ message: `You are not authorized as a ${role}` });
        };
    }
    logoutUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            req.headers.authorization = "";
            return res.status(200).json({ message: "Logged out successfuly" });
        });
    }
}
exports.Authorize = Authorize;
