import { Router } from "express";
import CategoryControls from '../controllers/category';
import SubCategoryControls from '../controllers/subcategory';
import { Authorize } from "../middlewares/authorize";
import { uploadToCloudinary } from '../middlewares/multerCloudinary';
import upload from "../configs/multer";
class ApplicantRoutes {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize()
        this.initializeRoutes();
    }
  
    
  
    private initializeRoutes(): void {
        //sub-categories
        this.router.get('/sub',  SubCategoryControls.getAllSubCategories);
        this.router.post('/sub/:categoryId', this.authenticateService.authorize, upload.array('files'), uploadToCloudinary, SubCategoryControls.createSubCategory);
        this.router.get('/sub/:id',  SubCategoryControls.getSubCategoryById);
        this.router.patch('/sub/:id',  SubCategoryControls.updateSubCategory);
        this.router.delete('/sub/:id', this.authenticateService.authorize,  SubCategoryControls.deleteSubCategory);
        //categories
        this.router.post('/', this.authenticateService.authorize, upload.array('files'), uploadToCloudinary, CategoryControls.createCategory);
        this.router.get('/',  CategoryControls.getAllCategories);
        this.router.get('/:id',  CategoryControls.getCategoryById);
        this.router.patch('/:id',  CategoryControls.updateCategory);
        this.router.delete('/:id', this.authenticateService.authorize,  CategoryControls.deleteCategory);

    }
}

export default new ApplicantRoutes().router;
