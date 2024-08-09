import cookieParser from 'cookie-parser';
import express, { Express } from "express";
import session from "express-session";
import connectDB from './db/mongo_connnect';
// import passport from "passport";
import ApplicationRouter from "./routes/applicant";
import AuthRouter from "./routes/auth";
import CategoryRouter from "./routes/category";
import ChatRoomRouter from "./routes/chats";
import EmailRouter from "./routes/email";
import ProfileRouter from "./routes/profile";
import PropertyRouter from "./routes/property";
import StatusRouter from "./routes/status";
import TransactionRouter from "./routes/transaction";
import NotificationRouter from "./routes/notification";
import { APP_SECRET, PORT } from "./secrets";

import { PrismaClient } from "@prisma/client";
import MaintenanceRouter from "./routes/maintenance";
import VendorServiceRouter from "./routes/services";
import WalletRouter from "./routes/wallet";
import paystackServices from "./services/paystack.services";
import AdsRouter from "./tenant/routes/ads.routes";
import CommunityPostRouter from "./tenant/routes/community-post.routes";
import communityRoutes from "./tenant/routes/community.routes";
import TenantDashboardRouter from "./tenant/routes/dashboard.routes";
import SupportRouter from "./tenant/routes/support-tenant.routes";
import JobManager from './jobManager';


export const prismaClient: PrismaClient = new PrismaClient(
    {
        log: ['query']
    }
);

class Server {
    private app: Express;
    private port: number;
    private appSecret: string;

    constructor(port: number, secret: string) {
        this.app = express();
        this.port = port;
        this.appSecret = secret;
        connectDB();
        this.configureMiddlewares();
        this.configureRoutes();
    }

    private configureMiddlewares() {
        // middlewares here
        this.app.use(express.json()); // for content-body parameters
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(session({
            secret: this.appSecret,
            resave: false,
            saveUninitialized: false
        }));
        this.app.use(cookieParser());
    }

    private configureRoutes() {
        // Add routes here
        this.app.get("/", (req, res) => res.json({ message: "it is working" }));
        this.app.post("/paystack/webhook", (req, res) => paystackServices.handleWebhook(req, res))
        this.app.use("/api/auth", AuthRouter);
        this.app.use("/api/status", StatusRouter);
        this.app.use("/api/notification", NotificationRouter)
        this.app.use("/api/categories", CategoryRouter)
        this.app.use("/api/profile", ProfileRouter);
        this.app.use("/api/vendor/services", VendorServiceRouter);
        this.app.use("/api/application", ApplicationRouter);
        this.app.use("/api/emails", EmailRouter);
        this.app.use("/api/chats", ChatRoomRouter);
        this.app.use("/api/properties", PropertyRouter);
        this.app.use("/api/maintenance", MaintenanceRouter);
        this.app.use("/api/community-post", CommunityPostRouter)
        this.app.use("/api/tenants/community", communityRoutes);
        this.app.use("/api/ads", AdsRouter);
        this.app.use("/api/transactions", TransactionRouter);
        this.app.use("/api/wallet", WalletRouter);
        this.app.use("/api/tenant/dashboard", TenantDashboardRouter);

    }

    public start() {
        this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });
        JobManager.startJobs()
    }
}

const server = new Server(Number(PORT), APP_SECRET);
server.start();
