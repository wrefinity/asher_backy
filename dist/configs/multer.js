"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadcsv = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage: storage });
// Define storage settings
const storageCSV = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path_1.default.join(__dirname, '../../', 'uploads');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
// Define file filter to allow only CSV files
const csvFileFilter = (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
        cb(null, true);
    }
    else {
        cb(new Error('Only CSV files are allowed'), false);
    }
};
// Configure Multer with storage and file filter
exports.uploadcsv = (0, multer_1.default)({
    storage: storageCSV,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: csvFileFilter,
});
exports.default = upload;
