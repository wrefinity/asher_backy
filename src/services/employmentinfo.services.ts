import { prismaClient } from "..";
import { EmploymentInformationIF } from "../webuser/schemas/types";

class EmploymentService {
  // Upsert Employment Information
  upsertEmploymentInfo = async (data: EmploymentInformationIF) => {
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
      return await prismaClient.employmentInformation.create({
        data: {
          ...rest,
          user: userId ? { connect: { id: userId } } : undefined,
        },
      });
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
