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
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
class GuarantorService {
    constructor() {
        // Upsert Guarantor Information
        this.upsertGuarantorInfo = (data) => __awaiter(this, void 0, void 0, function* () {
            const { userId, id } = data, rest = __rest(data, ["userId", "id"]);
            if (id) {
                // Check if the guarantor exists
                const existingGuarantor = yield this.getGuarantorById(id);
                if (!existingGuarantor) {
                    throw new Error(`Guarantor with ID ${id} does not exist.`);
                }
                // Perform update if id is provided
                return yield __1.prismaClient.guarantorInformation.update({
                    where: { id },
                    data: Object.assign(Object.assign({}, rest), { user: {
                            connect: { id: userId },
                        } }),
                });
            }
            else {
                // Perform create if id is not provided
                return yield __1.prismaClient.guarantorInformation.create({
                    data: Object.assign(Object.assign({}, rest), { user: {
                            connect: { id: userId },
                        } }),
                });
            }
        });
        // Get Guarantor by userId
        this.getGuarantorByUserId = (userId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.guarantorInformation.findMany({
                where: { userId },
            });
        });
        // Get Guarantor by Id
        this.getGuarantorById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.guarantorInformation.findUnique({
                where: { id },
            });
        });
        // Delete Guarantor by ID
        this.deleteGuarantorById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.guarantorInformation.delete({
                where: { id },
            });
        });
    }
}
exports.default = new GuarantorService();