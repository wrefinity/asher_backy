"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverInstance = exports.userSockets = exports.prismaClient = void 0;
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const secrets_1 = require("./secrets");
// Import Routes
const auth_1 = __importDefault(require("./routes/auth"));
const applicant_1 = __importDefault(require("./routes/applicant"));
const complaint_1 = __importDefault(require("./routes/complaint"));
const fileuploads_1 = __importDefault(require("./routes/fileuploads"));
const category_1 = __importDefault(require("./routes/category"));
const chats_1 = __importDefault(require("./routes/chats"));
const email_1 = __importDefault(require("./routes/email"));
const maintenance_1 = __importDefault(require("./routes/maintenance"));
const notification_1 = __importDefault(require("./routes/notification"));
const profile_1 = __importDefault(require("./routes/profile"));
const property_1 = __importDefault(require("./routes/property"));
const reviews_1 = __importDefault(require("./routes/reviews"));
const services_1 = __importDefault(require("./routes/services"));
const status_1 = __importDefault(require("./routes/status"));
const state_1 = __importDefault(require("./routes/state"));
const log_1 = __importDefault(require("./routes/log"));
const transaction_1 = __importDefault(require("./routes/transaction"));
const wallet_1 = __importDefault(require("./routes/wallet"));
const users_1 = __importDefault(require("./routes/users"));
const ads_routes_1 = __importDefault(require("./tenant/routes/ads.routes"));
const community_post_routes_1 = __importDefault(require("./tenant/routes/community-post.routes"));
const community_routes_1 = __importDefault(require("./tenant/routes/community.routes"));
const index_1 = __importDefault(require("./tenant/routes/index"));
const index_routes_1 = __importDefault(require("./landlord/routes/index.routes"));
const bank_1 = __importDefault(require("./routes/bank"));
const flutterWave_service_1 = __importDefault(require("./services/flutterWave.service"));
// WebSocket tracking
exports.prismaClient = new client_1.PrismaClient({ log: ['query'] });
exports.userSockets = new Map(); // for WSS (emails)
class Server {
    constructor(port, secret) {
        this.app = (0, express_1.default)();
        this.port = port;
        // HTTP server + WebSocket server
        this.server = http_1.default.createServer(this.app);
        this.io = new socket_io_1.Server(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        this.wss = new ws_1.WebSocketServer({ noServer: true });
        this.configureMiddlewares(secret);
        this.configureRoutes();
        this.configureSocketIO();
        this.configureWSS();
    }
    configureMiddlewares(secret) {
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: true }));
        this.app.use((0, cookie_parser_1.default)());
        this.app.use((0, cors_1.default)());
        this.app.use((0, express_session_1.default)({
            secret,
            resave: false,
            saveUninitialized: false
        }));
    }
    configureRoutes() {
        // Add routes here
        this.app.get("/", (req, res) => res.json({ message: "it is working" }));
        // this.app.post("/paystack/webhook", (req, res) => paystackServices.handleWebhook(req, res))
        this.app.post("/flutterwave/webhook", (req, res) => flutterWave_service_1.default.handleWebhook(req, res));
        this.app.use("/api/auth", auth_1.default);
        this.app.use("/api/file-uploads", fileuploads_1.default);
        this.app.use("/api/status", status_1.default);
        this.app.use("/api/state", state_1.default);
        this.app.use("/api/logs/", log_1.default);
        this.app.use("/api/notification", notification_1.default);
        this.app.use("/api/categories", category_1.default);
        this.app.use("/api/profile", profile_1.default);
        this.app.use("/api/vendor/services", services_1.default);
        this.app.use("/api/application", applicant_1.default);
        this.app.use("/api/emails", email_1.default);
        this.app.use("/api/chats", chats_1.default);
        this.app.use("/api/users", users_1.default);
        this.app.use("/api/properties", property_1.default);
        this.app.use("/api/maintenance", maintenance_1.default);
        this.app.use("/api/community-post", community_post_routes_1.default);
        this.app.use("/api/tenants/community", community_routes_1.default);
        this.app.use("/api/ads", ads_routes_1.default);
        this.app.use("/api/transactions", transaction_1.default);
        this.app.use("/api/reviews", reviews_1.default);
        this.app.use("/api/landlord", index_routes_1.default);
        this.app.use("/api/wallet", wallet_1.default);
        this.app.use("/api/tenants", index_1.default);
        // this.app.use("/api/generator", GeneratorRouter);
        // bank information routes
        this.app.use("/api/banks/", bank_1.default);
        this.app.use("/api/complaints", complaint_1.default);
    }
    // Socket.IO – Real-time chat messages
    configureSocketIO() {
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
    configureWSS() {
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
                    if ((data === null || data === void 0 ? void 0 : data.event) === "register" && (data === null || data === void 0 ? void 0 : data.receiverEmail)) {
                        exports.userSockets.set(data.receiverEmail, ws);
                        console.log(`📬 Registered email socket for ${data.receiverEmail}`);
                    }
                }
                catch (err) {
                    console.error("❗Invalid email message format");
                }
            });
            ws.on("close", () => {
                for (const [email, socket] of exports.userSockets.entries()) {
                    if (socket === ws) {
                        exports.userSockets.delete(email);
                        console.log(`📭 Email socket disconnected for ${email}`);
                        break;
                    }
                }
            });
        });
    }
    sendToUserEmail(email, event, data) {
        // frontend connects to ws://localhost:PORT/email
        const socket = exports.userSockets.get(email);
        if (!socket || socket.readyState !== ws_1.WebSocket.OPEN) {
            console.error(`No active email socket for: ${email}`);
            return;
        }
        socket.send(JSON.stringify({ event, data }));
    }
    start() {
        this.server.listen(this.port, () => {
            console.log(`🚀 Server running on http://localhost:${this.port}`);
            console.log(`💬 Chat Socket.IO running on /socket.io`);
            console.log(`📡 Email WebSocket running on /email`);
        });
    }
}
const serverInstance = new Server(Number(secrets_1.PORT), secrets_1.APP_SECRET);
exports.serverInstance = serverInstance;
serverInstance.start();
