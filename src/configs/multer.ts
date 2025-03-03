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
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: csvFileFilter,
});


// for bulk upload on endpoint with array data 
// including a files and other data

// File filter to allow only PDFs and images
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only images and PDFs are allowed!"), false);
  }
};

export const uploadControl = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});


export default upload;