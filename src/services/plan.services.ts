// import { prismaClient } from "..";

// class PlanService {
//     protected inclusion;

//     constructor() {
//         this.inclusion = {
//             tenant: false,
//             landlords: false,
//             vendors: false,
//             profile: false
//         };
//     }
//     subscribeToPlan = async (userId: string, planId: string) => {
//         // Fetch the plan details
//         const plan = await prismaClient.plan.findUnique({ where: { id: planId } });
//         if (!plan) throw new Error('Plan not found');

//         // Calculate the end date based on the plan's duration
//         let endDate: Date;
//         if (plan.duration === 'MONTHLY') {
//             endDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
//         } else if (plan.duration === 'YEARLY') {
//             endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1));
//         } else {
//             throw new Error('Invalid plan duration');
//         }

//         // Create a subscription
//         const subscription = await prismaClient.subscription.create({
//             data: {
//                 userId,
//                 planId,
//                 startDate: new Date(),
//                 endDate,
//                 status: 'ACTIVE',
//                 creditsAdded: plan.creditValue,
//             },
//         });

//         // Update user's wallet with credits
//         const wallet = await prismaClient.wallet.update({
//             where: { userId },
//             data: {
//                 credit: {
//                     increment: plan.creditValue,
//                 },
//             },
//         });
//         return subscription
//     }
//     consumeCredits = async (userId: string, creditsToDeduct: number) =>{
//         const wallet = await prismaClient.wallet.findUnique({ where: { userId } });
//         if (!wallet || wallet.credit < creditsToDeduct) throw new Error('Insufficient credits');
    
//         const updatedWallet = await prismaClient.wallet.update({
//             where: { userId },
//             data: {
//                 credit: {
//                     decrement: creditsToDeduct,
//                 },
//             },
//         });
    
//         return updatedWallet;
//     }
// }

// export default new PlanService();