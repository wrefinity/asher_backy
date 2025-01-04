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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const profileServices_1 = __importDefault(require("../services/profileServices"));
const profile_1 = require("../validations/schemas/profile");
class ProfileControls {
    constructor() {
        this.profileUpdate = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { error, value } = profile_1.profileSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }
            try {
                const userId = req.user.id;
                const profileInfo = yield profileServices_1.default.findUserProfileByUserId(userId);
                const data = Object.assign({}, value);
                const profileUrl = req.body.cloudinaryUrls[0];
                delete data['cloudinaryUrls'];
                delete data['cloudinaryVideoUrls'];
                delete data['cloudinaryDocumentUrls'];
                // Update the user profile in the database
                const updatedUser = yield profileServices_1.default.updateUserProfile(profileInfo.id, Object.assign(Object.assign({}, data), { profileUrl }));
                const { id } = updatedUser, profile = __rest(updatedUser, ["id"]);
                res.status(200).json({ message: 'Profile updated successfully', user: profile });
            }
            catch (error) {
                console.error('Error updating profile:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
        this.getCurrentUserProfile = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(req.user);
                const userId = req.user.id;
                const profile = yield profileServices_1.default.findUserProfileByUserId(userId);
                return res.status(200).json({ profile });
            }
            catch (error) {
                res.status(500).json({ message: error.message || 'Internal server error' });
            }
        });
    }
}
exports.default = new ProfileControls();
