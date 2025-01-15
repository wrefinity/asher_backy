import { prismaClient } from "..";
import { hashSync } from "bcrypt";
// import { SignUpIF } from "../interfaces/authInt";
import loggers from "../utils/loggers";
import { userRoles, ApplicationStatus } from "@prisma/client";
import { CreateLandlordIF } from "../validations/interfaces/auth.interface";
import ApplicantService from "../webuser/services/applicantService";

class UserService {
    protected inclusion;

    constructor() {
        this.inclusion = {
            tenant: false,
            landlords: false,
            vendors: false,
            profile: false
        };
    }
    checkexistance = async (obj: object): Promise<false | { id: string; tenant?: any; landlords?: any; profile?: any; vendors?: any }> => {
        const user = await prismaClient.users.findFirst({
            where: { ...obj },
            select: {
                id: true,
                tenant: { select: { id: true } },
                landlords: { select: { id: true } },
                profile: true,
                vendors: { select: { id: true } },
            }
        });

        // Dynamically build the inclusion object
        if (user?.tenant != null) this.inclusion.tenant = true;
        if (user?.landlords != null) this.inclusion.landlords = true;
        if (user?.vendors != null) this.inclusion.vendors = true;
        if (user?.profile) this.inclusion.profile = true;
        console.log(user)
        return user
    }
    findUserByEmail = async (email: string) => {
        // Find the user first to check if related entities exist
        const foundUser = await this.checkexistance({ email })

        if (!foundUser) {
            return false;
        }
        // console.log("===========DB Checkers ==========")
        // console.log(this.inclusion)
        const user = await prismaClient.users.findFirst({
            where: { email },
            include: this.inclusion,
        });
        return user
    }

    findAUserById = async (userId: string) => {
        // Find the user first to check if related entities exist
        const user = await this.checkexistance({ id: String(userId) })
        if (!user) {
            throw new Error('User not found');
        }
        return await prismaClient.users.findFirst({
            where: { id: String(userId) },
            include: this.inclusion,
        });
    }
    hashPassword = (password: string) => {
        return password ? hashSync(password, 10) : null
    };

    generateUniqueTenantCode = async (landlordCode) => {
        let isUnique = false;
        let tenantCode;

        while (!isUnique) {
            const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            tenantCode = `${landlordCode}-${suffix}`;
            const existingTenant = await prismaClient.tenants.findUnique({ where: { tenantCode } });
            if (!existingTenant) isUnique = true;
        }

        return tenantCode;
    }

    generateUniqueLandlordCode = async () => {
        let isUnique = false;
        let code;
        while (!isUnique) {
            code = 'LD' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'); // e.g., LD123456
            const existingLandlord = await prismaClient.landlords.findUnique({ where: { landlordCode: code } });
            if (!existingLandlord) isUnique = true;
        }
        return code;
    }

