"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDateField = exports.parseCSV = void 0;
const fs_1 = __importDefault(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const parseCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        // Read the file content
        fs_1.default.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            // Remove BOM if present
            const content = data.charCodeAt(0) === 0xFEFF ? data.slice(1) : data;
            // Create a readable stream from the content
            const stream = require('stream');
            const readableStream = new stream.Readable();
            readableStream.push(content);
            readableStream.push(null);
            readableStream
                .pipe((0, csv_parser_1.default)())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', (error) => reject(error));
        });
    });
};
exports.parseCSV = parseCSV;
const parseDateField = (dateString) => {
    // Check if the dateString is valid
    if (dateString && !isNaN(Date.parse(dateString))) {
        // Convert to ISO 8601 format
        return new Date(dateString).toISOString();
    }
    else {
        // Handle invalid date formats
        console.error(`Invalid date format: ${dateString}`);
        return null;
    }
};
exports.parseDateField = parseDateField;
