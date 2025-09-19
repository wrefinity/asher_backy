import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import upload from "../configs/multer";
import { uploadToCloudinary } from "../middlewares/multerCloudinary";
import BankInfoController from "../controllers/bank.controller";

class BankRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
        // Create a new bank info
        this.router.post('/bank-info', this.authenticateService.authorize, BankInfoController.createBankInfo);
        // Get a bank info by ID
        this.router.get('/bank-info/:id', this.authenticateService.authorize, BankInfoController.getBankInfo);
        // Update a bank info by ID
        this.router.put('/bank-info/:id', this.authenticateService.authorize, BankInfoController.updateBankInfo);
        // Delete a bank info by ID
        this.router.delete('/bank-info/:id', this.authenticateService.authorize, BankInfoController.deleteBankInfo);
        // Get all bank info records
        this.router.get('/bank-info', this.authenticateService.authorize, BankInfoController.getAllBankInfo);
        // Add to your bank router
        this.router.get('/my-bank', this.authenticateService.authorize, BankInfoController.getMyBankInfo);
    }
}

export default new BankRouter().router