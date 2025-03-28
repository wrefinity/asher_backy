// import { Request, Response } from 'express';
// import DocumentVerificationService from '../services/document_verification.services';
// import { prismaClient } from "..";
// import { YesNo } from '@prisma/client';

// class DocumentController {
//   async handleDocumentVerification(req: Request, res: Response) {
//     try {
//       const { documentId } = req.params;
//       const updatedApplication = await DocumentVerificationService.verifyDocument(documentId);
      
//       res.status(200).json({
//         success: true,
//         data: this.mapVerificationStatuses(updatedApplication)
//       });
//     } catch (error) {
//       res.status(error.statusCode || 500).json({
//         success: false,
//         message: error.message || 'Document verification failed'
//       });
//     }
//   }

//   async handleManualVerification(req: Request, res: Response) {
//     try {
//       const { applicationId } = req.params;
//       const application = await prismaClient.application.findUnique({
//         where: { id: applicationId },
//         include: { 
//           documents: true,
//           guarantorInformation: true,
//           referee: true
//         }
//       });

//       if (!application) {
//         return res.status(404).json({ error: 'Application not found' });
//       }

//       // Verify guarantor if information exists
//       if (application.guarantorInformation) {
//         await DocumentVerificationService.verifyGuarantor(application.id);
//       }

//       // Check final status
//       await DocumentVerificationService.checkFullVerificationStatus(application);
      
//       const updatedApp = await prismaClient.application.findUnique({
//         where: { id: applicationId },
//         include: {
//           documents: true,
//           guarantorInformation: true,
//           referee: true
//         }
//       });

//       res.status(200).json({
//         success: true,
//         data: this.mapVerificationStatuses(updatedApp)
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: 'Manual verification check failed: ' + error.message
//       });
//     }
//   }

//   private mapVerificationStatuses(application: any) {
//     return {
//       ...application,
//       employmentVerified: application.employmentVerificationStatus === YesNo.YES,
//       incomeVerified: application.incomeVerificationStatus === YesNo.YES,
//       creditCheckVerified: application.creditCheckStatus === YesNo.YES,
//       landlordVerified: application.landlordVerificationStatus === YesNo.YES,
//       guarantorVerified: application.guarantorVerificationStatus === YesNo.YES,
//       refereeVerified: application.refereeVerificationStatus === YesNo.YES
//     };
//   }
// }

// export default new DocumentController();