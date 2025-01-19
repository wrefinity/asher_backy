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
class RefereeService {
    constructor() {
        // Upsert Referee Information
        this.upsertRefereeInfo = (data) => __awaiter(this, void 0, void 0, function* () {
            const { userId, id } = data, rest = __rest(data, ["userId", "id"]);
            if (id) {
                // Check if the referee exists
                const existingReferee = yield this.getRefereeById(id);
                if (!existingReferee) {
                    throw new Error(`Referee with ID ${id} does not exist.`);
                }
                // Perform update if ID exists
                return yield __1.prismaClient.referees.update({
                    where: { id },
                    data: Object.assign(Object.assign({}, rest), { user: userId ? { connect: { id: userId } } : undefined }),
                });
            }
            else {
                // Perform create if ID does not exist
                return yield __1.prismaClient.referees.create({
                    data: Object.assign(Object.assign({}, rest), { user: userId ? { connect: { id: userId } } : undefined }),
                });
            }
        });
        // Get Referee by userId
        this.getRefereeByUserId = (userId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.referees.findMany({
                where: { userId },
            });
        });
        // Get Referee by ID
        this.getRefereeById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.referees.findUnique({
                where: { id },
            });
        });
        // Delete Referee by ID
        this.deleteRefereeById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.referees.delete({
                where: { id },
            });
        });
    }
}
exports.default = new RefereeService();
