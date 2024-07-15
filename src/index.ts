import express, { Express, } from "express";
import session from "express-session";
// import passport from "passport";
import { PORT, APP_SECRET } from "./secrets";
import AuthRouter from "./routes/auth"
import ProfileRouter from "./routes/profile"
import StatusRouter from "./routes/status"
import ApplicationRouter from "./routes/applicant"
import ChatRoomRouter from "./routes/chats"
import EmailRouter from "./routes/email"
import PropertyRouter from "./routes/property"
import CategoryRouter from "./routes/category"
import { PrismaClient } from "@prisma/client";
import cookieParser from 'cookie-parser'
import communityRoutes from "./tenant/routes/community.routes";
import CommunityPostRouter from "./tenant/routes/community-post.routes";

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
        this.app.use("/api/auth", AuthRouter);
        this.app.use("/api/status", StatusRouter);
        this.app.use("/api/categories", CategoryRouter)
        this.app.use("/api/profile", ProfileRouter);
        this.app.use("/api/application", ApplicationRouter);
        this.app.use("/api/emails", EmailRouter);
        this.app.use("/api/chats", ChatRoomRouter);
        this.app.use("/api/properties", PropertyRouter);
        this.app.use("/api/community-post", CommunityPostRouter)
        this.app.use("/api/tenants/community", communityRoutes);
    }

    public start() {
        this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });

    }
}

const server = new Server(Number(PORT), APP_SECRET);
server.start();
