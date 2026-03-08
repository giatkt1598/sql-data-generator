export interface SupportedLocaleDefinition {
  value: string;
  label: string;
}

export const SUPPORTED_LOCALES: SupportedLocaleDefinition[] = [
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh_CN', label: 'Chinese (Simplified)' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
];
