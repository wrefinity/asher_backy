import express, { Express } from "express";
import session from "express-session";
import cookieParser from 'cookie-parser';
import cors from 'cors';
import http from 'http';
import { WebSocket, WebSocketServer } from "ws";
import { Server as IOServer } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { APP_SECRET, PORT } from "./secrets";

import AuthRouter from "./routes/auth";
import ApplicationRouter from "./routes/application";
import ComplaintRoutes from "./routes/complaint";
import SuggestionRoutes from "./routes/suggestion";
import FileUploads from './routes/fileuploads';
import CategoryRouter from "./routes/category";
import TodoRouter from "./routes/todo";
import ChatRoomRouter from "./routes/chats";
import EmailRouter from "./routes/email";
import MaintenanceRouter from "./routes/maintenance";
import NotificationRouter from "./routes/notification";
import ProfileRouter from "./routes/profile";
import PropertyRouter from "./routes/property";
import PreferenceRoute from "./routes/preference";
import ReviewsRouter from "./routes/reviews";
import PayoutRouter from "./routes/payout";
import StatusRouter from "./routes/status";
import StateRouter from "./routes/state";
import LogRouter from "./routes/log";
import TransactionRouter from "./routes/transaction";
import WalletRouter from "./routes/wallet";
import UserRouter from "./routes/users";
import DocuSignRouter from "./routes/docusign";
import AdsRouter from "./tenant/routes/ads.routes";
import communityRoutes from "./routes/community.routes";
import VendorRouter from "./vendor/routes/index.routes";
import TenantRouter from "./tenant/routes/index";
import LandlordRouter from './landlord/routes/index.routes';
import BankRouter from './routes/bank';
import flutterWaveService from './services/flutterWave.service';
import { ApiError } from "./utils/ApiError";
import PaymentNotificationService from "./services/paymentNotification.service";
import loggers from "./utils/loggers";
import supportContentRoutes from "./routes/supportContent.routes";
import adminRouter from "./routes/admin.routes";
import CreditScoreRouter from "./routes/creditScore.routes";

// WebSocket tracking
// Configure Prisma with connection pooling to prevent connection exhaustion
export const prismaClient = new PrismaClient({ 
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});
export const userSockets = new Map<string, WebSocket>();
class Server {
    private app: Express;
    private port: number;
    private server: http.Server;
    public io: IOServer;
    private wss: WebSocketServer;
    public paymentNotificationService: PaymentNotificationService;

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
        this.initializePaymentNotifications();
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
           // Health check routes
        this.app.get("/", (req, res) => res.json({ message: "it is working" }));
        this.app.get("/health", (req, res) => this.healthCheck(req, res));
        this.app.get("/health/websocket", (req, res) => this.websocketHealthCheck(req, res));

        // Webhooks
        // this.app.post("/paystack/webhook", (req, res) => paystackServices.handleWebhook(req, res))
        this.app.post("/flutterwave/webhook", (req, res) => flutterWaveService.handleWebhook(req, res))
        this.app.use("/api/auth", AuthRouter);
        this.app.use("/api/file-uploads", FileUploads);
        this.app.use("/api/status", StatusRouter);
        this.app.use("/api/state", StateRouter);
        this.app.use("/api/logs", LogRouter);
        this.app.use("/api/todos", TodoRouter);
        this.app.use("/api/notification", NotificationRouter)
        this.app.use("/api/categories", CategoryRouter)
        this.app.use("/api/profile", ProfileRouter);
        this.app.use("/api/vendors", VendorRouter);
        this.app.use("/api/application", ApplicationRouter);
        this.app.use("/api/emails", EmailRouter);
        this.app.use("/api/chats", ChatRoomRouter);
        this.app.use("/api/users", UserRouter);
        this.app.use("/api/preferences", PreferenceRoute);
        this.app.use("/api/properties", PropertyRouter);
        this.app.use("/api/maintenance", MaintenanceRouter);
        this.app.use("/api/community", communityRoutes);
        this.app.use("/api/credit-score", CreditScoreRouter);
        this.app.use("/api/admin", adminRouter);
        this.app.use("/api/ads", AdsRouter);
        this.app.use("/api/transactions", TransactionRouter);
        this.app.use("/api/reviews", ReviewsRouter);
        this.app.use("/api/landlord", LandlordRouter);
        this.app.use("/api/wallet", WalletRouter);
        this.app.use("/api/tenants", TenantRouter);
        this.app.use("/api/payouts", PayoutRouter);
        this.app.use("/api/docusign", DocuSignRouter);
        // this.app.use("/api/generator", GeneratorRouter);
        this.app.use("/api/banks", BankRouter);
        this.app.use("/api/complaints", ComplaintRoutes);
        this.app.use("/api/suggestions", SuggestionRoutes);
        this.app.use("/api/support-content", supportContentRoutes);

