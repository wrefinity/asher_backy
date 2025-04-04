export const guarantorScreener = async (application) => {
    const fullName = application.guarantorInformation.fullName.trim().toLowerCase();
    const firstName = application.guarantorAgreement.firstName.trim().toLowerCase();
    const middleName = application.guarantorAgreement.middleName?.trim().toLowerCase() || "";
    const lastName = application.guarantorAgreement.lastName.trim().toLowerCase();

    // Generate possible name combinations
    const nameCombinations = [
        `${firstName} ${lastName}`,
        `${firstName} ${middleName} ${lastName}`,
        `${firstName} ${middleName}`,
        `${firstName}`,
        `${lastName}`,
    ].map((name) => name.trim());

    const isNameMatch = nameCombinations.includes(fullName);

    // Compare dateOfBirth (ignoring time)
    const infoDob = application.guarantorInformation.dateOfBirth
        ? new Date(application.guarantorInformation.dateOfBirth).toISOString().split("T")[0]
        : null;

    const agreementDob = application.guarantorAgreement.dateOfBirth
        ? new Date(application.guarantorAgreement.dateOfBirth).toISOString().split("T")[0]
        : null;

    const isDobMatch = infoDob && agreementDob && infoDob === agreementDob;

    // Compare National Insurance Number (case-insensitive)
    const infoNIN = application.guarantorInformation.nationalInsuranceNumber?.trim().toUpperCase();
    const agreementNIN = application.guarantorAgreement.nationalInsuranceNumber?.trim().toUpperCase();

    const isNinMatch = infoNIN && agreementNIN && infoNIN === agreementNIN;

    return isNameMatch && isDobMatch && isNinMatch;
};


export const employmentScreener = async (application) => {
    const employmentInfo = application.employmentInformation;
    const referenceForm = application.employeeReference;

    if (!employmentInfo || !referenceForm) {
        return false; // If either record is missing, screening fails
    }

    // Normalize and trim strings for comparison
    const normalize = (str) => str?.trim().toLowerCase() || "";

    // Name Matching
    const employeeNameMatch = normalize(referenceForm.employeeName) === normalize(employmentInfo.employerCompany);

    // Job Title Matching
    const jobTitleMatch = normalize(referenceForm.jobTitle) === normalize(employmentInfo.positionTitle);

    // Company Name Matching
    const companyNameMatch = normalize(referenceForm.companyName) === normalize(employmentInfo.employerCompany);

    // Employer Email Matching
    const employerEmailMatch = normalize(referenceForm.emailAddress) === normalize(employmentInfo.employerEmail);

    // Start Date Matching (ignoring time)
    const employmentStartDateMatch =
        referenceForm.employmentStartDate &&
        employmentInfo.startDate &&
        new Date(referenceForm.employmentStartDate).toISOString().split("T")[0] ===
        new Date(employmentInfo.startDate).toISOString().split("T")[0];

    // Final decision: All conditions must match
    return (
        employeeNameMatch &&
        jobTitleMatch &&
        companyNameMatch &&
        employerEmailMatch &&
        employmentStartDateMatch
    );
};

export const landlordScreener = async (application) => {
    const residentialInfo = application.residentialInformation;
    const prevAddresses = residentialInfo?.prevAddresses || [];
    const landlordReference = application.referenceForm;
    const tenancyHistory = landlordReference?.tenancyReferenceHistory;
    const externalLandlord = landlordReference?.externalLandlord;
    const tenantConduct = landlordReference?.conduct;
  
    if (!residentialInfo || !landlordReference || !tenancyHistory || !externalLandlord) {
      return false; // Fail if any required information is missing
    }
  
    // Normalize and trim strings for case-insensitive comparison
    const normalize = (str) => str?.trim().toLowerCase() || "";
  
    // Landlord Name Matching
    const landlordNameMatch =
      normalize(residentialInfo.landlordOrAgencyName) === normalize(externalLandlord.name);
  
    // Landlord Contact Matching
    const landlordContactMatch =
      normalize(residentialInfo.landlordOrAgencyPhoneNumber) === normalize(externalLandlord.contactNumber);
  
    // Landlord Email Matching
    const landlordEmailMatch =
      normalize(residentialInfo.landlordOrAgencyEmail) === normalize(externalLandlord.emailAddress);
  
    // Tenant Name Matching
    const tenantNameMatch = normalize(tenancyHistory.tenantName) === normalize(application.user?.profile?.firstName);
  
    // Address Matching
    const addressMatch = normalize(tenancyHistory.currentAddress) === normalize(residentialInfo.address);
  
    // Length of Residence Matching (from previous addresses)
    const lengthOfResidenceMatch = prevAddresses.some(
      (prev) => normalize(prev.lengthOfResidence) === normalize(residentialInfo.lengthOfResidence)
    );
  
    // Reason for Leaving Matching
    const reasonForLeavingMatch =
      normalize(residentialInfo.reasonForLeaving) === normalize(tenancyHistory.reasonForLeaving);
  
    // Rent Payment History Check
    const rentOnTimeMatch = tenantConduct?.rentOnTime === true;
  
    // Final screening result: All checks must pass
    return (
      landlordNameMatch &&
      landlordContactMatch &&
      landlordEmailMatch &&
      tenantNameMatch &&
      addressMatch &&
      lengthOfResidenceMatch &&
      reasonForLeavingMatch &&
      rentOnTimeMatch
    );
  };
  