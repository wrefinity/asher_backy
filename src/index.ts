import express, { Express } from "express";
import session from "express-session";
import cookieParser from 'cookie-parser';
import cors from 'cors';
import http from 'http';
import { WebSocket, WebSocketServer } from "ws";
import { Server as IOServer } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { APP_SECRET, PORT } from "./secrets";

// Import Routes
import AuthRouter from "./routes/auth";
import ApplicationRouter from "./routes/applicant";
import ComplaintRoutes from "./routes/complaint";
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
import AdsRouter from "./tenant/routes/ads.routes";
import CommunityPostRouter from "./tenant/routes/community-post.routes";
import communityRoutes from "./tenant/routes/community.routes";
import TenantRouter from "./tenant/routes/index";
import LandlordRouter from './landlord/routes/index.routes';
import BankRouter from './routes/bank';
import flutterWaveService from './services/flutterWave.service';

// WebSocket tracking
export const prismaClient = new PrismaClient({ log: ['query'] });
export const userSockets = new Map<string, WebSocket>(); // for WSS (emails)

class Server {
    private app: Express;
    private port: number;
    private server: http.Server;
    public io: IOServer;
    private wss: WebSocketServer;

    constructor(port: number, secret: string) {
        this.app = express();
        this.port = port;

        // HTTP server + WebSocket server
        this.server = http.createServer(this.app);
        this.io = new IOServer(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        this.wss = new WebSocketServer({ noServer: true });

        this.configureMiddlewares(secret);
        this.configureRoutes();
        this.configureSocketIO();
        this.configureWSS();
    }

    private configureMiddlewares(secret: string) {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(cookieParser());
        this.app.use(cors());
        this.app.use(session({
            secret,
            resave: false,
            saveUninitialized: false
        }));
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
        // this.app.use("/api/generator", GeneratorRouter);
        // bank information routes
        this.app.use("/api/banks/", BankRouter);
        this.app.use("/api/complaints", ComplaintRoutes);
    }

    // Socket.IO – Real-time chat messages
    private configureSocketIO() {
        this.io.on("connection", (socket) => {
            console.log("🔌 Chat client connected");

            socket.on("join", ({ senderId }) => {
                socket.join(senderId);
                console.log(`User ${senderId} joined their personal chat room`);
            });

            socket.on("privateMessage", ({ senderId, receiverId, message }) => {
                const payload = { senderId, message, timestamp: new Date() };
                this.io.to(receiverId).emit("privateMessage", payload);
                console.log(`📩 Message from ${senderId} to ${receiverId}`);
            });

            socket.on("disconnect", () => {
                console.log("❌ Chat client disconnected");
            });
        });
    }

    // WebSocket – In-house email
    private configureWSS() {
        this.server.on("upgrade", (req, socket, head) => {
            const pathname = req.url;
            if (pathname === "/email") {
                this.wss.handleUpgrade(req, socket, head, (ws) => {
                    this.wss.emit("connection", ws, req);
                });
            }
        });

        this.wss.on("connection", (ws, req) => {
            console.log("📡 Email socket connected");
            ws.on("message", (message) => {
                try {
                    const data = JSON.parse(message.toString());

                    if (data?.event === "register" && data?.receiverEmail) {
                        userSockets.set(data.receiverEmail, ws);
                        console.log(`📬 Registered email socket for ${data.receiverEmail}`);
                    }
                } catch (err) {
                    console.error("❗Invalid email message format");
                }
            });
            ws.on("close", () => {
                for (const [email, socket] of userSockets.entries()) {
                    if (socket === ws) {
                        userSockets.delete(email);
                        console.log(`📭 Email socket disconnected for ${email}`);
                        break;
                    }
                }
            });
        });
    }

    public sendToUserEmail(email: string, event: string, data: any) {
        // frontend connects to ws://localhost:PORT/email
        const socket = userSockets.get(email);
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            console.error(`No active email socket for: ${email}`);
            return;
        }
        socket.send(JSON.stringify({ event, data }));
    }

    public start() {
        this.server.listen(this.port, () => {
            console.log(`🚀 Server running on http://localhost:${this.port}`);
            console.log(`💬 Chat Socket.IO running on /socket.io`);
            console.log(`📡 Email WebSocket running on /email`);
        });
    }
}

const serverInstance = new Server(Number(PORT), APP_SECRET);
serverInstance.start();
export { serverInstance };