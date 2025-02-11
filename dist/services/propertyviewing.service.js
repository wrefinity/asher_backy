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
const __1 = require("..");
class PropertyViewingService {
    constructor() {
        this.createViewing = (data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.propertyViewing.create({ data });
        });
        this.getAllViewings = () => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.propertyViewing.findMany();
        });
        this.getAllPropertyViewing = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.propertyViewing.findMany({
                where: { propertyId },
                include: {
                    property: true,
                    user: {
                        select: {
                            id: true,
                            email: true,
                            profileId: true,
                            profile: true,
                        }
                    }
                }
            });
        });
        this.getViewingById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.propertyViewing.findUnique({ where: { id } });
        });
        this.updateViewing = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.propertyViewing.update({
                where: { id },
                data,
            });
        });
        this.deleteViewing = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.propertyViewing.delete({ where: { id } });
        });
    }
}
exports.default = new PropertyViewingService();
