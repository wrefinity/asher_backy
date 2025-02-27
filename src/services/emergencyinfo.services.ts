import { ApplicationSaveState } from ".prisma/client";
import { prismaClient} from "..";
import { EmergencyContactIF } from "../webuser/schemas/types";
import ApplicantService from "../webuser/services/applicantService";


class EmergencyContactService {
  // Upsert Emergency Contact Information
  upsertEmergencyContact = async (data: EmergencyContactIF, applicationId: string = null) => {
    const { userId, id, ...rest } = data;

    if (id) {
      // Check if the emergency contact exists
      const existingContact = await this.getEmergencyContactById(id);

      if (!existingContact) {
        throw new Error(`Emergency contact with ID ${id} does not exist.`);
      }

      // Perform update if ID exists
      return await prismaClient.emergencyContact.update({
        where: { id },
        data: {
          ...rest,
          user: userId ? { connect: { id: userId } } : undefined,
        },
      });
    } else {
      // Perform create if ID does not exist
      const emergencyContact = await prismaClient.emergencyContact.create({
        data: {
          ...rest,
          user: userId ? { connect: { id: userId } } : undefined,
        },
      });
      if (emergencyContact) {
        await ApplicantService.updateLastStepStop(applicationId, ApplicationSaveState.EMERGENCY_CONTACT )
        await ApplicantService.incrementStepCompleted(applicationId, "emergencyInfo");
      }
      return emergencyContact
    }
  };

  // Get Emergency Contact by userId
  getEmergencyContactByUserId = async (userId: string) => {
    return await prismaClient.emergencyContact.findMany({
      where: { userId },
    });
  };

  // Get Emergency Contact by ID
  getEmergencyContactById = async (id: string) => {
    return await prismaClient.emergencyContact.findUnique({
      where: { id },
    });
  };

  // Delete Emergency Contact by ID
  deleteEmergencyContactById = async (id: string) => {
    return await prismaClient.emergencyContact.delete({
      where: { id },
    });
  };
}

export default new EmergencyContactService();
