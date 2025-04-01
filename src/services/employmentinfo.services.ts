import { prismaClient } from "..";
import ApplicationServices from "../webuser/services/applicantService";
import { EmploymentInformationIF } from "../webuser/schemas/types";
import { ApplicationSaveState, ApplicationStatus } from '@prisma/client';
import { IEmployeeReference } from '../validations/interfaces/references.interfaces';
import applicantService from "../webuser/services/applicantService";

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
      const employmentInfo = await prismaClient.employmentInformation.create({
        data: {
          ...rest,
          user: userId ? { connect: { id: userId } } : undefined,
        },
      });
      if (employmentInfo) {
        await ApplicationServices.updateLastStepStop(applicationId, ApplicationSaveState.EMPLOYMENT)
        await ApplicationServices.updateCompletedStep(applicationId, ApplicationSaveState.EMPLOYMENT)

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

  // employee reference information
  // =====================================
  async createEmployeeReference(data: Omit<IEmployeeReference, 'id'>, applicationId: string) {
    try {
      const created = await prismaClient.employeeReferenceForm.create({
        data: {
          ...data,
          application: {
            connect: { id: applicationId }
          }
        }
      });

      if (created){
        await applicantService.updateApplicationStatus(applicationId, ApplicationStatus.EMPLOYEE_REFERENCE)
      }
      return created
    } catch (error) {
      throw new Error(`Error creating employee reference: ${error}`);
    }
  }

  async updateEmployeeReference(id: string, data: Partial<IEmployeeReference>) {
    try {
      return await prismaClient.employeeReferenceForm.update({
        where: { id },
        data
      });
    } catch (error) {
      throw new Error(`Error updating employee reference: ${error}`);
    }
  }

  async getEmployeeReferenceById(id: string) {
    try {
      return await prismaClient.employeeReferenceForm.findUnique({
        where: { id }
      });
    } catch (error) {
      throw new Error(`Error fetching employee reference: ${error}`);
    }
  }

  async getAllEmployeeReferences() {
    try {
      return await prismaClient.employeeReferenceForm.findMany();
    } catch (error) {
      throw new Error(`Error fetching all employee references: ${error}`);
    }
  }
}

export default new EmploymentService();
