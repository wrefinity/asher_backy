import { prismaClient } from "..";
import { GuarantorInformationIF } from "../webuser/schemas/types";


class GuarantorService {
  // Upsert Guarantor Information
  upsertGuarantorInfo = async (data: GuarantorInformationIF) => {
    const { userId, id, ...rest } = data;

    if (id) {
      // Check if the guarantor exists
      const existingGuarantor = await this.getGuarantorById(id)

      if (!existingGuarantor) {
        throw new Error(`Guarantor with ID ${id} does not exist.`);
      }
      // Perform update if id is provided
      return await prismaClient.guarantorInformation.update({
        where: { id },
        data: {
          ...rest,
          user: {
            connect: { id: userId },
          },
        },
      });
    } else {
      // Perform create if id is not provided
      return await prismaClient.guarantorInformation.create({
        data: {
          ...rest,
          user: {
            connect: { id: userId },
          },
        },
      });
    }
  };

  // Get Guarantor by userId
  getGuarantorByUserId = async (userId: string) => {
    return await prismaClient.guarantorInformation.findMany({
      where: { userId },
    });
  };
  // Get Guarantor by Id
  getGuarantorById = async (id: string) => {
    return await prismaClient.guarantorInformation.findUnique({
      where: { id },
    });
  };

  // Delete Guarantor by ID
  deleteGuarantorById = async (id: string) => {
    return await prismaClient.guarantorInformation.delete({
      where: { id },
    });
  };
}

export default new GuarantorService();
