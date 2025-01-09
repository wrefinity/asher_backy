import fs from 'fs';
import csv from 'csv-parser';

interface ParsedData {
  [key: string]: string | string[];
  
}

export const parseCSV = (filePath: string): Promise<ParsedData[]> => {
  return new Promise((resolve, reject) => {
    const results: ParsedData[] = [];

    // Read the file content
    fs.readFile(filePath, 'utf8', (err, data) => {
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
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  });
};


export const parseDateField = (dateString) => {
  // Check if the dateString is valid
  if (dateString && !isNaN(Date.parse(dateString))) {
    // Convert to ISO 8601 format
    return new Date(dateString).toISOString();
  } else {
    // Handle invalid date formats
    console.error(`Invalid date format: ${dateString}`);
    return null;
  }
}