/**
 * Seed Documents Script
 *
 * Generates realistic mock PDFs for evidence records and uploads them to Supabase Storage.
 * Only targets evidence with evidenceType='document' and status not 'pending'.
 *
 * Usage:
 *   pnpm db:seed-documents              # Process first record only (review mode)
 *   pnpm db:seed-documents -- --all     # Process all records
 *   pnpm db:seed-documents -- --limit 5 # Process first 5 records
 */

import { config } from "dotenv";
import { eq, and, ne, isNull } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db, closeConnection } from "../lib/db/seed/db";
import {
	evidence,
	complianceElements,
	profiles,
} from "../lib/db/schema";

config({ path: ".env.local" });

// ============================================
// Supabase Storage Client
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
	throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
}
if (!supabaseKey) {
	throw new Error(
		"SUPABASE_SERVICE_ROLE_KEY is required (storage uploads need to bypass RLS).\n" +
		"Get it from: Supabase Dashboard → Project Settings → API → Service Role Key\n" +
		"Then set it in .env.local",
	);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET = "documents";

// ============================================
// PDF Templates
// ============================================

interface PdfContext {
	elementName: string;
	elementSlug: string;
	candidateName: string;
	issuedAt: Date | null;
	expiresAt: Date | null;
}

type TemplateFunc = (ctx: PdfContext) => Promise<Uint8Array>;

function formatDate(d: Date | null): string {
	if (!d) return "N/A";
	return d.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
}

function generateRef(): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let ref = "";
	for (let i = 0; i < 10; i++) {
		ref += chars[Math.floor(Math.random() * chars.length)];
	}
	return ref;
}

async function createBasePdf(
	title: string,
	subtitle: string,
	lines: string[],
): Promise<Uint8Array> {
	const doc = await PDFDocument.create();
	const page = doc.addPage([595.28, 841.89]); // A4
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

	const { width, height } = page.getSize();
	const margin = 60;
	let y = height - margin;

	// Header line
	page.drawRectangle({
		x: margin,
		y: y - 2,
		width: width - margin * 2,
		height: 2,
		color: rgb(0.2, 0.4, 0.7),
	});
	y -= 30;

	// Title
	page.drawText(title, {
		x: margin,
		y,
		size: 22,
		font: fontBold,
		color: rgb(0.1, 0.1, 0.1),
	});
	y -= 24;

	// Subtitle
	page.drawText(subtitle, {
		x: margin,
		y,
		size: 12,
		font,
		color: rgb(0.4, 0.4, 0.4),
	});
	y -= 40;

	// Content lines
	for (const line of lines) {
		if (line === "") {
			y -= 12;
			continue;
		}
		if (line.startsWith("---")) {
			page.drawRectangle({
				x: margin,
				y: y + 4,
				width: width - margin * 2,
				height: 0.5,
				color: rgb(0.8, 0.8, 0.8),
			});
			y -= 16;
			continue;
		}

		// Bold labels (text before colon)
		const colonIndex = line.indexOf(":");
		if (colonIndex > 0 && colonIndex < 30) {
			const label = line.substring(0, colonIndex + 1);
			const value = line.substring(colonIndex + 1);
			page.drawText(label, {
				x: margin,
				y,
				size: 11,
				font: fontBold,
				color: rgb(0.2, 0.2, 0.2),
			});
			page.drawText(value, {
				x: margin + fontBold.widthOfTextAtSize(label, 11) + 2,
				y,
				size: 11,
				font,
				color: rgb(0.2, 0.2, 0.2),
			});
		} else {
			page.drawText(line, {
				x: margin,
				y,
				size: 11,
				font,
				color: rgb(0.2, 0.2, 0.2),
			});
		}
		y -= 20;
	}

	// Footer
	const footerY = margin;
	page.drawRectangle({
		x: margin,
		y: footerY + 14,
		width: width - margin * 2,
		height: 0.5,
		color: rgb(0.8, 0.8, 0.8),
	});
	page.drawText(`Generated for demonstration purposes — Ref: ${generateRef()}`, {
		x: margin,
		y: footerY,
		size: 8,
		font,
		color: rgb(0.6, 0.6, 0.6),
	});

	return doc.save();
}

