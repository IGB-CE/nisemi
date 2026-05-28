// Single source of truth for all business contact info shown on the site.
// Update these values when the official business details are finalized.

export const BUSINESS = {
  name: 'Nisemi',
  legalName: 'Bledi Demirlika P.F.',
  proprietor: 'Bledi Demirlika',
  nipt: 'XXXXXXXXX', // TODO: fill in NIPT from QKB document
  address: {
    street: 'Rruga Teodor Keto',
    city: 'Tiranë',
    postalCode: '1031',
    country: 'Shqipëri',
  },
  email: 'info@nisemi.al',
  phone: '+355 69 233 1289',
  domain: 'nisemi.al',
  privacyUrl: '/privacy',
  termsUrl: '/terms',
};

export const FORMATTED_ADDRESS = `${BUSINESS.address.street}, ${BUSINESS.address.postalCode} ${BUSINESS.address.city}, ${BUSINESS.address.country}`;
