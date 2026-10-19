const DOMAIN_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function parseTestEmailDomain(value: string | undefined): string {
  const domain = value?.trim().toLowerCase();

  if (!domain || domain.length > 253 || !DOMAIN_PATTERN.test(domain)) {
    throw new Error('A valid TEST_EMAIL_DOMAIN is required for cleanup.');
  }

  return domain;
}

export function matchesTestEmailDomain(
  email: string | null | undefined,
  domain: string
): boolean {
  return Boolean(email?.trim().toLowerCase().endsWith(`@${domain.toLowerCase()}`));
}

export function buildTestEmailWhere(domain: string) {
  return {
    email: {
      endsWith: `@${domain}`,
      mode: 'insensitive' as const,
    },
  };
}
