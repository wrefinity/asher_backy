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
import InspectionRouter from "./inspection.routes";

import TaskRouter from './task.routes';
import InventoryRouter from './inventory.routes';
import BillRouter from './bill.routes';
import BroadcastRouter from './broadcast.routes';
import SupportRouter from './support.routes';

import FinanceRouter from './finance.routes';
import LandlordTransactionRouter from './landlord-transaction.routes';
import AnalyticsRouter from './analytics.routes';
import ReportsRouter from './reports.routes';
import PaymentRouter from './payment.routes';
import LeaseRenewalRouter from './leaseRenewal.routes';
import LandlordEventRouter from './landlordEvent.routes';
import PropertyValueRouter from './propertyValue.routes';
import StorageAnalyticsRouter from './storageAnalytics.routes';
import violationRoutes from "./violation.routes";
import { validateBody } from "../../middlewares/validation";
import { updateLandlordSchema } from "../../validations/schemas/auth";
import { valid } from "joi/lib";
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
            validateBody(updateLandlordSchema),
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
            validateBody(updateLandlordSchema),
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

        this.router.get(
            '/locations/list',
            LandlordControl.getCurrentLocations
        );
        this.router.get(
            '/properties/list',
            LandlordControl.getLandlordProperties
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
        this.router.use("/supports", SupportRouter);

        this.router.use("/transactions", LandlordTransactionRouter);
        this.router.use("/finance", FinanceRouter);

        // Payment management routes
        this.router.use("/payments", PaymentRouter);

        // Analytics routes
        this.router.use("/analytics", AnalyticsRouter);
        
        // Reports routes  
        this.router.use("/reports", ReportsRouter);
        //broadcast routes
        this.router.use('/broadcast', BroadcastRouter)
        // inspections
        this.router.use('/inspections', InspectionRouter)
        // lease renewal routes
        this.router.use('/lease-renewals', LeaseRenewalRouter)
        // landlord event routes
        this.router.use('/events', LandlordEventRouter)
        // property value routes
        this.router.use('/property-values', PropertyValueRouter)
        // storage analytics routes
        this.router.use('/violation', violationRoutes)
        this.router.use('/storage', StorageAnalyticsRouter)
    }
}

export default new LandlordRouter().router