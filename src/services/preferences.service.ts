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
}


export default new PreferenceService()
