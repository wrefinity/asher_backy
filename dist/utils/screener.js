"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.landlordScreener = exports.employmentScreener = exports.guarantorScreener = void 0;
const guarantorScreener = (application) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const fullName = application.guarantorInformation.fullName.trim().toLowerCase();
    const firstName = application.guarantorAgreement.firstName.trim().toLowerCase();
    const middleName = ((_a = application.guarantorAgreement.middleName) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) || "";
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
    const infoNIN = (_b = application.guarantorInformation.nationalInsuranceNumber) === null || _b === void 0 ? void 0 : _b.trim().toUpperCase();
    const agreementNIN = (_c = application.guarantorAgreement.nationalInsuranceNumber) === null || _c === void 0 ? void 0 : _c.trim().toUpperCase();
    const isNinMatch = infoNIN && agreementNIN && infoNIN === agreementNIN;
    return isNameMatch && isDobMatch && isNinMatch;
});
exports.guarantorScreener = guarantorScreener;
const employmentScreener = (application) => __awaiter(void 0, void 0, void 0, function* () {
    const employmentInfo = application.employmentInformation;
    const referenceForm = application.employeeReference;
    if (!employmentInfo || !referenceForm) {
        return false; // If either record is missing, screening fails
    }
    // Normalize and trim strings for comparison
    const normalize = (str) => (str === null || str === void 0 ? void 0 : str.trim().toLowerCase()) || "";
    // Name Matching
    const employeeNameMatch = normalize(referenceForm.employeeName) === normalize(employmentInfo.employerCompany);
    // Job Title Matching
    const jobTitleMatch = normalize(referenceForm.jobTitle) === normalize(employmentInfo.positionTitle);
    // Company Name Matching
    const companyNameMatch = normalize(referenceForm.companyName) === normalize(employmentInfo.employerCompany);
    // Employer Email Matching
    const employerEmailMatch = normalize(referenceForm.emailAddress) === normalize(employmentInfo.employerEmail);
    // Start Date Matching (ignoring time)
    const employmentStartDateMatch = referenceForm.employmentStartDate &&
        employmentInfo.startDate &&
        new Date(referenceForm.employmentStartDate).toISOString().split("T")[0] ===
            new Date(employmentInfo.startDate).toISOString().split("T")[0];
    // Final decision: All conditions must match
    return (employeeNameMatch &&
        jobTitleMatch &&
        companyNameMatch &&
        employerEmailMatch &&
        employmentStartDateMatch);
});
exports.employmentScreener = employmentScreener;
const landlordScreener = (application) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const residentialInfo = application.residentialInformation;
    const prevAddresses = (residentialInfo === null || residentialInfo === void 0 ? void 0 : residentialInfo.prevAddresses) || [];
    const landlordReference = application.referenceForm;
    const tenancyHistory = landlordReference === null || landlordReference === void 0 ? void 0 : landlordReference.tenancyReferenceHistory;
    const externalLandlord = landlordReference === null || landlordReference === void 0 ? void 0 : landlordReference.externalLandlord;
    const tenantConduct = landlordReference === null || landlordReference === void 0 ? void 0 : landlordReference.conduct;
    if (!residentialInfo || !landlordReference || !tenancyHistory || !externalLandlord) {
        return false; // Fail if any required information is missing
    }
    // Normalize and trim strings for case-insensitive comparison
    const normalize = (str) => (str === null || str === void 0 ? void 0 : str.trim().toLowerCase()) || "";
    // Landlord Name Matching
    const landlordNameMatch = normalize(residentialInfo.landlordOrAgencyName) === normalize(externalLandlord.name);
    // Landlord Contact Matching
    const landlordContactMatch = normalize(residentialInfo.landlordOrAgencyPhoneNumber) === normalize(externalLandlord.contactNumber);
    // Landlord Email Matching
    const landlordEmailMatch = normalize(residentialInfo.landlordOrAgencyEmail) === normalize(externalLandlord.emailAddress);
    // Tenant Name Matching
    const tenantNameMatch = normalize(tenancyHistory.tenantName) === normalize((_b = (_a = application.user) === null || _a === void 0 ? void 0 : _a.profile) === null || _b === void 0 ? void 0 : _b.firstName);
    // Address Matching
    const addressMatch = normalize(tenancyHistory.currentAddress) === normalize(residentialInfo.address);
    // Length of Residence Matching (from previous addresses)
    const lengthOfResidenceMatch = prevAddresses.some((prev) => normalize(prev.lengthOfResidence) === normalize(residentialInfo.lengthOfResidence));
    // Reason for Leaving Matching
    const reasonForLeavingMatch = normalize(residentialInfo.reasonForLeaving) === normalize(tenancyHistory.reasonForLeaving);
    // Rent Payment History Check
    const rentOnTimeMatch = (tenantConduct === null || tenantConduct === void 0 ? void 0 : tenantConduct.rentOnTime) === true;
    // Final screening result: All checks must pass
    return (landlordNameMatch &&
        landlordContactMatch &&
        landlordEmailMatch &&
        tenantNameMatch &&
        addressMatch &&
        lengthOfResidenceMatch &&
        reasonForLeavingMatch &&
        rentOnTimeMatch);
});
exports.landlordScreener = landlordScreener;
