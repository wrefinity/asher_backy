import multer, { Multer } from 'multer';
import path from 'path';
const storage = multer.memoryStorage();
const upload: Multer = multer({ storage: storage });

// Define storage settings
const storageCSV = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../', 'uploads');
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
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

// Configure Multer with storage and file filter
export const uploadcsv = multer({
  storage: storageCSV,
  fileFilter: csvFileFilter,
});

export default upload;