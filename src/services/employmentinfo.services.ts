import { prismaClient } from "..";
import ApplicationServices from "../webuser/services/applicantService";
import { EmploymentInformationIF } from "../webuser/schemas/types";
import { ApplicationSaveState } from '@prisma/client';

class EmploymentService {
  // Upsert Employment Information
  upsertEmploymentInfo = async (data: EmploymentInformationIF, applicationId: string = null) => {
    const { userId, id, ...rest } = data;

    if (id) {
      // Check if the employment record exists
      const existingRecord = await this.getEmploymentInfoById(id);

      if (!existingRecord) {
        throw new Error(`Employment record with ID ${id} does not exist.`);
      }

      // Perform update if ID exists
      return await prismaClient.employmentInformation.update({
        where: { id },
        data: {
          ...rest,
          user: userId ? { connect: { id: userId } } : undefined,
        },
      });
    } else {
      // Perform create if ID does not exist
      const employmentInfo =  await prismaClient.employmentInformation.create({
        data: {
          ...rest,
          user: userId ? { connect: { id: userId } } : undefined,
        },
      });
      if(employmentInfo) {
        await ApplicationServices.updateLastStepStop(applicationId, ApplicationSaveState.EMPLOYMENT )
        await ApplicationServices.updateCompletedStep(applicationId, ApplicationSaveState.EMPLOYMENT )

      }
      return employmentInfo
    }
  };

  // Get Employment Information by userId
  getEmploymentInfoByUserId = async (userId: string) => {
    return await prismaClient.employmentInformation.findMany({
      where: { userId },
    });
  };

  // Get Employment Information by ID
  getEmploymentInfoById = async (id: string) => {
    return await prismaClient.employmentInformation.findUnique({
      where: { id },
    });
  };

  // Delete Employment Information by ID
  deleteEmploymentInfoById = async (id: string) => {
    return await prismaClient.employmentInformation.delete({
      where: { id },
    });
  };
}

export default new EmploymentService();
