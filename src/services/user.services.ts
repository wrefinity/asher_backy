import { prismaClient } from "..";
import { hashSync, compareSync } from "bcrypt";
// import { SignUpIF } from "../interfaces/authInt";
import loggers from "../utils/loggers";
import { userRoles, ApplicationStatus, onlineStatus, AvailabilityStatus } from "@prisma/client";
import { CreateLandlordIF, RegisterVendorInput } from "../validations/interfaces/auth.interface";
import GuarantorService from "../services/guarantor.services"
import RefereeService from "../services/referees.services"
import EmergencyContactService from "../services/emergencyinfo.services"
import EmploymentService from "../services/employmentinfo.services"
import NextOfKinService from "../services/nextkin.services"
import ApplicantPersonalDetailsService from "../services/personaldetails.services"
import WalletService from "./wallet.service";
import { getCurrentCountryCurrency } from "../utils/helpers";
import sendMail from "../utils/emailer";
import propertyServices from "./propertyServices";
import applicantService from "../webuser/services/applicantService";
import { ApiError } from "../utils/ApiError";


class UserService {
    protected inclusion;

    constructor() {
        this.inclusion = {
            tenants: true,
            landlords: true,
            vendors: true,
            profile: true
        };
    }


    checkexistance = async (obj: object): Promise<false | { id: string; tenants?: any; landlords?: any; profile?: any; vendors?: any }> => {
        const user = await prismaClient.users.findFirst({
            where: { ...obj },
            select: {
                id: true,
                tenants: { select: { id: true } }, // ✅ plural
                landlords: { select: { id: true } },
                profile: true,
                vendors: { select: { id: true } },
            }
        });

        if (user?.tenants?.length) this.inclusion.tenants = true; // ✅ check array length
        if (user?.landlords != null) this.inclusion.landlords = true;
        if (user?.vendors != null) this.inclusion.vendors = true;
        if (user?.profile) this.inclusion.profile = true;

        return user;
    }
    findUserByEmail = async (email: string) => {
        // Find the user first to check if related entities exist
        const foundUser = await this.checkexistance({ email })
        if (!foundUser) {
            return false;
        }
        const user = await prismaClient.users.findFirst({
            where: { email },
            include: this.inclusion,
        });
        return user
    }

    updateOnlineStatus = async (userId: string, status: onlineStatus) => {
        return await prismaClient.users.update({
            where: { id: userId },
            data: { onlineStatus: status }
        });
    }

    getUserById = async (id: string) => {
        return await prismaClient.users.findFirst({
            where: { id },
            include: this.inclusion,
        });
    }

