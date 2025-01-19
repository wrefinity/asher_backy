import { prismaClient } from "..";
import { ResidentialInformationIF } from "../webuser/schemas/types";


class ResidentialInformationService {
  // Upsert Residential Information
upsertResidentialInformation = async (data: ResidentialInformationIF) => {
  const { id, prevAddresses, ...rest } = data;

  if (id) {
    // Check if the residentialInformation exists
    const existingRecord = await this.getResidentialInformationById(id);

    if (!existingRecord) {
      throw new Error(`Residential Information with ID ${id} does not exist.`);
    }

    // Perform update if ID exists
    return await prismaClient.residentialInformation.update({
      where: { id },
      data: {
        ...rest,
        prevAddresses: prevAddresses
          ? {
              update: prevAddresses
                .filter((address) => address.id) // Update only those with an ID
                .map((address) => ({
                  where: { id: address.id }, // Use the ID to find the record to update
                  data: { lengthOfResidence: address.lengthOfResidence }, // Update the length of residence
                })),
              create: prevAddresses
                .filter((address) => !address.id) // Create only those without an ID
                .map((address) => ({
                  address: address.address,
                  lengthOfResidence: address.lengthOfResidence,
                })),
            }
          : undefined,
      },
    });
  } else {
    // Perform create if ID does not exist
    return await prismaClient.residentialInformation.create({
      data: {
        ...rest,
        prevAddresses: prevAddresses
          ? {
              create: prevAddresses.map((address) => ({
                address: address.address,
                lengthOfResidence: address.lengthOfResidence,
              })),
            }
          : undefined,
      },
    });
  }
};


  // Get Residential Information by ID
  getResidentialInformationById = async (id: string) => {
    return await prismaClient.residentialInformation.findUnique({
      where: { id },
      include: { prevAddresses: true },
    });
  };

  // Get Residential Information by User ID
  getResidentialInformationByUserId = async (userId: string) => {
    return await prismaClient.residentialInformation.findMany({
      where: { userId },
      include: { prevAddresses: true },
    });
  };

  // Delete Residential Information by ID
  deleteResidentialInformationById = async (id: string) => {
    return await prismaClient.residentialInformation.delete({
      where: { id },
    });
  };

  // Get Previous Address for Residential Information
  getPrevAddressesForResidentialInfo = async (residentialInfoId: string) => {
    return await prismaClient.prevAddress.findMany({
      where: { residentialInformationId: residentialInfoId }, 
    });
  };
}

export default new ResidentialInformationService();
