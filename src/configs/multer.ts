import multer, { Multer } from 'multer';

const storage = multer.memoryStorage();
const upload: Multer = multer({ storage: storage });

export default upload;