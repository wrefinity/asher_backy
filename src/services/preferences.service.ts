import { prismaClient } from "..";
import { Currency, DateFormat, Language, TimeFormat } from "@prisma/client";

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

class PreferenceService {

    getUserPreferences = async (userId: string) => {
        return prismaClient.userPreferences.findUnique({
            where: { userId }
        });
    }

createOrUpdatePreferences = async (userId: string, data: any) => {
    // Convert string inputs to proper enum types
    const convertedData: PreferencesInput = {
        currency: data.currency ? data.currency as Currency : undefined,
        timeFormat: data.timeFormat ? data.timeFormat as TimeFormat : undefined,
        dateFormat: data.dateFormat ? data.dateFormat as DateFormat : undefined,
        language: data.language ? data.language as Language : undefined,
        timeZone: data.timeZone,
        region: data.region,
        showBasicProfile: data.showBasicProfile,
        showContactDetails: data.showContactDetails,
        defaultPaymentAccountId: data.defaultPaymentAccountId
    };

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

        const businessCompleted = !!(
            profile?.profileUrl &&
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
