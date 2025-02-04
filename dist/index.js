"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaClient = void 0;
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const secrets_1 = require("./secrets");
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const applicant_1 = __importDefault(require("./routes/applicant"));
const complaint_1 = __importDefault(require("./routes/complaint"));
const auth_1 = __importDefault(require("./routes/auth"));
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
const transaction_1 = __importDefault(require("./routes/transaction"));
const wallet_1 = __importDefault(require("./routes/wallet"));
// import paystackServices from "./services/paystack.services";
const ads_routes_1 = __importDefault(require("./tenant/routes/ads.routes"));
const community_post_routes_1 = __importDefault(require("./tenant/routes/community-post.routes"));
const community_routes_1 = __importDefault(require("./tenant/routes/community.routes"));
const index_1 = __importDefault(require("./tenant/routes/index"));
const index_routes_1 = __importDefault(require("./landlord/routes/index.routes"));
const bank_1 = __importDefault(require("./routes/bank"));
const flutterWave_service_1 = __importDefault(require("./services/flutterWave.service"));
exports.prismaClient = new client_1.PrismaClient({
    log: ['query']
});
class Server {
    constructor(port, secret) {
        this.app = (0, express_1.default)();
        this.port = port;
        this.appSecret = secret;
        // connectDB();
        this.configureMiddlewares();
        this.configureRoutes();
    }
    configureMiddlewares() {
        // middlewares here
        this.app.use(express_1.default.json()); // for content-body parameters
        this.app.use(express_1.default.urlencoded({ extended: true }));
        this.app.use((0, express_session_1.default)({
            secret: this.appSecret,
            resave: false,
            saveUninitialized: false
        }));
        this.app.use((0, cookie_parser_1.default)());
        this.app.use((0, cors_1.default)());
    }
    configureRoutes() {
        // Add routes here
        this.app.get("/", (req, res) => res.json({ message: "it is working" }));
        // this.app.post("/paystack/webhook", (req, res) => paystackServices.handleWebhook(req, res))
        this.app.post("/flutterwave/webhook", (req, res) => flutterWave_service_1.default.handleWebhook(req, res));
        this.app.use("/api/auth", auth_1.default);
        this.app.use("/api/file-uploads", fileuploads_1.default);
        this.app.use("/api/status", status_1.default);
        this.app.use("/api/notification", notification_1.default);
        this.app.use("/api/categories", category_1.default);
        this.app.use("/api/profile", profile_1.default);
        this.app.use("/api/vendor/services", services_1.default);
        this.app.use("/api/application", applicant_1.default);
        this.app.use("/api/emails", email_1.default);
        this.app.use("/api/chats", chats_1.default);
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
        // bank information routes
        this.app.use("/api/banks/", bank_1.default);
        this.app.use("/api/complaints", complaint_1.default);
    }
    start() {
        this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });
        // JobManager.startJobs()
    }
}
const server = new Server(Number(secrets_1.PORT), secrets_1.APP_SECRET);
server.start();
