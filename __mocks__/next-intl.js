// Mock next-intl for Jest tests
const translations = {
  common: {
    loading: 'Loading',
    search: 'Search',
    close: 'Close',
  },
  blocks: {
    reward: 'Reward',
  },
  'verus-id': {
    enter_address:
      'Enter Verus address (R9vqQz8...) or VerusID (verus@) - Note: VerusID requires identity APIs',
    enter_address_placeholder:
      'Enter Verus address (R9vqQz8...) or VerusID (e.g., VerusPulse@)',
  },
};

module.exports = {
  useTranslations:
    (namespace = 'common') =>
    key => {
      if (
        namespace &&
        translations[namespace] &&
        translations[namespace][key]
      ) {
        return translations[namespace][key];
      }
      return key;
    },
  useLocale: () => 'en',
  useMessages: () => translations,
  useTimeZone: () => 'UTC',
  useNow: () => new Date(),
  useFormatter: () => ({
    dateTime: date => date.toISOString(),
    number: num => num.toString(),
    relativeTime: date => date.toISOString(),
  }),
  NextIntlClientProvider: ({ children }) => children,
};
