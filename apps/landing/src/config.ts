// Single source of truth for all business contact info shown on the site.
// Update these values when the official business details are finalized.

export const BUSINESS = {
  name: 'Nisemi',
  legalName: 'Nisemi sh.p.k.', // TODO: confirm legal form (sh.p.k. / sh.a. / person fizik) after registration
  nipt: 'XX-XX-XXX', // TODO: fill in after Albanian business registration
  address: {
    street: 'Rruga [adresa]', // TODO
    city: 'Tiranë',
    postalCode: '1001',
    country: 'Shqipëri',
  },
  email: 'info@nisemi.al',
  phone: '+355 XX XXX XXXX', // TODO
  domain: 'nisemi.al',
  privacyUrl: '/privacy',
  termsUrl: '/terms',
};

export const FORMATTED_ADDRESS = `${BUSINESS.address.street}, ${BUSINESS.address.postalCode} ${BUSINESS.address.city}, ${BUSINESS.address.country}`;
