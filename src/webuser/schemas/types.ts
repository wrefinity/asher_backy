import {InvitedStatus, AnswersEnum } from ".prisma/client";


interface BaseIF {
  id?: string | null;
  applicationId?: string;
}
export interface NextOfKinIF {
  id?: string | null;
  firstName: string;
  lastName: string;
  relationship: string;
  email: string;
  phoneNumber: string;
  middleName?: string | null;
  userId: string;
  applicantPersonalDetailsId?: string | null;
}



export interface ApplicantPersonalDetailsIF {
  id?: string | null;
  applicationInviteId?: string;
  title: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dob: Date;
  email?: string;
  phoneNumber: string;
  maritalStatus: string;
  nextOfKin?: NextOfKinIF | null;
  nationality: string,
  identificationType?: string,
  identificationNo?: string,
  issuingAuthority: string,
  expiryDate: Date
  userId?: string | null; 
  // props related
  invited?: InvitedStatus;
  leaseStartDate?: Date
  leaseEndDate?: Date
  moveInDate?: Date
  rentAmountPaid?: Number
  securityDeposit?: Number;
  //end of props related
}


export interface GuarantorInformationIF extends BaseIF {
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
  relationship: string;
  identificationType: string,
  identificationNo: string,
  monthlyIncome: string,
  employerName: string,
  userId: string | null;
}

export interface EmergencyContactIF extends BaseIF {
  id?: string;
  fullname: string;
  phoneNumber: string;
  email: string;
  address: string;
  userId?: string;
}

export interface RefreeIF extends BaseIF {
  professionalReferenceName: string;
  personalReferenceName: string;
  personalEmail: string;
  professionalEmail: string;
  personalPhoneNumber: string;
  professionalPhoneNumber: string;
  personalRelationship: string;
  professionalRelationship: string;
  userId?: string | null
}
export interface AppDocumentIF extends BaseIF {
  documentName: string;
  type?: string;
  size?: string;
  documentUrl?: string;
  updatedAt?: Date;
}

export interface PrevAddressIF {
  id?: string | null;
  address: string;
  lengthOfResidence: string;
}

export interface DeclarationIF {
  id?: string | null;
  date: Date;
  declaration: string;
  signature: string;
  additionalNotes?: string | null;
  applicationId?: string;
  userId?: string | null
}

export interface ResidentialInformationIF extends BaseIF {
  address: string;
  addressStatus: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  reasonForLeaving: string;
  lengthOfResidence: string;
  landlordOrAgencyPhoneNumber: string;
  landlordOrAgencyEmail: string;
  landlordOrAgencyName: string;
  userId?: string | null;
  prevAddresses?: PrevAddressIF[] | null;
}





export interface AdditionalInformationIF extends BaseIF {
  havePet?: AnswersEnum | null;
  youSmoke?:AnswersEnum | null, 
  requireParking?: AnswersEnum | null;
  haveOutstandingDebts?: AnswersEnum | null;
  additionalOccupants?: string | null;
  additionalInformation?: string | null;

}
export interface EmploymentInformationIF extends BaseIF {
  employmentStatus: string;
  taxCredit?: string | null;
  startDate?: Date;
  zipCode?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  monthlyOrAnualIncome?: string | null;
  childBenefit?: string | null;
  childMaintenance?: string | null;
  disabilityBenefit?: string | null;
  housingBenefit?: string | null;
  others?: string | null;
  pension?: string | null;
  moreDetails?: string | null;
  employerCompany?: string | null;
  employerEmail?: string | null;
  employerPhone?: string | null;
  positionTitle?: string | null;
  userId: string | null;
}
