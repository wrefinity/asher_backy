import { prismaClient } from "..";
import { Currency, DateFormat, Language, TimeFormat } from "@prisma/client";
import { getCurrencyForCountry } from "../utils/helpers";
import {
    buildOnboardingAccess,
    ensureLandlordCode,
    ONBOARDING_TERMS_VERSION,
    type OnboardingStatusPayload,
    type OnboardingStepKey,
} from "../utils/onboarding.util";
import { getLandlordIdentityVerification } from "../services/landlordIdentity.service";

interface PreferencesInput {
    currency?: Currency;
    timeZone?: string;
    timeFormat?: TimeFormat;
    dateFormat?: DateFormat;
    region?: string;
    language?: Language;
    showBasicProfile?: boolean;
    showContactDetails?: boolean;
    defaultPaymentAccountId?: string;
}

function normalizePreferencesPayload(data: Record<string, unknown>): PreferencesInput {
    const region =
        (typeof data.region === 'string' && data.region.trim()) ||
        (typeof data.country === 'string' && data.country.trim()) ||
        undefined;

    let currency = data.currency as Currency | undefined;
    if (region && !currency) {
        const mapped = getCurrencyForCountry(region);
        if (mapped) currency = mapped as Currency;
    }

    return {
        currency,
        timeZone: data.timeZone as string | undefined,
        timeFormat: data.timeFormat as TimeFormat | undefined,
        dateFormat: data.dateFormat as DateFormat | undefined,
        region,
        language: data.language as Language | undefined,
        showBasicProfile: data.showBasicProfile as boolean | undefined,
        showContactDetails: data.showContactDetails as boolean | undefined,
        defaultPaymentAccountId: data.defaultPaymentAccountId as string | undefined,
    };
}

class PreferenceService {

    getUserPreferences = async (userId: string) => {
        return prismaClient.userPreferences.findUnique({
            where: { userId }
        });
    }

    createOrUpdatePreferences = async (userId: string, data: any) => {
        const convertedData: PreferencesInput = normalizePreferencesPayload(data);

        const preferences = await prismaClient.userPreferences.upsert({
            where: { userId },
            update: convertedData,
            create: {
                ...convertedData,
                userId
            }
        });

        if (convertedData.region) {
            const user = await prismaClient.users.findUnique({
                where: { id: userId },
                select: { profileId: true },
            });
            if (user?.profileId) {
                await prismaClient.profile.update({
                    where: { id: user.profileId },
                    data: { country: convertedData.region },
                });
            }
        }

        return preferences;
    }

    updatePrivacySettings = async (userId: string, settings: {
        showBasicProfile: boolean;
        showContactDetails: boolean;
    }) => {
        return prismaClient.userPreferences.update({
            where: { userId },
            data: settings
        });
    }
    // Get dashboard layout for user
    getDashboardLayout = async (userId: string) => {
        try {
            const preferences = await prismaClient.userPreferences.findUnique({
                where: { userId },
                select: { dashboardLayout: true }
            });
            // Return null if no preferences exist (user hasn't customized layout yet)
            return preferences?.dashboardLayout || null;
        } catch (error) {
            // If user preferences don't exist, return null instead of throwing
            // This allows the frontend to use default layout
            return null;
        }
    }

    // Update dashboard layout for user (creates preferences if they don't exist)
    updateDashboardLayout = async (userId: string, layout: any) => {
        return prismaClient.userPreferences.upsert({
            where: { userId },
            update: { dashboardLayout: layout },
            create: {
                userId,
                dashboardLayout: layout
            }
        });
    }

