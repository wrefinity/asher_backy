import cookieParser from 'cookie-parser';
import express, { Express } from "express";
import session from "express-session";
import { APP_SECRET, PORT } from "./secrets";
import cors from 'cors';
import http from 'http';
import { WebSocket, WebSocketServer } from "ws";
import { PrismaClient } from "@prisma/client";
import ApplicationRouter from "./routes/applicant";
import ComplaintRoutes from "./routes/complaint";
import AuthRouter from "./routes/auth";
import FileUploads from './routes/fileuploads';
import CategoryRouter from "./routes/category";
import ChatRoomRouter from "./routes/chats";
import EmailRouter from "./routes/email";
import MaintenanceRouter from "./routes/maintenance";
import NotificationRouter from "./routes/notification";
import ProfileRouter from "./routes/profile";
import PropertyRouter from "./routes/property";
import ReviewsRouter from "./routes/reviews";
import VendorServiceRouter from "./routes/services";
import StatusRouter from "./routes/status";
import StateRouter from "./routes/state";
import LogRouter from "./routes/log";
import TransactionRouter from "./routes/transaction";
import WalletRouter from "./routes/wallet";
import UserRouter from "./routes/users";
// import paystackServices from "./services/paystack.services";
import AdsRouter from "./tenant/routes/ads.routes";
import CommunityPostRouter from "./tenant/routes/community-post.routes";
import communityRoutes from "./tenant/routes/community.routes";
import TenantRouter from "./tenant/routes/index";

import LandlordRouter from './landlord/routes/index.routes';
import BankRouter from './routes/bank';
import flutterWaveService from './services/flutterWave.service';


export const prismaClient: PrismaClient = new PrismaClient(
    {
        log: ['query']
    }
);


export const userSockets = new Map<string, WebSocket>();


class Server {
    private app: Express;
    private port: number;
    private appSecret: string;
    private server: http.Server;
    private wss: WebSocketServer;

    constructor(port: number, secret: string) {
        this.app = express();
        this.port = port;
        this.appSecret = secret;

        // Create HTTP server and WebSocket server
        this.server = http.createServer(this.app);
        this.wss = new WebSocketServer({ server: this.server });

        // connectDB();
        this.configureMiddlewares();
        this.configureRoutes();
        this.configureWebSocket();
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
        this.app.use(
            cors()
        );
    }

    private configureWebSocket() {
        this.wss.on("connection", (ws, req) => {
            console.log("New WebSocket connection established");
            ws.on("message", (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    if (typeof data === "object" && data?.event === "register" && data?.receiverEmail) {
                        userSockets.set(data?.receiverEmail, ws as WebSocket);
                        console.log(`User ${data.receiverEmail} connected`);
                    }
                } catch (error) {
                    console.error("Invalid WebSocket message received:", message);
                }
            });
    
            ws.on("close", () => {
                for (const [recieverEmail, socket] of userSockets.entries()) {
                    if (socket === (ws as WebSocket)) {
                        userSockets.delete(recieverEmail);
                        console.log(`User ${recieverEmail} disconnected`);
                        break;
                    }
                }
            });
        });
    }


    public sendToUser(email: string, event: string, data: any) {
        const socket = userSockets.get(email);
        
        if (!socket) {
            console.error(`No WebSocket connection found for user: ${email}`);
            return;
        }
    
        if (socket.readyState !== WebSocket.OPEN) {
            console.error(`WebSocket for user ${email} is not open`);
            return;
        }
    
        console.log(`Sending WebSocket message to: ${email}, Event: ${event}`);
        socket.send(JSON.stringify({ event, data }));
    }
    

    private configureRoutes() {
        // Add routes here
        this.app.get("/", (req, res) => res.json({ message: "it is working" }));
        // this.app.post("/paystack/webhook", (req, res) => paystackServices.handleWebhook(req, res))
        this.app.post("/flutterwave/webhook", (req, res) => flutterWaveService.handleWebhook(req, res))
        this.app.use("/api/auth", AuthRouter);
        this.app.use("/api/file-uploads", FileUploads);
        this.app.use("/api/status", StatusRouter);
        this.app.use("/api/state", StateRouter);
        this.app.use("/api/logs/", LogRouter);
        this.app.use("/api/notification", NotificationRouter)
        this.app.use("/api/categories", CategoryRouter)
        this.app.use("/api/profile", ProfileRouter);
        this.app.use("/api/vendor/services", VendorServiceRouter);
        this.app.use("/api/application", ApplicationRouter);
        this.app.use("/api/emails", EmailRouter);
        this.app.use("/api/chats", ChatRoomRouter);
        this.app.use("/api/users", UserRouter);
        this.app.use("/api/properties", PropertyRouter);
        this.app.use("/api/maintenance", MaintenanceRouter);
        this.app.use("/api/community-post", CommunityPostRouter)
        this.app.use("/api/tenants/community", communityRoutes);
        this.app.use("/api/ads", AdsRouter);
        this.app.use("/api/transactions", TransactionRouter);
        this.app.use("/api/reviews", ReviewsRouter);
        this.app.use("/api/landlord", LandlordRouter);
        this.app.use("/api/wallet", WalletRouter);
        this.app.use("/api/tenants", TenantRouter);
        // bank information routes
        this.app.use("/api/banks/", BankRouter);
        this.app.use("/api/complaints", ComplaintRoutes);
    }

    public start() {
        this.server.listen(this.port, () => { 
            console.log(`Server running on port ${this.port}`);
        });
    }
    
    public broadcast(event: string, data: any) {
        this.wss.clients.forEach(client => {
            if (client.readyState === 1) {
                client.send(JSON.stringify({ event, data }));
            }
        });
    }
}

const sServer = new Server(Number(PORT), APP_SECRET);
sServer.start();

export { sServer };