// Template: Licence
const licenceTemplate: TemplateFunc = async (ctx) => {
	const states = ["Florida", "California", "Texas", "New York", "Illinois"];
	const state = states[Math.floor(Math.random() * states.length)];
	return createBasePdf(
		"State Board of Nursing",
		`Professional Licence — ${state}`,
		[
			`Name: ${ctx.candidateName}`,
			`Licence Type: ${ctx.elementName}`,
			`Licence Number: RN-${generateRef().slice(0, 7)}`,
			`State: ${state}`,
			"",
			`Date Issued: ${formatDate(ctx.issuedAt)}`,
			`Date of Expiry: ${formatDate(ctx.expiresAt)}`,
			`Status: Active`,
			"---",
			"",
			"This licence authorises the holder to practise nursing in the",
			`state of ${state} subject to the rules and regulations of the`,
			"State Board of Nursing.",
		],
	);
};

// Template: Certification (BLS, ACLS, PALS, etc.)
const certificationTemplate: TemplateFunc = async (ctx) => {
	return createBasePdf(
		"Certificate of Completion",
		"American Heart Association",
		[
			"This is to certify that",
			"",
			`  ${ctx.candidateName}`,
			"",
			`has successfully completed the ${ctx.elementName}`,
			"course and has demonstrated proficiency in the required skills.",
			"",
			`Certification ID: AHA-${generateRef().slice(0, 8)}`,
			`Provider: American Heart Association`,
			`Completion Date: ${formatDate(ctx.issuedAt)}`,
			`Expiry Date: ${formatDate(ctx.expiresAt)}`,
			"---",
			"",
			"This certification meets the standards set forth by the",
			"American Heart Association Guidelines.",
		],
	);
};

// Template: Health record
const healthTemplate: TemplateFunc = async (ctx) => {
	const results: Record<string, string> = {
		"tb-test": "Negative (0mm induration)",
		"hep-b-vaccination": "Series complete — Immune",
		"flu-vaccination": "Administered — Current season",
		"physical-examination": "Cleared — No restrictions",
		"mmr-vaccination": "Immune — Positive titer (IgG > 1.10)",
		"varicella-vaccination": "Immune — Positive titer (IgG > 1.10)",
		"tdap-vaccination": "Administered — Current (within 10 years)",
		"covid-vaccination": "Series complete — Pfizer/BioNTech",
	};
	const result = results[ctx.elementSlug] || "Cleared";

	return createBasePdf(
		"Medical Clearance",
		"Occupational Health Services",
		[
			`Patient: ${ctx.candidateName}`,
			`Assessment: ${ctx.elementName}`,
			"",
			`Date of Assessment: ${formatDate(ctx.issuedAt)}`,
			`Result: ${result}`,
			`Valid Until: ${formatDate(ctx.expiresAt)}`,
			"",
			`Provider: Dr. A. Roberts, MD`,
			`Facility: OccHealth Medical Group`,
			`NPI: 1234567890`,
			"---",
			"",
			"This clearance confirms the individual meets the health",
			"requirements for employment in a healthcare setting.",
		],
	);
};

// Template: Identity documents
const identityTemplate: TemplateFunc = async (ctx) => {
	return createBasePdf(
		"Document Verification",
		"Identity & Right to Work",
		[
			`Individual: ${ctx.candidateName}`,
			`Document Type: ${ctx.elementName}`,
			"",
			`Verification Date: ${formatDate(ctx.issuedAt)}`,
			`Document Reference: ${generateRef()}`,
			`Status: Verified`,
			"---",
			"",
			"This document confirms that the identity and work eligibility",
			"of the named individual has been verified in accordance with",
			"applicable regulations.",
		],
	);
};

// Template: Default
const defaultTemplate: TemplateFunc = async (ctx) => {
	return createBasePdf(
		ctx.elementName,
		"Compliance Document",
		[
			`Name: ${ctx.candidateName}`,
			"",
			`Document Type: ${ctx.elementName}`,
			`Date Issued: ${formatDate(ctx.issuedAt)}`,
			`Valid Until: ${formatDate(ctx.expiresAt)}`,
			`Reference: ${generateRef()}`,
			"---",
			"",
			"This document has been provided to fulfil the compliance",
			"requirement as specified by the employing organisation.",
		],
	);
};

