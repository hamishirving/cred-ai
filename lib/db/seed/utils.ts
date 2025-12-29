/**
 * Utility functions for seed data generation.
 */

/**
 * Get a date relative to today.
 * Positive days = future, negative days = past.
 */
export function daysFromNow(days: number): Date {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date;
}

/**
 * Get a date at a specific time of day.
 */
export function atTime(date: Date, hours: number, minutes = 0): Date {
	const result = new Date(date);
	result.setHours(hours, minutes, 0, 0);
	return result;
}

/**
 * Get a random date between two dates.
 */
export function randomDateBetween(start: Date, end: Date): Date {
	const startTime = start.getTime();
	const endTime = end.getTime();
	const randomTime = startTime + Math.random() * (endTime - startTime);
	return new Date(randomTime);
}

/**
 * Generate a random integer between min and max (inclusive).
 */
export function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random item from an array.
 */
export function randomPick<T>(items: T[]): T {
	return items[Math.floor(Math.random() * items.length)];
}

/**
 * Pick n random items from an array (no duplicates).
 */
export function randomPickMany<T>(items: T[], n: number): T[] {
	const shuffled = [...items].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, Math.min(n, items.length));
}

/**
 * Generate a UK National Insurance number format.
 */
export function generateNINumber(): string {
	const prefix = randomPick(["AB", "CD", "EF", "GH", "JK", "LM", "NP", "RS", "TW"]);
	const numbers = Array.from({ length: 6 }, () => randomInt(0, 9)).join("");
	const suffix = randomPick(["A", "B", "C", "D"]);
	return `${prefix}${numbers}${suffix}`;
}

/**
 * Generate a US Social Security Number format (fake).
 */
export function generateSSN(): string {
	const area = String(randomInt(100, 999));
	const group = String(randomInt(10, 99));
	const serial = String(randomInt(1000, 9999));
	return `${area}-${group}-${serial}`;
}

/**
 * Generate a UK phone number.
 */
export function generateUKPhone(): string {
	const prefix = randomPick(["07700", "07800", "07900"]);
	const number = String(randomInt(100000, 999999));
	return `${prefix}${number}`;
}

/**
 * Generate a US phone number.
 */
export function generateUSPhone(): string {
	const area = String(randomInt(200, 999));
	const exchange = String(randomInt(200, 999));
	const subscriber = String(randomInt(1000, 9999));
	return `+1${area}${exchange}${subscriber}`;
}

/**
 * Generate NMC PIN format (UK nursing registration).
 */
export function generateNMCPin(): string {
	const year = randomInt(90, 24);
	const letter = randomPick(["A", "B", "C", "D", "E", "F"]);
	const number = String(randomInt(1000, 9999));
	return `${year}${letter}${number}`;
}

/**
 * Generate GMC number format (UK doctor registration).
 */
export function generateGMCNumber(): string {
	return String(randomInt(1000000, 9999999));
}

/**
 * Generate a US nursing license number.
 */
export function generateUSNursingLicense(state: string): string {
	const number = String(randomInt(100000, 999999));
	return `${state.toUpperCase()}-RN-${number}`;
}

/**
 * Slug-ify a string.
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

/**
 * Generate a deterministic UUID v5-like ID from a name.
 * This ensures the same name always produces the same ID for idempotency.
 */
export function deterministicId(namespace: string, name: string): string {
	// Simple hash-based approach for demo purposes
	const str = `${namespace}:${name}`;
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	// Convert to hex and pad to UUID format
	const hex = Math.abs(hash).toString(16).padStart(8, "0");
	return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-8${hex.slice(0, 3)}-${hex.padEnd(12, "0").slice(0, 12)}`;
}
