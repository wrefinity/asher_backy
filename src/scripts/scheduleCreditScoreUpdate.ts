import cron from 'node-cron';
import { startCreditScorUpdateJob } from '../services/creditScore/crediScoreUpdateService';


cron.schedule('0 2 * * *', () => {
    console.log('Running daily credit score update');
    startCreditScorUpdateJob().catch(console.error);
})