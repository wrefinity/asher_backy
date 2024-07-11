import { Response } from "express";
import loggers from "../utils/loggers";

class ErrorService {
    handleError(error: unknown, res: Response) {
        if (error instanceof Error) {
            loggers.error("An error occured", error)
            return res.status(400).json({ message: error.message });
        } else {
            loggers.error("An unknown error occured", error);
            return res.status(500).json({ message: "An unknow error occured" })
        }
    }
}

export default new ErrorService()