import { prismaClient } from "../..";
import Queue from 'bull';
import CreditScoreService from "./creditScore.service";

const creditScoreQueue = new Queue('creditScoreUpdates')

// Add jobs to the queue to update credit scores for all users
export const startCreditScorUpdateJob = async () => {
    const batchSize = 1500; //take 1500 users at a time
    let skip = 0;

    while (true) {
        const users = await prismaClient.users.findMany({
            select: { id: true },
            skip,
            take: batchSize,
        });

        if (users.length === 0) break; //no more users

        for (const user of users) {
            await creditScoreQueue.add({userId: user.id});
        }

        skip += batchSize;
        console.log(`Credit scores updated for ${skip} users`);
    }
}

// Define the creditScoreUpdate job
creditScoreQueue.process(10, async (job) => {
    const creditScoreService = new CreditScoreService();
    await creditScoreService.updateCreditScore(job.data.userId);
})