    createUser = async (userData: any, landlordUploads: boolean = false, createdBy:string = null) => {
        const newUser = await prismaClient.users.create({
            data: {
                email: userData?.email,
                role: userData?.role ? [userData.role] : [userRoles?.WEBUSER],
                isVerified: landlordUploads ? true : false,
                password: this.hashPassword(userData?.password),
                profile: {
                    create: {
                        gender: userData?.gender,
                        phoneNumber: userData?.phoneNumber,
                        address: userData?.address,
                        dateOfBirth: userData?.dateOfBirth,
                        fullname: userData?.lastName + " " + userData?.firstName + " " + (userData?.middleName ? " " + userData.middleName : ""),
                        profileUrl: userData?.profileUrl,
                        zip: userData?.zip,
                        unit: userData?.unit,
                        state: userData?.state,
                        timeZone: userData?.timeZone,
                        taxPayerId: userData?.taxPayerId,
                        taxType: userData?.taxType,
                    }
                }
            },
        });
        // Based on the role, create the corresponding entry in the related schema
        switch (userData?.role) {
            case userRoles.LANDLORD:
                const landlordCode = await this.generateUniqueLandlordCode();
                await prismaClient.landlords.create({
                    data: {
                        landlordCode,
                        userId: newUser.id,
                    },
                });
                break;

            case userRoles.VENDOR:
                await prismaClient.vendors.create({
                    data: {
                        userId: newUser.id
                    },
                });
                break;
            case userRoles.TENANT:
                const landlord = await prismaClient.landlords.findUnique({ where: { id: userData.landlordId } });
                if (!landlord) throw new Error('Landlord not found');

                const property = await prismaClient.properties.findUnique({
                    where: { id: userData.propertyId },
                });

                if (!property) {
                    throw new Error('Property not found');
                }

                const tenantCode = await this.generateUniqueTenantCode(landlord.landlordCode);
                const tenant = await prismaClient.tenants.create({
                    data: {
                        tenantCode,
                        userId: newUser.id,
                        tenantWebUserEmail: userData.tenantWebUserEmail,
                        propertyId: userData?.propertyId,
                        landlordId: userData?.landlordId,
                        leaseStartDate: userData?.leaseStartDate,
                        leaseEndDate: userData?.leaseEndDate,
                    },
                });
                if (tenant && !landlordUploads) {
                    // Update application with tenant info
                    await prismaClient.application.update({
                        where: { id: userData.applicationId },
                        data: {
                            status: ApplicationStatus.ACCEPTED,
                            tenantId: newUser.id,
                        },
                    });
                }
                if (tenant && landlordUploads) {
                    // create the tenant personal information
                    const personalDetails = await prismaClient.applicantPersonalDetails.create({
                        data: {
                            title: userData?.title,
                            maritalStatus: userData?.maritalStatus,
                            phoneNumber: userData?.phoneNumber,
                            email: userData?.email,
                            dob: userData?.dateOfBirth,
                            firstName: userData?.firstName,
                            lastName: userData?.lastName,
                            middleName: userData?.middleName,
                            nationality: userData?.nationality,
                            identificationType: userData?.identificationType,
                            issuingAuthority: userData?.issuingAuthority,
                            expiryDate: userData?.expiryDate,
                        },
                    });

                    // const residentialInfo = await prismaClient.residentialInformation.create({
                    //     data: {
                    //       address: userData.address,
                    //       addressStatus: userData.addressStatus,
                    //       lengthOfResidence: userData.lengthOfResidence,
                    //       landlordOrAgencyPhoneNumber: userData.landlordOrAgencyPhoneNumber,
                    //       landlordOrAgencyEmail: userData.landlordOrAgencyEmail,
                    //       landlordOrAgencyName: userData.landlordOrAgencyName,
                    //       userId: newUser.id,
                    //       prevAddresses:  {
                    //             create: {
                    //               address: userData?.prevAddress,
                    //               lengthOfResidence: userData?.prevAddressLengthOfResidence,
                    //             },
                    //           }
                    //     },
                    //   });

                    // Create guarantorInformation if provided
                    
                    let guarantorInfo = await prismaClient.guarantorInformation.create({
                        data: {
                            fullName: userData?.guarantorFullname,
                            phoneNumber: userData?.guarantorPhoneNumber,
                            email: userData?.guarantorEmail,
                            address: userData?.guarantorAddress,
                            relationship: userData?.relationshipToGuarantor,
                            identificationType: userData?.gauratorIdentificationType,
                            identificationNo: userData?.gauratorIdentificationNo,
                            monthlyIncome: userData?.gauratorMonthlyIncome,
                            employerName: userData?.gauratorEmployerName,
                        }
                    });
                    
                    // Create nextOfKin if provided
                    await prismaClient.nextOfKin.create({
                        data: {
                            lastName: userData?.nextOfKinLastName,
                            firstName: userData?.nextOfKinFirstName,
                            relationship: userData?.relationship,
                            phoneNumber: userData?.nextOfKinPhoneNumber,
                            email: userData?.nextOfKinEmail,
                            middleName: userData?.nextOfKinMiddleName,
                            applicantPersonalDetailsId: personalDetails.id, 
                            userId: newUser.id
                        }
                    });
                    // employement information 
                    const employmentInfo = await prismaClient.employmentInformation.create({
                        data: {
                            employmentStatus: userData?.employmentStatus,
                            taxCredit: userData?.taxCredit,
                            zipCode: userData?.employmentZipCode,
                            address: userData?.employmentAddress,
                            city: userData?.employmentCity,
                            state: userData?.employmentState,
                            country: userData?.employmentCountry,
                            startDate: userData?.employmentStartDate,
                            monthlyOrAnualIncome: userData?.monthlyOrAnualIncome,
                            childBenefit: userData?.childBenefit,
                            childMaintenance: userData?.childMaintenance,
                            disabilityBenefit: userData?.disabilityBenefit,
                            housingBenefit: userData?.housingBenefit,
                            others: userData?.others,
                            pension: userData?.pension,
                            moreDetails: userData?.moreDetails,
                            employerCompany: userData?.employerCompany,
                            employerEmail: userData?.employerEmail,
                            employerPhone: userData?.employerPhone,
                            positionTitle: userData?.positionTitle
                        }
                      });
                
                    // Create emergencyContact
                    const emergencyInfo = await prismaClient.emergencyContact.create({
                        data: {
                            fullname: userData?.lastName + " " + userData?.firstName + " " + (userData?.middleName ? " " + userData.middleName : ""),
                            phoneNumber: userData?.emergencyPhoneNumber,
                            email: userData?.emergencyEmail,
                            address: userData?.emergencyAddress
                        },
                    });
                    // refrees information
                    const refreeInfo = await prismaClient.referees.create({
                        data: {
                            professionalReferenceName: userData?.refereeProfessionalReferenceName,
                            personalReferenceName: userData?.refereePersonalReferenceName,
                            personalEmail: userData?.refereePersonalEmail,
                            professionalEmail: userData?.refereeProfessionalEmail, 
                            personalPhoneNumber: userData?.refereePersonalPhoneNumber, 
                            professionalPhoneNumber: userData?.refereeProfessionalPhoneNumber, 
                            personalRelationship: userData?.refereePersonalRelationship, 
                            professionalRelationship: userData?.refereeProfessionalRelationship, 
                        },
                    });
                    
                    // Update application with tenant info
                    const application = await prismaClient.application.create({
                        data:{
                            status: ApplicationStatus.COMPLETED,
                            userId: newUser.id,
                            tenantId: tenant.id,
                            residentialId: null, // null because the current user is a tenant and reside in the linked property
                            emergencyContactId: emergencyInfo.id,
                            employmentInformationId: employmentInfo.id,
                            guarantorInformationId: guarantorInfo ? guarantorInfo.id : null,
                            applicantPersonalDetailsId: personalDetails.id,
                            refereeId: refreeInfo.id,
                            createdById: createdBy
                        }
                    });

                    // fill the question 
                    await prismaClient.applicationQuestions.create({
                        data: {
                            havePet: userData.havePet,
                            youSmoke: userData.youSmoke,
                            requireParking: userData.requireParking,
                            haveOutstandingDebts: userData.haveOutstandingDebts,
                            applicantId: application.id
                        }
                    });
                }
                break;

            default:
                break;
        }
        return newUser;
    }

