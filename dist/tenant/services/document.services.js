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
const __1 = require("../..");
class DocumentService {
    constructor() {
        this.getUserDocuments = (userId) => __awaiter(this, void 0, void 0, function* () {
            try {
                const applications = yield __1.prismaClient.application.findMany({
                    where: { userId },
                    include: {
                        documents: true,
                    },
                });
                const documents = applications.flatMap((app) => app.documents);
                return documents;
            }
            catch (error) {
                throw new Error('Error retrieving documents');
            }
        });
        this.getAllDocuments = () => __awaiter(this, void 0, void 0, function* () {
            try {
                const applications = yield __1.prismaClient.application.findMany({
                    include: {
                        documents: true,
                    },
                });
                const documents = applications.flatMap((app) => app.documents);
                return documents;
            }
            catch (error) {
                throw new Error('Error retrieving documents');
            }
        });
    }
}
exports.default = new DocumentService();