    findUserByTenantCode = async (tenantCode: string) => {
        return await prismaClient.users.findFirst({
            where: {
                tenants: {
                    some: { tenantCode },
                },
            },
            include: {
                tenants: {
                    include: {
                        property: true,
                        landlord: {
                            select: {
                                landlordCode: true,
                                userId: true
                            }
                        },
                    }
                },
                profile: true,
            },
        });
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

    createNewUser = async (userData: any, landlordBulkUploads: boolean = false) => {
        return await prismaClient.users.create({
            data: {
                email: userData?.email,
                role: userData?.role ? [userData.role] : [userRoles?.WEBUSER],
                isVerified: landlordBulkUploads ? true : false,
                password: this.hashPassword(userData?.password),
                profile: {
                    create: {
                        gender: userData?.gender,
                        phoneNumber: userData?.phoneNumber,
                        address: userData?.address,
                        dateOfBirth: userData?.dateOfBirth,
                        fullname: `${userData?.lastName} ${userData?.firstName} ${userData?.middleName ? userData.middleName : ""}`.trim(),
                        firstName: userData?.firstName?.trim(),
                        lastName: userData?.lastName?.trim(),
                        middleName: userData?.middleName?.trim(),
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
    }

    async registerVendor(input: RegisterVendorInput) {
        const { email, password, profile, uploadedDocuments = [] } = input;

        // Transaction: create user + profile + vendor + vendorDocuments
        const newVendor = await prismaClient.$transaction(
            async (tx) => {
                const createdProfile = await tx.profile.create({
                    data: { ...profile }
                });

                const createdUser = await tx.users.create({
                    data: {
                        email,
                        isVerified: true,
                        role: [userRoles.VENDOR],
                        password: this.hashPassword(password),
                        profileId: createdProfile.id
                    }
                });

                const vendor = await tx.vendors.create({
                    data: {
                        userId: createdUser.id
                    }
                });

                // Save uploaded documents linked to vendor
                if (uploadedDocuments.length > 0) {
                    await tx.vendorDocument.createMany({
                        data: uploadedDocuments.map((doc) => ({
                            url: doc.url,
                            type: doc.type,
                            vendorId: vendor.id
                        }))
                    });
                }

                return { createdUser, createdProfile, vendor, uploadedDocuments };
            },
            {
                maxWait: 20_000, // wait up to 20s for a free connection
                timeout: 60_000 // ransaction must finish within 60s
            }
        );

        return newVendor;
    }



    createUserWithProfile = async (userData: any, profileData: any) => {
        return await prismaClient.users.create({
            data: {
                email: userData?.email,
                role: userData?.role ? [userData.role] : [userRoles?.WEBUSER],
                isVerified: userData?.isVerified || false,
                password: this.hashPassword(userData?.password),
                profile: {
                    create: {
                        ...profileData
                    }
                }
            },
        });
    }
    createUser = async (userData: any, landlordBulkUploads: boolean = false, createdBy: string = null, createTenantProfile: boolean = false) => {
        let user = null

        user = await prismaClient.users.findUnique({
            where: { email: userData?.email },
            include: { profile: true }
        });

        // for normal account creations 
        if (!landlordBulkUploads && !createdBy && !createTenantProfile) {
            user = await this.createNewUser(userData);
        }

        // Create a new user by landlord during bulk upload
        if (!user && landlordBulkUploads && !createTenantProfile) {
            user = await this.createNewUser(userData, landlordBulkUploads);
            const tenantExist = await this.tenantExistsForLandlord(userData?.landlordId, user?.id)
            if (tenantExist) return tenantExist;

            const application = await this.completeApplicationProfile(userData, user.id, createdBy);
            const roleToUse = user.role.includes(userRoles.TENANT) ? userRoles.TENANT : userData?.role;
            const result = await this.updateUserBasedOnRole({ ...userData, applicationId: application?.id }, user, roleToUse);
            const tenant = result as any;
            sendMail(
                user.email,
                "ACCOUNT CREATION",
                `<h3>Your account has been created successfully.</h3>
                    <p>Dear ${user?.profile?.firstName},</p>
                    <p>We are pleased to inform you that your account has been created successfully. You can now access your account and enjoy our services.</p>
                    <p>To get started, please login to your account using the credentials below:</p>
                    <p>Username: ${tenant?.tenantCode}</p>
                    <p>Thank you for choosing us. </p>
                    <p>Best regards,</p>`
            );
            // make the property occupied
            await propertyServices.updateAvailabiltyStatus(userData?.landlordId, userData?.propertyId, AvailabilityStatus.OCCUPIED);
        }

        // for web user complete tenant account profile creation
        if (user && !landlordBulkUploads && userData?.role === userRoles.TENANT && createTenantProfile) {
            // user = await this.createNewUser(userData, landlordBulkUploads);
            const roleToUse = user.role.includes(userRoles.TENANT) ? userRoles.TENANT : userData?.role;
            // const tenantExist = await this.tenantExistsForLandlord(userData?.landlordId, user?.id, userData?.propertyId)
            // if (tenantExist) return tenantExist;
            const result = await this.updateUserBasedOnRole(userData, user, roleToUse) as any;

            sendMail(
                user.email,
                "ACCOUNT CREATION",
                `<h3>Your account has been created successfully.</h3>
                    <p>Dear ${user?.profile?.firstName},</p>
                    <p>We are pleased to inform you that your account has been created successfully. You can now access your account and enjoy our services.</p>
                    <p>To get started, please login to your account using the credentials below:</p>
                    <p>Username: ${result?.tenantCode}</p>
                    <p>Thank you for choosing us. </p>
                    <p>Best regards,</p>`
            );
            // make the property occupied
            await propertyServices.updateAvailabiltyStatus(userData?.landlordId, userData?.propertyId, AvailabilityStatus.OCCUPIED);
            //unlist the property
            await propertyServices.deletePropertyListing(userData?.propertyId);
            await applicantService.updateApplicationStatusStep(userData?.applicationId, ApplicationStatus.TENANT_CREATED);
            await applicantService.updateApplicationStatusStep(userData?.applicationId, ApplicationStatus.COMPLETED);

        }

        if (user && userData?.role === userRoles.VENDOR) {
            await this.updateUserBasedOnRole(userData, user, userRoles?.VENDOR);
        }
        if (user && userData?.role === userRoles.LANDLORD) {
            await this.updateUserBasedOnRole(userData, user, userRoles?.LANDLORD);
        }
        if (!user && userData?.role === userRoles.VENDOR) {
            user = await this.createNewUser(userData, false);
            await this.updateUserBasedOnRole(userData, user, userRoles?.VENDOR);
        }
        if (!user && userData?.role === userRoles.LANDLORD) {
            user = await this.createNewUser({ userData }, false);
            await this.updateUserBasedOnRole(userData, user, userRoles?.LANDLORD);
        }
        const countryData = await getCurrentCountryCurrency();
        if (user && countryData?.locationCurrency) {
            await WalletService.getOrCreateWallet(user.id, countryData.locationCurrency);
        }

        return this.getUserById(user.id);
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

    completeApplicationProfile = async (userData: any, userId: string, createdBy: string) => {
        // 1. Create personal details first (needed by NextOfKin)
        const personalDetails = await ApplicantPersonalDetailsService.upsertApplicantPersonalDetails({
            title: userData?.title,
            invited: userData?.invited,
            maritalStatus: userData?.maritalStatus,
            phoneNumber: userData?.phoneNumber,
            email: userData?.email,
            dob: userData?.dateOfBirth,
            firstName: userData?.firstName,
            lastName: userData?.lastName,
            middleName: userData?.middleName,
            nationality: userData?.nationality,
            identificationType: userData?.identificationType,
            identificationNo: userData?.identificationNo,
            issuingAuthority: userData?.issuingAuthority,
            expiryDate: userData?.expiryDate,
            userId,
            nextOfKin: userData?.nextOfKin
        });



        // 2. Run independent calls in parallel
        const [guarantorInfo, employmentInfo, emergencyInfo, refreeInfo] = await Promise.all([
            GuarantorService.upsertGuarantorInfo({
                id: userData?.guarantorId || null,
                fullName: userData?.guarantorFullname || '',
                phoneNumber: userData?.guarantorPhoneNumber || '',
                email: userData?.guarantorEmail || '',
                address: userData?.guarantorAddress || '',
                relationship: userData?.relationshipToGuarantor || '',
                identificationType: userData?.guarantorIdentificationType || '',
                identificationNo: userData?.guarantorIdentificationNo || '',
                monthlyIncome: userData?.guarantorMonthlyIncome || null,
                employerName: userData?.guarantorEmployerName || null,
                userId
            }),

            EmploymentService.upsertEmploymentInfo({
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
                positionTitle: userData?.positionTitle,
                userId
            }),

            EmergencyContactService.upsertEmergencyContact({
                id: userData?.emergencyInfoId || null,
                fullname: `${userData?.lastName} ${userData?.firstName}${userData?.middleName ? ' ' + userData.middleName : ''}`,
                phoneNumber: userData?.emergencyPhoneNumber,
                email: userData?.emergencyEmail,
                address: userData?.emergencyAddress,
                userId
            }),

            RefereeService.upsertRefereeInfo({
                id: userData?.refereeId || null,
                professionalReferenceName: userData?.refereeProfessionalReferenceName,
                personalReferenceName: userData?.refereePersonalReferenceName,
                personalEmail: userData?.refereePersonalEmail,
                professionalEmail: userData?.refereeProfessionalEmail,
                personalPhoneNumber: userData?.refereePersonalPhoneNumber,
                professionalPhoneNumber: userData?.refereeProfessionalPhoneNumber,
                personalRelationship: userData?.refereePersonalRelationship,
                professionalRelationship: userData?.refereeProfessionalRelationship,
                userId
            })
        ]);

        // 3. Next of Kin (dependent on personalDetails)
        await NextOfKinService.upsertNextOfKinInfo({
            lastName: userData?.nextOfKinLastName,
            firstName: userData?.nextOfKinFirstName,
            relationship: userData?.relationship,
            phoneNumber: userData?.nextOfKinPhoneNumber,
            email: userData?.nextOfKinEmail,
            middleName: userData?.nextOfKinMiddleName,
            applicantPersonalDetailsId: personalDetails.id,
            userId
        });

        // 4. Create application
        const application = await prismaClient.application.create({
            data: {
                status: ApplicationStatus.COMPLETED,
                userId,
                residentialId: null,
                emergencyContactId: emergencyInfo.id,
                employmentInformationId: employmentInfo.id,
                guarantorInformationId: guarantorInfo ? guarantorInfo.id : null,
                applicantPersonalDetailsId: personalDetails.id,
                refereeId: refreeInfo.id,
                createdById: createdBy
            }
        });

        // 5. Application questions
        await prismaClient.applicationQuestions.create({
            data: {
                havePet: userData.havePet,
                youSmoke: userData.youSmoke,
                requireParking: userData.requireParking,
                haveOutstandingDebts: userData.haveOutstandingDebts,
                applicantId: application.id
            }
        });
        return application;
    };


    updateUserBasedOnRole = async (
        userData: any,
        user: any,
        role: userRoles
    ) => {
        switch (role) {
            case userRoles.LANDLORD: {
                const landlordCode = await this.generateUniqueLandlordCode();
                return await prismaClient.landlords.create({
                    data: {
                        landlordCode,
                        userId: user.id,
                    },
                });
            }

            case userRoles.VENDOR:
                return await prismaClient.vendors.create({
                    data: {
                        userId: user.id,
                    },
                });

            case userRoles.TENANT: {
                const landlord = await prismaClient.landlords.findUnique({
                    where: { id: userData.landlordId },
                });
                if (!landlord) throw new Error("Landlord not found");

                const tenantCode = await this.generateUniqueTenantCode(landlord.landlordCode);

                const connectData: any = {
                    tenantCode,
                    user: { connect: { id: user.id } }, // MUST point to existing user
                    landlord: { connect: { id: landlord.id } },
                    initialDeposit: userData.initialDeposit || 0,
                    tenantWebUserEmail: userData.tenantWebUserEmail,
                    leaseStartDate: userData?.leaseStartDate ? new Date(userData.leaseStartDate) : new Date(),
                    leaseEndDate: userData?.leaseEndDate ? new Date(userData.leaseEndDate) : undefined,
                    application: userData.applicationId
                        ? { connect: { id: userData.applicationId } }
                        : undefined,
                };

                if (userData.propertyId) {
                    connectData.property = { connect: { id: userData.propertyId } };
                }
                if (userData.unitId) {
                    connectData.unit = { connect: { id: userData.unitId } };
                }
                if (userData.roomId) {
                    connectData.room = { connect: { id: userData.roomId } };
                }

                // Fix: Ensure user exists before creating tenant
                const existingUser = await prismaClient.users.findUnique({
                    where: { id: user.id },
                });
                if (!existingUser) {
                    throw new Error(`User with id ${user.id} does not exist`);
                }

                const tenant = await prismaClient.tenants.create({
                    data: connectData,
                });

                if (tenant) {
                    await this.updateUserRole(user.id, userRoles.TENANT);
                }

                return tenant;
            }


            default:
                throw new Error(`Unsupported role: ${role}`);
        }
    };

    tenantExistsForLandlord = async (landlordId: string, userId: string, propertyId?: string) => {
        return await prismaClient.users.findFirst({
            where: {
                tenants: {
                    some: { // ✅ must use "some"
                        userId,
                        landlordId: landlordId,
                        isCurrentLease: true,
                        ...(propertyId && { propertyId })
                    }
                },
            },
            include: {
                tenants: true,
                profile: true
            }
        })
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

    updateUserRole = async (userId: string, role: userRoles) => {
        const user = await prismaClient.users.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');
        const updatedRoles = user.role.includes(role) ? user.role : [...user.role, role];
        return await prismaClient.users.update({
            where: { id: userId },
            data: { role: updatedRoles },
        });
    }

    async updatePasswordWithOldPassword(
        userId: string,
        oldPassword: string,
        newPassword: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            // Find user by ID
            const user = await prismaClient.users.findUnique({
                where: { id: userId },
                select: { id: true, password: true }
            });

            if (!user) {
                throw ApiError.notFound('User not found');
            }

            // Check if user has a password set (might be social login user)
            if (!user.password) {
                throw ApiError.badRequest('Password not set for this account. Please use password reset.');
            }

            // Verify old password
            const isOldPasswordValid = compareSync(oldPassword, user.password);

            if (!isOldPasswordValid) {
                throw ApiError.unauthorized('Current password is incorrect');
            }

            // Check if new password is same as old password
            if (oldPassword === newPassword) {
                throw ApiError.badRequest('New password cannot be the same as current password');
            }

            // Hash new password
            const hashedPassword = this.hashPassword(newPassword);
            // Update password
            await prismaClient.users.update({
                where: { id: userId },
                data: { password: hashedPassword }
            });

            return {
                success: true,
                message: 'Password updated successfully'
            };

        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to update password');
        }
    }
}

export default new UserService();