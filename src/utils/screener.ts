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
  