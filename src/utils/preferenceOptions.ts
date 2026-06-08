/** Canonical timezone + language options served to clients (preferences form). */
export type PreferenceSelectOption = { value: string; label: string };

export const TIMEZONE_OPTIONS: PreferenceSelectOption[] = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Dublin', label: 'Dublin (GMT)' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
];

export const LANGUAGE_OPTIONS: PreferenceSelectOption[] = [
  { value: 'ENGLISH', label: 'English' },
  { value: 'FRENCH', label: 'French' },
  { value: 'SPANISH', label: 'Spanish' },
  { value: 'GERMAN', label: 'German' },
];

export function getPreferenceOptions() {
  return {
    timezones: TIMEZONE_OPTIONS,
    languages: LANGUAGE_OPTIONS,
  };
}
