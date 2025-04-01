
import { ReferenceStatus, EmploymentType, guarantorInformation, document } from '@prisma/client';
import { BaseModel } from './base.interface';


export interface TenancyReferenceHistoryCreateDTO {
  fullName: string;
  propertyAddress: string;
  rentAmount: string;
  tenancyStartDate?: Date;
  tenancyEndDate?: Date;
  reasonForLeaving?: string;
}

export interface ExternalLandlordCreateDTO {
  name: string;
  contactNumber: string;
  emailAddress: string;
}

export interface TenantConductCreateDTO {
  rentOnTime?: boolean;
  rentOnTimeDetails?: string;
  rentArrears?: boolean;
  rentArrearsDetails?: string;
  propertyCondition?: boolean;
  propertyConditionDetails?: string;
  complaints?: boolean;
  complaintsDetails?: string;
  endCondition?: boolean;
  endConditionDetails?: string;
  rentAgain?: boolean;
  rentAgainDetails?: string;
}

export interface LandlordReferenceFormCreateDTO {
  status: ReferenceStatus;
  additionalComments?: string;
  signerName?: string;
  signature?: string;
  applicationId: string;
  tenancyHistory: TenancyReferenceHistoryCreateDTO;
  externalLandlord: ExternalLandlordCreateDTO;
  conduct: TenantConductCreateDTO;
}

// Response Interfaces
export interface ExternalLandlord extends BaseModel {
  name: string;
  contactNumber: string;
  emailAddress: string;
  referenceForm?: LandlordReferenceForm;
}

export interface LandlordReferenceForm extends BaseModel {
  status: ReferenceStatus;
  additionalComments?: string;
  signerName?: string;
  signature?: string;
  signedDate: Date;
  tenancyReferenceHistory: TenancyReferenceHistory;
  externalLandlord: ExternalLandlord;
  conduct: TenantConduct;
  applicationId: string;
}

export interface TenancyReferenceHistory extends BaseModel {
  fullName: string;
  propertyAddress: string;
  rentAmount: string;
  tenancyStartDate?: Date;
  tenancyEndDate?: Date;
  reasonForLeaving?: string;
  referenceForm?: LandlordReferenceForm;
}

export interface TenantConduct extends BaseModel {
  rentOnTime?: boolean;
  rentOnTimeDetails?: string;
  rentArrears?: boolean;
  rentArrearsDetails?: string;
  propertyCondition?: boolean;
  propertyConditionDetails?: string;
  complaints?: boolean;
  complaintsDetails?: string;
  endCondition?: boolean;
  endConditionDetails?: string;
  rentAgain?: boolean;
  rentAgainDetails?: string;
  referenceForm?: LandlordReferenceForm;
}
export interface GuarantorAgreement extends BaseModel {
    status: string;
    submittedAt?: Date;
    agreementText: string;
    signedByGuarantor: boolean;
    guarantorSignature?: string;
    guarantorSignedAt?: Date;
    guarantor: guarantorInformation;
    guarantorEmployment?: GuarantorEmploymentInfo;
    documents?: document[];
    applicationId: string;
}

export interface GuarantorEmploymentInfo extends BaseModel {
    employmentType: EmploymentType;
    annualIncome?: number;
    employerName?: string;
    jobTitle?: string;
    employmentStartDate?: Date;
    employerAddress?: string;
    employerPhone?: string;
    employerEmail?: string;
    businessName?: string;
    businessNature?: string;
    yearsInBusiness?: number;
    businessAddress?: string;
    accountantName?: string;
    accountantContact?: string;
    utrNumber?: string;
    freelanceType?: string;
    yearsFreelancing?: number;
    monthlyIncome?: number;
    portfolioWebsite?: string;
    majorClients?: string;
    companyName?: string;
    companyNumber?: string;
    position?: string;
    ownershipPercentage?: number;
    companyFounded?: number;
    companyAddress?: string;
    businessRegistrationNumber?: string;
}

export interface IEmployeeReference {
  id?: string;
  employeeName: string;
  jobTitle?: string;
  department?: string;
  employmentStartDate?: Date;
  employmentEndDate?: Date;
  reasonForLeaving?: string;
  companyName?: string;
  refereeName?: string;
  refereePosition?: string;
  contactNumber?: string;
  emailAddress?: string;
  employmentType?: string;
  mainResponsibilities?: string;
  workPerformance?: number;
  punctualityAttendance?: number;
  reliabilityProfessionalism?: number;
  teamworkInterpersonal?: number;
  wouldReemploy?: boolean;
  reemployDetails?: string;
  additionalComments?: string;
  declarationConfirmed?: boolean;
  signerName?: string;
  signature?: string;
  date: Date;
}