        // Global error handler must come last
        this.app.use(
            (
                err: any,
                req: express.Request,
                res: express.Response,
                next: express.NextFunction
            ) => {
                console.error("Error caught:", err);

                if (err instanceof ApiError) {
                    return res.status(err.statusCode).json({
                        success: err.success,
                        message: err.message,
                        code: err.data.code,
                        errors: err.data.errors || [],
                        details: err.data.details || {},
                    });
                }

                return res.status(500).json({
                    success: false,
                    message: "Internal Server Error",
                    code: "INTERNAL_ERROR",
                    errors: ["Internal Server Error"],
                });
            }
        );
    }

    // Health check endpoint
    private healthCheck(req: express.Request, res: express.Response) {
        const { getMongoStatus } = require('./db/mongo_connnect');
        const mongoStatus = getMongoStatus();

        // App is healthy if MongoDB is connected OR if it's intentionally disabled
        const isHealthy = mongoStatus.status === 'connected' || mongoStatus.disabled;

        const health = {
            status: isHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            socketIO: {
                connected: this.io.engine.clientsCount || 0,
            },
            webSocket: {
                emailConnections: userSockets.size,
            },
            mongodb: {
                status: mongoStatus.status,
                readyState: mongoStatus.readyState,
                disabled: mongoStatus.disabled,
                note: mongoStatus.disabled ? 'MongoDB is optional - app running without it' : undefined,
            },
            queue: {
                // Queue health will be checked separately
                status: 'unknown',
            },
        };

        res.status(200).json(health);
    }

    // WebSocket-specific health check
    private websocketHealthCheck(req: express.Request, res: express.Response) {
        const wsHealth = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            socketIO: {
                namespace: '/',
                connected: this.io.engine.clientsCount || 0,
                rooms: Array.from(this.io.sockets.adapter.rooms.keys()),
            },
            emailWebSocket: {
                connected: userSockets.size,
                users: Array.from(userSockets.keys()),
            },
        };

        res.status(200).json(wsHealth);
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
            console.log(`Server running on http://localhost:${this.port}`);
            console.log(`Chat Socket.IO running on /socket.io`);
            console.log(`Email WebSocket running on /email`);
        });
    }

    private initializePaymentNotifications() {
        // Initialize payment notification service
        this.paymentNotificationService = new PaymentNotificationService(this.io);

        // Set up user room joining for Socket.IO
        this.io.on('connection', (socket) => {
            console.log('🔌 User connected for payment notifications:', socket.id);

            // Join user to their personal room
            socket.on('join_user_room', (userId: string) => {
                socket.join(`user:${userId}`);
                console.log(`User ${userId} joined payment notification room`);
            });

            // Leave user room
            socket.on('leave_user_room', (userId: string) => {
                socket.leave(`user:${userId}`);
                console.log(`👋 User ${userId} left payment notification room`);
            });

            socket.on('disconnect', () => {
                console.log('🔌 User disconnected from payment notifications:', socket.id);
            });
        });

        // Schedule periodic checks for due and overdue bills
        this.scheduleBillChecks();

        console.log('🔔 Payment notification service initialized');
    }

    private scheduleBillChecks() {
        // Check for due bills every hour
        setInterval(async () => {
            try {
                await this.paymentNotificationService.checkAndSendDueBillsReminders();
            } catch (error) {
                loggers.error('Error in scheduled due bills check:', error);
            }
        }, 60 * 60 * 1000);

        // Check for overdue bills every 6 hours
        setInterval(async () => {
            try {
                await this.paymentNotificationService.checkAndSendOverdueBillsNotifications();
            } catch (error) {
                loggers.error('Error in scheduled overdue bills check:', error);
            }
        }, 6 * 60 * 60 * 1000);
        loggers.info('Scheduled bill checks initialized');
    }


}

const serverInstance = new Server(Number(PORT), APP_SECRET);
serverInstance.start();
export { serverInstance };