function selectTemplate(slug: string): TemplateFunc {
	if (slug.includes("licen") || slug.includes("licence")) return licenceTemplate;
	if (
		slug.startsWith("bls") ||
		slug.startsWith("acls") ||
		slug.startsWith("pals") ||
		slug.includes("critical-care") ||
		slug.includes("care-certificate") ||
		slug.includes("cms-compliance") ||
		slug.startsWith("crrt")
	) {
		return certificationTemplate;
	}
	if (
		slug.startsWith("tb-") ||
		slug.startsWith("hep-b") ||
		slug.startsWith("flu-") ||
		slug.startsWith("physical-") ||
		slug.startsWith("mmr") ||
		slug.startsWith("varicella") ||
		slug.startsWith("tdap") ||
		slug.startsWith("covid")
	) {
		return healthTemplate;
	}
	if (
		slug.includes("right-to-work") ||
		slug.includes("passport") ||
		slug.includes("identity") ||
		slug.includes("drivers-licence") ||
		slug.includes("social-security")
	) {
		return identityTemplate;
	}
	return defaultTemplate;
}

// ============================================
// Main
// ============================================

async function main() {
	const args = process.argv.slice(2);
	const allFlag = args.includes("--all");
	const limitIndex = args.indexOf("--limit");
	const limit = allFlag
		? undefined
		: limitIndex >= 0
			? Number.parseInt(args[limitIndex + 1], 10)
			: 1;

	console.log(
		limit
			? `Seeding documents (limit: ${limit}). Use --all to process all records.`
			: "Seeding all document evidence records...",
	);

	// Query evidence records that need documents
	const rows = await db
		.select({
			evidenceId: evidence.id,
			organisationId: evidence.organisationId,
			profileId: evidence.profileId,
			issuedAt: evidence.issuedAt,
			expiresAt: evidence.expiresAt,
			filePath: evidence.filePath,
			elementId: evidence.complianceElementId,
			elementName: complianceElements.name,
			elementSlug: complianceElements.slug,
			candidateFirstName: profiles.firstName,
			candidateLastName: profiles.lastName,
		})
		.from(evidence)
		.innerJoin(
			complianceElements,
			eq(evidence.complianceElementId, complianceElements.id),
		)
		.innerJoin(profiles, eq(evidence.profileId, profiles.id))
		.where(
			and(
				eq(complianceElements.evidenceType, "document"),
				ne(evidence.status, "pending"),
				isNull(evidence.filePath),
			),
		);

	if (rows.length === 0) {
		console.log("No evidence records need documents. Done.");
		return;
	}

	const toProcess = limit ? rows.slice(0, limit) : rows;
	console.log(
		`Found ${rows.length} records needing documents, processing ${toProcess.length}...`,
	);

	let success = 0;
	let errors = 0;

	for (const row of toProcess) {
		const candidateName = `${row.candidateFirstName} ${row.candidateLastName}`;
		const slug = row.elementSlug;
		const template = selectTemplate(slug);

		try {
			// Generate PDF
			const pdfBytes = await template({
				elementName: row.elementName,
				elementSlug: slug,
				candidateName,
				issuedAt: row.issuedAt,
				expiresAt: row.expiresAt,
			});

			// Upload path
			const storagePath = `evidence/${row.organisationId}/${row.profileId}/${slug}-${row.evidenceId}.pdf`;
			const fileName = `${slug}.pdf`;

			const { error: uploadError } = await supabase.storage
				.from(BUCKET)
				.upload(storagePath, pdfBytes, {
					contentType: "application/pdf",
					upsert: true,
				});

			if (uploadError) {
				console.error(`  ✗ Upload failed for ${candidateName} / ${slug}: ${uploadError.message}`);
				errors++;
				continue;
			}

			// Update evidence record
			await db
				.update(evidence)
				.set({
					filePath: storagePath,
					fileName,
					mimeType: "application/pdf",
					fileSize: pdfBytes.length,
				})
				.where(eq(evidence.id, row.evidenceId));

			console.log(`  ✓ ${candidateName} — ${row.elementName} (${(pdfBytes.length / 1024).toFixed(1)}KB)`);
			success++;
		} catch (err) {
			console.error(`  ✗ Error for ${candidateName} / ${slug}:`, err);
			errors++;
		}
	}

	console.log(`\nDone: ${success} uploaded, ${errors} errors.`);
	if (limit && rows.length > toProcess.length) {
		console.log(`${rows.length - toProcess.length} records remaining. Run with --all to process all.`);
	}
}

main()
	.catch(console.error)
	.finally(() => closeConnection());
