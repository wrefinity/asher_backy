import express, { Express } from "express";
import session from "express-session";
import cookieParser from 'cookie-parser';
import cors from 'cors';
import http from 'http';
import { WebSocket, WebSocketServer } from "ws";
import { Server as IOServer } from "socket.io";
import { APP_SECRET, PORT } from "./secrets";
import swaggerUi from 'swagger-ui-express';
import AuthRouter from "./routes/auth";
import ApplicationRouter from "./routes/application";
import swaggerSpec, { attachExpressRoutesToSwagger } from "./configs/swagger";
import ComplaintRoutes from "./routes/complaint";
import SuggestionRoutes from "./routes/suggestion";
import FileUploads from './routes/fileuploads';
import CategoryRouter from "./routes/category";
import TodoRouter from "./routes/todo";
import ChatRoomRouter from "./routes/chats";
import EmailRouter from "./routes/email";
import ContactsRouter from "./routes/contacts";
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
import TenantInspectionRouter from "./tenant/routes/inspection.routes";
import LandlordRouter from './landlord/routes/index.routes';
import BankRouter from './routes/bank';
import flutterWaveService from './services/flutterWave.service';
import stripeService from './services/stripe.service';
import paystackServices from './services/paystack.services';
import { ApiError } from "./utils/ApiError";
import PaymentNotificationService from "./services/paymentNotification.service";
import loggers from "./utils/loggers";
import supportContentRoutes from "./routes/supportContent.routes";
import adminRouter from "./routes/admin.routes";
import CreditScoreRouter from "./routes/creditScore.routes";
import AIRouter from "./routes/ai.routes";
import { prismaClient } from "./db/prismaClient";

