"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const property_performance_1 = __importDefault(require("./landlord/services/property-performance"));
const crediScoreUpdateService_1 = require("./services/creditScore/crediScoreUpdateService");
const dashboard_service_1 = __importDefault(require("./services/dashboard/dashboard.service"));
class JobManager {
    static startJobs() {
        // Start all background jobs here
        (0, crediScoreUpdateService_1.startCreditScoreUpdateJob)();
        dashboard_service_1.default.initializeBagroundJobs();
        property_performance_1.default.rungenerateReport();
    }
}
exports.default = JobManager;
