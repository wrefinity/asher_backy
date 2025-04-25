import { Router } from "express";
import { userRoles } from '@prisma/client';
import { Authorize } from "../../middlewares/authorize";
import LandlordControl from "../controllers/landlord.controller";
import ApplicationRouter from "./application.routes";
import TenantsRouter from "./tenants.routes";
import PropertyRouter from "./property.routes";
import MaintenanceRouter from "./maintenance.routes";
import ComplaintRouterRouter from "./complaint.routes";
import DocumentRouter from "./documents.route";

import TaskRouter from './task.routes';
import InventoryRouter from './inventory.routes';
import BillRouter from './bill.routes';
import BroadcastRouter from './broadcast.routes';

import FinanceRouter from './finance.routes';
import LandlordTransactionRouter from './landlord-transaction.routes';
class LandlordRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        this.router.use(this.authenticateService.authorizeRole(userRoles.LANDLORD))
         // update landlord informations route
         this.router.get(
            '/info',
            LandlordControl.getLandlordInfo
        );
        this.router.post(
            '/info',
            LandlordControl.updateLandlordProfile
        );
        this.router.get(
            '/',
            LandlordControl.getAllLandlords
        );

        this.router.get(
            '/:id',
            LandlordControl.getLandlordUsingId
        );

        this.router.patch(
            '/:id',
            LandlordControl.updateLandlord
        );

        this.router.delete(
            '/:id',
            LandlordControl.deleteLandlord
        );

        this.router.get(
            '/jobs/current',
            LandlordControl.getCurrentJobsForLandordProperties
        );
        this.router.get(
            '/jobs/completed',
            LandlordControl.getCompletedVendorsJobsForLandordProperties
        );
        // complaints modules under landlord
        this.router.use("/complaints", ComplaintRouterRouter)
        // document modules under landlord
        this.router.use("/documents", DocumentRouter)
        // maintenances modules under landlord
        this.router.use("/maintenance", MaintenanceRouter)
        // tenants modules under landlord
        this.router.use("/tenants", TenantsRouter)
        // applications modules under landlord
        this.router.use('/application', ApplicationRouter);
        // properties modules under landlord
        this.router.use('/properties', PropertyRouter);
        // appartments
        // tasks routes routes
        this.router.use("/tasks", TaskRouter);
        // inventory routes routes
        this.router.use("/inventory", InventoryRouter);
        // bills routes routes
        this.router.use("/bills", BillRouter);

        this.router.use("/transactions", LandlordTransactionRouter);
        this.router.use("/finance", FinanceRouter);

        //braodcast routes
        this.router.use('/broadcast', BroadcastRouter)
    }
}

export default new LandlordRouter().router
