import express, { Express } from "express";
import { PORT } from "./secrets";
import AuthRouter from "./routes/auth"
import ApplicantRouter from "./routes/applicant"
import { PrismaClient } from "@prisma/client";

export const prismaClient:PrismaClient = new PrismaClient(
    {
        log:['query']
    }
);

class Server {
    private app: Express;
    private port: number;

    constructor(port: number) {
        this.app = express();
        this.port = port;
        this.configureMiddlewares();
        this.configureRoutes();
    }

    private configureMiddlewares() {
        // middlewares here
        this.app.use(express.json()) // for content-body parameters
        
    }

    private configureRoutes() {
        // Add routes here
        this.app.use("api/auth/", AuthRouter);
        this.app.use("api/applicant/", ApplicantRouter);
    }

    public start() {
        this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });
    }
}

const server = new Server(PORT);
server.start();
