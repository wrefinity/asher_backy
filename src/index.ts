import express, { Express } from "express";
import session from "express-session";
// import passport from "passport";
import { PORT, APP_SECRET } from "./secrets";
import AuthRouter from "./routes/auth"
import ApplicantRouter from "./routes/applicant"
import EmailRouter from "./routes/email"
import { PrismaClient } from "@prisma/client";
import cookieParser from 'cookie-parser'

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
        this.app.use(express.json()) // for content-body parameters
        this.app.use(session({
            secret: this.appSecret,
            resave: false,
            saveUninitialized: false
        }));
        this.app.use(cookieParser())
    }

    private configureRoutes() {
        // Add routes here
        this.app.use("/api/auth", AuthRouter);
        this.app.use("/api/applicant", ApplicantRouter);
        this.app.use("/api/emails", EmailRouter);
    }

    public start() {
        this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });
    }
}

const server = new Server(Number(PORT), APP_SECRET);
server.start();