    getOnboardingStatus = async (userId: string): Promise<OnboardingStatusPayload> => {
        const user = await prismaClient.users.findUnique({
            where: { id: userId },
            include: {
                profile: true,
                landlords: {
                    select: {
                        id: true,
                        landlordCode: true,
                        businessName: true,
                    }
                }
            }
        });

        const landlordId = user?.landlords?.id;
        await ensureLandlordCode(landlordId);

        if (landlordId && user?.landlords && !user.landlords.landlordCode) {
            const refreshedLandlord = await prismaClient.landlords.findUnique({
                where: { id: landlordId },
                select: { landlordCode: true, businessName: true },
            });
            if (user.landlords && refreshedLandlord) {
                user.landlords.landlordCode = refreshedLandlord.landlordCode;
                user.landlords.businessName = refreshedLandlord.businessName;
            }
        }

        const preferences = await prismaClient.userPreferences.findUnique({
            where: { userId },
            select: {
                currency: true,
                timeZone: true,
                dateFormat: true,
                region: true,
                timeFormat: true,
                language: true,
            }
        });

        const [propertiesCount, tenantsCount, financeRecordsCount, globalSettings, landlordOnboarding] =
            landlordId
                ? await Promise.all([
                    prismaClient.properties.count({
                        where: {
                            landlordId,
                            isDeleted: false,
                        }
                    }),
                    prismaClient.tenants.count({
                        where: { landlordId }
                    }),
                    prismaClient.billsSubCategory.count({
                        where: {
                            landlordId,
                            isDeleted: false,
                        }
                    }),
                    prismaClient.settings.findFirst({
                        where: {
                            landlordId,
                            isDeleted: false,
                        },
                        select: {
                            id: true,
                            depositPercentage: true,
                            applicationFeePercentage: true,
                            lateFeeEnabled: true,
                            notificationEnabled: true,
                            minimumTenancyHistoryYears: true,
                        },
                    }),
                    prismaClient.landlords.findUnique({
                        where: { id: landlordId },
                        select: {
                            onboardingTenantsSkippedAt: true,
                            onboardingFinanceSkippedAt: true,
                            onboardingCompletedAt: true,
                            onboardingTermsVersion: true,
                        },
                    }),
                ])
                : [0, 0, 0, null, null];

        const profile = user?.profile;
        const profileCompleted = !!(
            profile?.fullname &&
            profile?.phoneNumber &&
            profile?.address &&
            profile?.city &&
            profile?.country &&
            profile?.dateOfBirth &&
            profile?.taxPayerId &&
            profile?.gender
        );

        const businessCompleted = !!(
            user?.landlords?.landlordCode &&
            user?.landlords?.businessName?.trim()
        );

        const propertiesCompleted = propertiesCount > 0;
        const tenantsCompleted =
            tenantsCount > 0 || !!landlordOnboarding?.onboardingTenantsSkippedAt;
        const preferencesCompleted = !!(
            preferences?.currency &&
            preferences?.timeZone &&
            preferences?.dateFormat &&
            preferences?.region
        );
        const globalSettingsCompleted = !!(
            globalSettings &&
            (
                globalSettings.depositPercentage != null ||
                globalSettings.applicationFeePercentage != null ||
                globalSettings.lateFeeEnabled === true ||
                globalSettings.notificationEnabled === true ||
                globalSettings.minimumTenancyHistoryYears != null
            )
        );
        const financeCompleted =
            financeRecordsCount > 0 || !!landlordOnboarding?.onboardingFinanceSkippedAt;

        const identity = await getLandlordIdentityVerification(landlordId);
        const identityVerificationCompleted = identity.isCompleteForOnboarding;

        const steps: Record<OnboardingStepKey, boolean> = {
            identityVerification: identityVerificationCompleted,
            profile: profileCompleted,
            business: businessCompleted,
            preferences: preferencesCompleted,
            properties: propertiesCompleted,
            globalSettings: globalSettingsCompleted,
            tenants: tenantsCompleted,
            finance: financeCompleted,
        };

        const access = buildOnboardingAccess(steps);
        const onboardingCompletedAt =
            landlordOnboarding?.onboardingCompletedAt ?? null;

        return {
            canAccessApp: access.canAccessApp,
            isCompleted: !!onboardingCompletedAt,
            onboardingCompletedAt: onboardingCompletedAt
                ? onboardingCompletedAt.toISOString()
                : null,
            canUseLeasingFlows: identity.canUseLeasingFlows,
            identityVerification: {
                status: identity.status,
                documentUrls: identity.documentUrls,
                canUseLeasingFlows: identity.canUseLeasingFlows,
                isCompleteForOnboarding: identity.isCompleteForOnboarding,
                submittedAt: identity.submittedAt,
                rejectedAt: identity.rejectedAt,
            },
            steps,
            requiredSteps: ['profile', 'business', 'preferences', 'properties', 'globalSettings'],
            optionalSteps: ['identityVerification', 'tenants', 'finance'],
            firstIncompleteRequiredStep: access.firstIncompleteRequiredStep,
            completionPercentage: access.completionPercentage,
            requiredCompletionPercentage: access.requiredCompletionPercentage,
            counts: {
                properties: propertiesCount,
                tenants: tenantsCount,
                financeRecords: financeRecordsCount,
            },
            /** @deprecated Use steps.preferences */
            configuration: preferencesCompleted,
        } as OnboardingStatusPayload & { configuration?: boolean };
    }

    skipOnboardingStep = async (
        userId: string,
        step: 'tenants' | 'finance'
    ) => {
        const landlord = await prismaClient.landlords.findFirst({
            where: { userId, isDeleted: false },
            select: { id: true },
        });

        if (!landlord) {
            throw new Error('Landlord record not found');
        }

        const now = new Date();
        if (step === 'tenants') {
            await prismaClient.landlords.update({
                where: { id: landlord.id },
                data: { onboardingTenantsSkippedAt: now },
            });
        } else {
            await prismaClient.landlords.update({
                where: { id: landlord.id },
                data: { onboardingFinanceSkippedAt: now },
            });
        }

        return this.getOnboardingStatus(userId);
    };

    completeOnboarding = async (
        userId: string,
        options: { acceptedTerms: boolean; termsVersion?: string }
    ) => {
        if (!options.acceptedTerms) {
            throw new Error('You must accept the onboarding terms to continue');
        }

        const status = await this.getOnboardingStatus(userId);
        if (!status.canAccessApp) {
            throw new Error(
                'Complete all required setup steps before finishing onboarding'
            );
        }

        const landlord = await prismaClient.landlords.findFirst({
            where: { userId, isDeleted: false },
            select: { id: true, onboardingCompletedAt: true },
        });

        if (!landlord) {
            throw new Error('Landlord record not found');
        }

        if (!landlord.onboardingCompletedAt) {
            await prismaClient.landlords.update({
                where: { id: landlord.id },
                data: {
                    onboardingCompletedAt: new Date(),
                    onboardingTermsVersion:
                        options.termsVersion || ONBOARDING_TERMS_VERSION,
                },
            });
        }

        return this.getOnboardingStatus(userId);
    };


}


export default new PreferenceService()
