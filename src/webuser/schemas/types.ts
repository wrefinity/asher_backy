interface BaseIF{
  id?: string | null;
  applicationId: string;
}
export interface NextOfKinIF{
  id?: string | null;
  firstName: string;
  lastName: string;
  relationship: string;
  email: string;
  phoneNumber: string;
  middleName?: string | null;
}

export interface ApplicantPersonalDetailsIF{
  id?: string | null;
  title: string;
  invited: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dob: Date;
  email?: string;
  phoneNumber: string;
  maritalStatus: string;
  nextOfKin?: NextOfKinIF;
}


export interface GuarantorInformationIF extends BaseIF {
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
}

export interface EmergencyContactIF extends BaseIF {
  fullname: string;
  phoneNumber: string;
  email: string;
  address: string;
}
export interface AppDocumentIF extends BaseIF {
  documentName: string;
  documentUrl: string;
  updatedAt: Date;
}

export interface PrevAddressIF {
  id?: string | null;
  address: string;
  lengthOfResidence: string;
}

export interface ResidentialInformationIF extends BaseIF  {
  address: string;
  addressStatus: string;
  lengthOfResidence: string;
  landlordOrAgencyPhoneNumber: string;
  landlordOrAgencyEmail: string;
  landlordOrAgencyName: string;
  userId?: string | null;
  prevAddresses?: PrevAddressIF[] | null;
}





export interface EmploymentInformationIF extends BaseIF {
  employmentStatus: string;
  taxCredit?: string | null;
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
  positionTitle ?: string | null;
}
