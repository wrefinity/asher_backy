import { prismaClient } from "..";
import { Currency, DateFormat, Language, TimeFormat } from "@prisma/client";
import { getCurrencyForCountry } from "../utils/helpers";

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

        return prismaClient.userPreferences.upsert({
            where: { userId },
            update: convertedData,
            create: {
                ...convertedData,
                userId
            }
        });
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

    getOnboardingStatus = async (userId: string) => {
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

        const preferences = await prismaClient.userPreferences.findUnique({
            where: { userId },
            select: {
                currency: true,
                timeZone: true,
                dateFormat: true,
            }
        });

        const landlordId = user?.landlords?.id;
        const [propertiesCount, tenantsCount] = landlordId
            ? await Promise.all([
                prismaClient.properties.count({
                    where: {
                        landlordId,
                        isDeleted: false,
                    }
                }),
                prismaClient.tenants.count({
                    where: {
                        landlordId,
                    }
                })
            ])
            : [0, 0];

        const profile = user?.profile;
        const profileCompleted = !!(
            profile?.fullname &&
            profile?.phoneNumber &&
            profile?.address &&
            profile?.city &&
            profile?.country &&
            profile?.dateOfBirth &&
            profile?.taxPayerId
        );

        // Business step: name + landlord record are enough; profile photo is optional.
        const businessCompleted = !!(
            user?.landlords?.landlordCode &&
            user?.landlords?.businessName
        );

        const propertiesCompleted = propertiesCount > 0;
        const tenantsCompleted = tenantsCount > 0;
        const configurationCompleted = !!(
            preferences?.currency &&
            preferences?.timeZone &&
            preferences?.dateFormat
        );

        const steps = {
            profile: profileCompleted,
            business: businessCompleted,
            properties: propertiesCompleted,
            tenants: tenantsCompleted,
            configuration: configurationCompleted,
        };

        // Mirrors FE: required steps are profile, business, configuration.
        const isCompleted = !!(
            steps.profile &&
            steps.business &&
            steps.configuration
        );

        return {
            isCompleted,
            steps,
            counts: {
                properties: propertiesCount,
                tenants: tenantsCount,
            }
        };
    }


}


export default new PreferenceService()
