import { prismaClient } from "../..";
import Queue from 'bull';
import CreditScoreService from "./creditScore.service";

const creditScoreQueue = new Queue('creditScoreUpdates')

let isRunning = false;

export const startCreditScoreUpdateJob = async () => {
    if (isRunning) return;
    isRunning = true;

    const batchSize = 1500;
    let skip = 0;

    while (true) {
        const users = await prismaClient.users.findMany({
            select: { id: true },
            skip,
            take: batchSize,
        });

        if (users.length === 0) break;

        for (const user of users) {
            console.log(`currently processing ${user.id}`);
            await creditScoreQueue.add({ userId: user.id });
        }

        skip += batchSize;
        console.log(`Credit scores updated for ${skip} users`);
    }

    isRunning = false;
};

// Define the creditScoreUpdate job
creditScoreQueue.process(10, async (job) => {
    console.log(`Credit scores process started updated for ${job.data.userId}`);
    const creditScoreService = new CreditScoreService();
    await creditScoreService.updateCreditScore(job.data.userId);
})