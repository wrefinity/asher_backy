"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const loggers_1 = __importDefault(require("../utils/loggers"));
class ErrorService {
    handleError(error, res) {
        console.log(error);
        if (error instanceof Error) {
            loggers_1.default.error("An error occured", error);
            return res.status(400).json({ message: error.message });
        }
        else {
            loggers_1.default.error("An unknown error occured", error);
            return res.status(500).json({ message: "An unknow error occured" });
        }
    }
}
exports.default = new ErrorService();
