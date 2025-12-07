import { prismaClient } from "..";
import { CategoryIF } from "../validations/interfaces/categories.interface";
import { CategoryType, Currency, DateFormat, Language, Prisma, TimeFormat } from "@prisma/client";

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


}


export default new PreferenceService()
