export function getWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Tipora',
    url: 'https://tipora.bet',
    description: 'Data-driven football tips with full P&L tracking.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://tipora.bet/tips/{search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}

export function getOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Tipora',
    url: 'https://tipora.bet',
    logo: 'https://tipora.bet/logo.png',
    sameAs: [],
  };
}

export function getFAQJsonLd(faqs: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  };
}