export { prismaClient };
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
        // Required for accurate client IP behind reverse proxies (login sessions, geo, etc.)
        this.app.set('trust proxy', 1);

        // Payment webhooks require the raw request body for signature verification
        this.app.post(
            '/stripe/webhook',
            express.raw({ type: 'application/json' }),
            (req, res) => stripeService.handleWebhook(req, res)
        );
        this.app.post(
            '/paystack/webhook',
            express.raw({ type: 'application/json' }),
            (req, res) => paystackServices.handleWebhook(req, res)
        );
        this.app.post(
            '/flutterwave/webhook',
            express.raw({ type: 'application/json' }),
            (req, res) => flutterWaveService.handleWebhook(req, res)
        );

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

        // Webhooks are registered in configureMiddlewares (raw body required)
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
        this.app.use("/api/contacts", ContactsRouter);
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
        this.app.use("/api/inspections", TenantInspectionRouter);
        this.app.use("/api/payouts", PayoutRouter);
        this.app.use("/api/docusign", DocuSignRouter);
        // this.app.use("/api/generator", GeneratorRouter);
        this.app.use("/api/banks", BankRouter);
        this.app.use("/api/complaints", ComplaintRoutes);
        this.app.use("/api/suggestions", SuggestionRoutes);
        this.app.use("/api/support-content", supportContentRoutes);
        this.app.use("/api/ai", AIRouter);

        // Attach swagger docs after routes are fully registered so every route can be introspected
        attachExpressRoutesToSwagger(this.app);
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

    // Socket.IO – chat, notifications, and payment rooms (single connection handler)
    private configureSocketIO() {
        const socketDebug = process.env.SOCKET_DEBUG === 'true';

        this.io.on("connection", (socket) => {
            if (socketDebug) {
                console.log(`🔌 Socket connected: ${socket.id}`);
            }

            socket.on("join", ({ senderId }) => {
                socket.join(senderId);
            });

            socket.on("privateMessage", ({ senderId, receiverId, message }) => {
                const payload = { senderId, message, timestamp: new Date() };
                this.io.to(receiverId).emit("privateMessage", payload);
            });

            socket.on('join_user_room', (userId: string) => {
                socket.join(`user:${userId}`);
            });

            socket.on('leave_user_room', (userId: string) => {
                socket.leave(`user:${userId}`);
            });

            socket.on("disconnect", () => {
                if (socketDebug) {
                    console.log(`🔌 Socket disconnected: ${socket.id}`);
                }
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
        this.paymentNotificationService = new PaymentNotificationService(this.io);
        this.scheduleBillChecks();
        console.log('🔔 Payment notification service initialized');
    }

    private scheduleBillChecks() {
        void this.removeStaleBillReminderJobs();
        // Check for due bills once per day (reminders are sent at most once per month per bill)
        setInterval(async () => {
            try {
                await this.paymentNotificationService.checkAndSendDueBillsReminders();
            } catch (error) {
                loggers.error('Error in scheduled due bills check:', error);
            }
        }, 24 * 60 * 60 * 1000);

        // Check for overdue bills once per day (same monthly dedup applies)
        setInterval(async () => {
            try {
                await this.paymentNotificationService.checkAndSendOverdueBillsNotifications();
            } catch (error) {
                loggers.error('Error in scheduled overdue bills check:', error);
            }
        }, 24 * 60 * 60 * 1000);

        // Lease renewal reminders — daily
        setInterval(async () => {
            try {
                const LeaseRenewalService = (await import('./services/leaseRenewal.service')).default;
                await LeaseRenewalService.checkRenewalReminders();
            } catch (error) {
                loggers.error('Error in scheduled lease renewal check:', error);
            }
        }, 24 * 60 * 60 * 1000);

        // Generate next-period recurring bills once per day
        setInterval(async () => {
            try {
                const recurringBillService = (await import('./services/recurringBill.service')).default;
                await recurringBillService.generateDueRecurringBills();
            } catch (error) {
                loggers.error('Error in scheduled recurring bill generation:', error);
            }
        }, 24 * 60 * 60 * 1000);

        // Apply renewal rent/lease updates once their start date is reached
        setInterval(async () => {
            try {
                const { applyPendingRenewalLeaseUpdates } = await import('./services/renewalWorkflow.service');
                await applyPendingRenewalLeaseUpdates();
            } catch (error) {
                loggers.error('Error applying scheduled renewal lease updates:', error);
            }
        }, 24 * 60 * 60 * 1000);

        // Apply scheduled rent adjustments from landlord settings enforcement
        setInterval(async () => {
            try {
                const pendingRentAdjustmentService = (await import('./services/pendingRentAdjustment.service')).default;
                await pendingRentAdjustmentService.applyDueAdjustments();
            } catch (error) {
                loggers.error('Error applying scheduled rent adjustments:', error);
            }
        }, 24 * 60 * 60 * 1000);

        // Auto-charge late fees on overdue tenant bills
        setInterval(async () => {
            try {
                const lateFeeChargeService = (await import('./services/lateFeeCharge.service')).default;
                await lateFeeChargeService.chargeOverdueLateFees();
            } catch (error) {
                loggers.error('Error charging overdue late fees:', error);
            }
        }, 24 * 60 * 60 * 1000);

        // Deposit return deadline reminders — daily
        setInterval(async () => {
            try {
                const depositReturnReminderService = (await import('./services/depositReturnReminder.service')).default;
                await depositReturnReminderService.checkDepositReturnDeadlines();
            } catch (error) {
                loggers.error('Error in deposit return reminder check:', error);
            }
        }, 24 * 60 * 60 * 1000);

        // Compliance certificate & insurance renewal reminders — daily
        setInterval(async () => {
            try {
                const PropertyOperationalService = (await import('./services/propertyOperational.service')).default;
                await PropertyOperationalService.runComplianceReminders(90);
            } catch (error) {
                loggers.error('Error in scheduled compliance reminder check:', error);
            }
        }, 24 * 60 * 60 * 1000);

        loggers.info('Scheduled bill checks initialized');
    }

    /** Remove legacy Bull repeat jobs that may still fire bill checks from Redis. */
    private async removeStaleBillReminderJobs() {
        try {
            const { notificationQueue } = await import('./queues/notificationQueue');
            const repeatableJobs = await notificationQueue.getRepeatableJobs();
            for (const job of repeatableJobs) {
                const jobKey = `${job.id ?? ''} ${job.name ?? ''} ${job.key ?? ''}`.toLowerCase();
                if (
                    jobKey.includes('check-due-bills') ||
                    jobKey.includes('check-overdue-bills') ||
                    jobKey.includes('check_due_bills') ||
                    jobKey.includes('check_overdue_bills')
                ) {
                    await notificationQueue.removeRepeatableByKey(job.key);
                    loggers.info(`Removed stale bill reminder job: ${job.id ?? job.name ?? job.key}`);
                }
            }
        } catch (error) {
            loggers.warn('Could not clean up stale bill reminder jobs (Redis may be unavailable):', error);
        }
    }


}

const serverInstance = new Server(Number(PORT), APP_SECRET);
serverInstance.start();
export { serverInstance };