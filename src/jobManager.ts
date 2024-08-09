import { startCreditScoreUpdateJob } from "./services/creditScore/crediScoreUpdateService"
import dashboardService from "./services/dashboard/dashboard.service"

class JobManager {
    static startJobs() {
        // Start all background jobs here
        startCreditScoreUpdateJob()
        dashboardService.initializeBagroundJobs()
    }
}

export default JobManager