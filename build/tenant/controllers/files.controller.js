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
const error_service_1 = __importDefault(require("../../services/error.service"));
const document_services_1 = __importDefault(require("../services/document.services"));
class DocumentController {
    constructor() {
        this.getUserDocuments = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const documents = yield document_services_1.default.getUserDocuments(userId);
                res.status(200).json({ documents });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getAllDocuments = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const documents = yield document_services_1.default.getAllDocuments();
                res.status(200).json({ documents });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new DocumentController();