    updateUserInfo = async (id: string, userData: any) => {
        const updateData = { ...userData };
        if (userData.password) {
            updateData.password = hashSync(userData.password, 10);
        }
        return await prismaClient.users.update({
            where: { id },
            data: updateData,
        });
    }

    updateUserVerificationStatus = async (userId: string, isVerified: boolean) => {
        try {
            const updatedUser = await prismaClient.users.update({
                where: { id: String(userId) },
                data: { isVerified },
            });

            return updatedUser;
        } catch (error) {
            loggers.info(`Error updating user verification status: ${error}`)
            throw new Error('Failed to update user verification status');
        }
    }
    updateUserPassword = async (userId: string, password: string) => {
        try {
            const updatedUser = await prismaClient.users.update({
                where: { id: String(userId) },
                data: { password: hashSync(password, 10) },
            });

            return updatedUser;
        } catch (error) {
            loggers.info(`Error updating user verification status: ${error}`)
            throw new Error('Failed to update user verification status');
        }
    }

    createGoogleUser = async (userData: any) => {
        let user = null
        try {
            user = await this.findUserByEmail(userData.email)
            if (user && user.password) {
                return { error: "A user with this email exists" }
            }
        } catch (error) {
            loggers.error("An error occured while checking for existing.", error)
        }
        try {
            const newUser = await this.createUser(userData)
            return newUser
        } catch (error) {
            loggers.error("An error occured while creating Google user.", error)
            return { error: "An error occured creating Google User" }
        }

    }

    createLandlord = async (userData: CreateLandlordIF) => {
        return await prismaClient.users.create({
            data: {
                email: userData?.email,
                password: userData?.password ? hashSync(userData?.password, 10) : null,
                isVerified: userData?.isVerified || false,
                role: [userRoles?.LANDLORD],
                profile: {
                    create: {
                        gender: userData?.profile?.gender,
                        phoneNumber: userData?.profile?.phoneNumber,
                        address: userData?.profile?.address,
                        dateOfBirth: userData?.profile?.dateOfBirth,
                        fullname: userData?.profile?.fullname,
                        profileUrl: userData?.profile?.profileUrl,
                    },
                },
                landlords: {
                    create: {
                        isDeleted: false,
                    },
                },
            },
        });
    }

    updateLandlordOrTenantOrVendorInfo = async (data: any, id: string, role: string) => {

        let updated;

        switch (role) {
            case userRoles.LANDLORD:
                updated = await prismaClient.landlords.update({
                    where: { id },
                    data: {
                        emailDomains: data?.emailDomains
                    },
                });
                break;

            case userRoles.VENDOR:
                break;
            case userRoles.TENANT:
                break;

            default:
                break;
        }
        return updated;
    }
}

export default new UserService();