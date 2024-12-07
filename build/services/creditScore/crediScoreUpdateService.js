"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCreditScoreUpdateJob = void 0;
const __1 = require("../..");
const bull_1 = __importDefault(require("bull"));
const creditScore_service_1 = __importDefault(require("./creditScore.service"));
const creditScoreQueue = new bull_1.default('creditScoreUpdates');
let isRunning = false;
const startCreditScoreUpdateJob = () => __awaiter(void 0, void 0, void 0, function* () {
    if (isRunning)
        return;
    isRunning = true;
    const batchSize = 1500;
    let skip = 0;
    while (true) {
        const users = yield __1.prismaClient.users.findMany({
            select: { id: true },
            skip,
            take: batchSize,
        });
        if (users.length === 0)
            break;
        for (const user of users) {
            console.log(`currently processing ${user.id}`);
            yield creditScoreQueue.add({ userId: user.id }, { repeat: { cron: "0 0 2 * * *" } }); //ss mm hh dom mon dow
        }
        skip += batchSize;
        console.log(`Credit scores updated for ${skip} users`);
    }
    isRunning = false;
});
exports.startCreditScoreUpdateJob = startCreditScoreUpdateJob;
// Define the creditScoreUpdate job
creditScoreQueue.process(10, (job) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Credit scores process started updated for ${job.data.userId}`);
    job.log("My bull is gettting started");
    const creditScoreService = new creditScore_service_1.default();
    yield creditScoreService.updateCreditScore(job.data.userId);
}));
