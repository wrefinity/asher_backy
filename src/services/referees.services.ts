import { prismaClient } from "..";
import { RefreeIF } from "../webuser/schemas/types";


class RefereeService {
  // Upsert Referee Information
  upsertRefereeInfo = async (data: RefreeIF) => {
    const { userId, id, ...rest } = data;

    if (id) {
      // Check if the referee exists
      const existingReferee = await this.getRefereeById(id);

      if (!existingReferee) {
        throw new Error(`Referee with ID ${id} does not exist.`);
      }

      // Perform update if ID exists
      return await prismaClient.referees.update({
        where: { id },
        data: {
          ...rest,
          user: userId ? { connect: { id: userId } } : undefined,
        },
      });
    } else {
      // Perform create if ID does not exist
      return await prismaClient.referees.create({
        data: {
          ...rest,
          user: userId ? { connect: { id: userId } } : undefined,
        },
      });
    }
  };

  // Get Referee by userId
  getRefereeByUserId = async (userId: string) => {
    return await prismaClient.referees.findMany({
      where: { userId },
    });
  };

  // Get Referee by ID
  getRefereeById = async (id: string) => {
    return await prismaClient.referees.findUnique({
      where: { id },
    });
  };

  // Delete Referee by ID
  deleteRefereeById = async (id: string) => {
    return await prismaClient.referees.delete({
      where: { id },
    });
  };
}

export default new RefereeService();
