import { prismaClient } from "../..";


class DocumentService {
    
  getUserDocuments = async (userId) => {
    try {
      const applications = await prismaClient.application.findMany({
        where: { userId },
        include: {
          documents: true,
        },
      });

      const documents = applications.flatMap((app) => app.documents);
      return documents;
    } catch (error) {
      throw new Error('Error retrieving documents');
    }
  }
  getAllDocuments = async()=>{
    try {
      const applications = await prismaClient.application.findMany({
        include: {
          documents: true,
        },
      });

      const documents = applications.flatMap((app) => app.documents);
      return documents;
    } catch (error) {
      throw new Error('Error retrieving documents');
    }
  }
}

export default new DocumentService();
