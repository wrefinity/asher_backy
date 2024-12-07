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
exports.PropertyDocumentService = void 0;
const __1 = require("..");
class PropertyDocumentService {
    constructor() {
        this.create = (data) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertyDocument.create({ data });
        });
        this.findAll = () => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertyDocument.findMany();
        });
        this.findById = (id) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertyDocument.findUnique({ where: { id } });
        });
        this.update = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertyDocument.update({
                where: { id },
                data: data,
            });
        });
        this.delete = (id) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertyDocument.delete({ where: { id } });
        });
    }
}
exports.PropertyDocumentService = PropertyDocumentService;
