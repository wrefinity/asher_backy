import { LogType } from '@prisma/client';
import LogsServices from './logs.services';
import { appendActivityLogRef } from '../utils/activityLogRef.util';

type LogInspectionEventParams = {
  propertyId: string;
  /** Tenant user id so events appear on tenant milestone / activity feeds. */
  tenantUserId: string;
  inspectionId: string;
  subjects: string;
  events: string;
};

class InspectionActivityLogService {
  logEvent = async (params: LogInspectionEventParams) => {
    await LogsServices.createLog({
      propertyId: params.propertyId,
      createdById: params.tenantUserId,
      type: LogType.ACTIVITY,
      subjects: params.subjects,
      events: appendActivityLogRef(params.events, {
        type: 'inspection',
        id: params.inspectionId,
      }),
    });
  };
}

export default new InspectionActivityLogService();
