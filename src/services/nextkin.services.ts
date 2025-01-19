import { prismaClient } from "..";
import { NextOfKinIF } from "../webuser/schemas/types";


class NextOfKinService {
  // Upsert NextOfKin Information
  upsertNextOfKinInfo = async (data: NextOfKinIF) => {
    const { userId, id, applicantPersonalDetailsId, ...rest } = data;

    if (id) {
      // Check if the nextOfKin record exists
      const existingRecord = await this.getNextOfKinById(id);

      if (!existingRecord) {
        throw new Error(`Next of Kin record with ID ${id} does not exist.`);
      }

      // Perform update if ID exists
      return await prismaClient.nextOfKin.update({
        where: { id },
        data: {
          ...rest,
          applicantPersonalDetails: applicantPersonalDetailsId
            ? { connect: { id: applicantPersonalDetailsId } }
            : undefined,
          user: userId ? { connect: { id: userId } } : undefined,
        },
      });
    } else {
      // Perform create if ID does not exist
      return await prismaClient.nextOfKin.create({
        data: {
          ...rest,
          applicantPersonalDetails: applicantPersonalDetailsId
            ? { connect: { id: applicantPersonalDetailsId } }
            : undefined,
          user: userId ? { connect: { id: userId } } : undefined,
        },
      });
    }
  };

  // Get NextOfKin by userId
  getNextOfKinByUserId = async (userId: string) => {
    return await prismaClient.nextOfKin.findMany({
      where: { userId },
    });
  };

  // Get NextOfKin by ID
  getNextOfKinById = async (id: string) => {
    return await prismaClient.nextOfKin.findUnique({
      where: { id },
    });
  };

  // Get NextOfKin by Applicant Personal Details ID
  getNextOfKinByApplicantPersonalDetailsId = async (applicantPersonalDetailsId: string) => {
    return await prismaClient.nextOfKin.findMany({
      where: { applicantPersonalDetailsId },
    });
  };

  // Delete NextOfKin by ID
  deleteNextOfKinById = async (id: string) => {
    return await prismaClient.nextOfKin.delete({
      where: { id },
    });
  };
}

export default new NextOfKinService();
