// import { prismaClient } from "..";
// import { VerificationDocumentType, YesNo, application } from '@prisma/client';

// class DocumentVerificationService {
//   private verificationRequirements = {
//     employmentVerificationStatus: [VerificationDocumentType.EMPLOYMENT_LETTER],
//     incomeVerificationStatus: [
//       VerificationDocumentType.PAY_STUB,
//       VerificationDocumentType.TAX_RETURN,
//       VerificationDocumentType.BANK_STATEMENT
//     ],
//     creditCheckStatus: [
//       VerificationDocumentType.CREDIT_REPORT,
//       VerificationDocumentType.BACKGROUND_CHECK
//     ],
//     landlordVerificationStatus: [VerificationDocumentType.LANDLORD_REFERENCE],
//     guarantorVerificationStatus: [
//       VerificationDocumentType.GUARANTOR_INCOME,
//       VerificationDocumentType.GUARANTOR_EMPLOYMENT
//     ],
//     refereeVerificationStatus: [
//       VerificationDocumentType.REFEREE_CONFIRMATION
//     ]
//   };

//   async verifyDocument(documentId: string): Promise<application> {
//     const document = await prismaClient.document.findUnique({
//       where: { id: documentId },
//       include: {
//         application: {
//           include: { documents: true }
//         }
//       }
//     });

//     if (!document?.application) {
//       throw new Error('Document or associated application not found');
//     }

//     const verificationField = this.mapDocumentToVerification(document.verificationType);
//     if (!verificationField) return document.application;

//     const requiredTypes = this.verificationRequirements[verificationField];
//     const hasAllDocuments = requiredTypes.every(type => 
//       document.application.documents.some(d => d.verificationType === type)
//     );

//     if (hasAllDocuments) {
//       const updatedApp = await prismaClient.application.update({
//         where: { id: document.application.id },
//         data: { [verificationField]: YesNo.YES },
//         include: { documents: true }
//       });

//       await this.checkFullVerificationStatus(updatedApp);
//       return updatedApp;
//     }

//     return document.application;
//   }

//   private async checkFullVerificationStatus(application: application) {
//     const verificationStatuses = [
//       application.employmentVerificationStatus,
//       application.incomeVerificationStatus,
//       application.creditCheckStatus,
//       application.landlordVerificationStatus,
//       application.guarantorVerificationStatus,
//       application.refereeVerificationStatus
//     ];

//     const isFullyVerified = verificationStatuses.every(
//       status => status === YesNo.YES
//     );

//     if (isFullyVerified) {
//       await prismaClient.application.update({
//         where: { id: application.id },
//         data: { 
//           status: 'SCREENING_COMPLETE',
//           completedSteps: { push: 'SCREENING_COMPLETE' }
//         }
//       });
//     }
//   }

//   private mapDocumentToVerification(
//     docType: VerificationDocumentType | null
//   ): keyof application | null {
//     const mapping = {
//       [VerificationDocumentType.EMPLOYMENT_LETTER]: 'employmentVerificationStatus',
//       [VerificationDocumentType.PAY_STUB]: 'incomeVerificationStatus',
//       [VerificationDocumentType.TAX_RETURN]: 'incomeVerificationStatus',
//       [VerificationDocumentType.BANK_STATEMENT]: 'incomeVerificationStatus',
//       [VerificationDocumentType.CREDIT_REPORT]: 'creditCheckStatus',
//       [VerificationDocumentType.BACKGROUND_CHECK]: 'creditCheckStatus',
//       [VerificationDocumentType.LANDLORD_REFERENCE]: 'landlordVerificationStatus',
//       [VerificationDocumentType.GUARANTOR_INCOME]: 'guarantorVerificationStatus',
//       [VerificationDocumentType.GUARANTOR_EMPLOYMENT]: 'guarantorVerificationStatus',
//       [VerificationDocumentType.REFEREE_CONFIRMATION]: 'refereeVerificationStatus'
//     };

//     return docType ? mapping[docType] : null;
//   }

//   async verifyGuarantor(applicationId: string): Promise<application> {
//     const application = await prismaClient.application.findUnique({
//       where: { id: applicationId },
//       include: {
//         guarantorInformation: true,
//         documents: true
//       }
//     });

//     if (!application?.guarantorInformation) {
//       throw new Error('Guarantor information not found');
//     }

//     const hasAllDocs = this.verificationRequirements.guarantorVerificationStatus
//       .every(type => application.documents.some(d => d.verificationType === type));

//     return prismaClient.application.update({
//       where: { id: applicationId },
//       data: {
//         guarantorVerificationStatus: hasAllDocs 
//           ? YesNo.YES 
//           : YesNo.NO
//       }
//     });
//   }
// }

// export default new DocumentVerificationService();