import { ApplicationSaveState } from '@prisma/client';
import LandlordSettingsService from '../landlord/services/propertySetting.service';
import { getApplicationFormConfig } from './applicationFormConfig';
import { resolveApplicationMarket } from './applicationAddressFields';

type ApplicationForCompletion = {
  guarantorInformationId?: string | null;
  residentialId?: string | null;
  employmentInformationId?: string | null;
  applicantPersonalDetailsId?: string | null;
  refereeId?: string | null;
  completedSteps?: ApplicationSaveState[];
  residentialInfo?: { country?: string | null } | null;
  properties?: { country?: string | null; landlordId?: string | null } | null;
  user?: { profile?: { country?: string | null } } | null;
};

export function resolveApplicationMarketFromRecord(
  application: ApplicationForCompletion
): string {
  return resolveApplicationMarket(
    application.properties?.country ||
      application.residentialInfo?.country ||
      application.user?.profile?.country
  );
}

export function getMissingApplicationFields(
  application: ApplicationForCompletion,
  landlordMinimumYears?: number | null
): string[] {
  const formConfig = getApplicationFormConfig(
    resolveApplicationMarketFromRecord(application),
    landlordMinimumYears
  );

  const guarantorStepComplete = application.completedSteps?.includes(
    ApplicationSaveState.GUARANTOR_INFO
  );
  const missingGuarantor =
    !application.guarantorInformationId &&
    !(formConfig.guarantor.optional && guarantorStepComplete);

  const missing: string[] = [];
  if (missingGuarantor) missing.push('guarantorInformationId');
  if (!application.residentialId) missing.push('residentialId');
  if (!application.employmentInformationId) missing.push('employmentInformationId');
  if (!application.applicantPersonalDetailsId) missing.push('applicantPersonalDetailsId');
  if (!application.refereeId) missing.push('refereeId');

  return missing;
}

export async function resolveLandlordTenancyMinimum(
  application: ApplicationForCompletion
): Promise<number | null | undefined> {
  const landlordId = application.properties?.landlordId;
  if (!landlordId) return undefined;
  const settings = await LandlordSettingsService.getAllGlobalSettings(landlordId);
  return settings?.minimumTenancyHistoryYears ?? undefined;
}
