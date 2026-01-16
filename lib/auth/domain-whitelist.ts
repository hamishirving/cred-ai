/**
 * Email domain whitelist validation
 *
 * Controls which email domains are allowed to register.
 * Set ALLOWED_EMAIL_DOMAINS env var to restrict (comma-separated).
 * Empty or unset = allow all domains.
 */

/**
 * Get list of allowed email domains from environment
 */
export function getAllowedDomains(): string[] {
	const domains = process.env.ALLOWED_EMAIL_DOMAINS?.trim();
	if (!domains) return [];

	return domains
		.split(",")
		.map((d) => d.trim().toLowerCase())
		.filter(Boolean);
}

/**
 * Validate email against domain whitelist
 * @returns Error message if invalid, null if valid
 */
export function validateEmailDomain(email: string): string | null {
	const allowedDomains = getAllowedDomains();

	// Empty whitelist = allow all
	if (allowedDomains.length === 0) {
		return null;
	}

	const emailDomain = email.split("@")[1]?.toLowerCase();
	if (!emailDomain) {
		return "Invalid email address";
	}

	if (!allowedDomains.includes(emailDomain)) {
		const domainsText =
			allowedDomains.length === 1
				? `@${allowedDomains[0]}`
				: allowedDomains.map((d) => `@${d}`).join(" or ");

		return `Registration is restricted to ${domainsText} email addresses`;
	}

	return null;
}
