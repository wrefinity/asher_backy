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
const roles_services_1 = __importDefault(require("../services/roles.services"));
const auth_1 = require("../validations/schemas/auth");
class RoleManagementController {
    constructor() {
        // Assign roles to a user
        this.assignRoles = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { error } = auth_1.assignRoleSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const updatedUser = yield roles_services_1.default.assignRoles(req.body);
                return res.status(200).json({ message: "Roles assigned successfully", updatedUser });
            }
            catch (err) {
                return res.status(500).json({ error: err.message });
            }
        });
        // Get a user's roles
        this.getUserRoles = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.params.userId;
                const roles = yield roles_services_1.default.getUserRoles(userId);
                return res.status(200).json({ roles });
            }
            catch (err) {
                return res.status(500).json({ error: err.message });
            }
        });
        // Remove roles from a user
        this.removeRoles = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId, rolesToRemove } = req.body;
                const updatedUser = yield roles_services_1.default.removeRoles(userId, rolesToRemove);
                return res.status(200).json({ message: "Roles removed successfully", updatedUser });
            }
            catch (err) {
                return res.status(500).json({ error: err.message });
            }
        });
    }
}
exports.default = new RoleManagementController();
