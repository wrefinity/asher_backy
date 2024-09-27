import { Router } from "express";
import { userRoles } from '@prisma/client';
import { Authorize } from "../../middlewares/authorize";
import LandlordControl from "../controllers/landlord.controller";
import ApplicationRouter from "./application.routes";
import TenantsRouter from "./tenants.routes";
import PropertyRouter from "./property.routes";
import AppartmentRoute from "./apartment.routes";
import MaintenanceRouter from "./maintenance.routes";

import TaskRouter from './task.routes';
import InventoryRouter from './inventory.routes';
import BillRouter from './bill.routes';

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
        this.router.get(
            '/',
            LandlordControl.getAllLandlords
        );

        this.router.get(
            '/:id',
            LandlordControl.getLandlordById
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
        // maintenances modules under landlord
        this.router.use("/maintenance", MaintenanceRouter)
        // tenants modules under landlord
        this.router.use("/tenants", TenantsRouter)
        // applications modules under landlord
        this.router.use('/application', ApplicationRouter);
        // properties modules under landlord
        this.router.use('/properties', PropertyRouter);
        // appartments
        this.router.use('/apartments', AppartmentRoute);
        // tasks routes routes
        this.router.use("/tasks", TaskRouter);
        // inventory routes routes
        this.router.use("/inventory", InventoryRouter);
        // bills routes routes
        this.router.use("/bills", BillRouter);

        this.router.use("/transaction", LandlordTransactionRouter);
        this.router.use("/finance", FinanceRouter);

    }
}

export default new LandlordRouter().router
