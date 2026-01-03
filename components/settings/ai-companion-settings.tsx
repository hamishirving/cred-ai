"use client";

import { useState, useEffect } from "react";
import { Sparkles, Save, RefreshCw, Mail, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface AICompanionSettings {
	enabled: boolean;
	orgPrompt?: string;
	emailFrequency: "daily" | "every_2_days" | "weekly";
	sendTime: string;
	timezone: string;
}

interface ComplianceContact {
	name: string;
	email: string;
	phone?: string;
}

interface OrgSettings {
	aiCompanion?: AICompanionSettings;
	complianceContact?: ComplianceContact;
}

interface AICompanionSettingsProps {
	organisationId: string;
	organisationName: string;
	initialSettings?: OrgSettings;
}

export function AICompanionSettings({
	organisationId,
	organisationName,
	initialSettings,
}: AICompanionSettingsProps) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [previewEmail, setPreviewEmail] = useState<{ subject: string; body: string } | null>(null);
	const [saved, setSaved] = useState(false);

	// Form state
	const [enabled, setEnabled] = useState(initialSettings?.aiCompanion?.enabled ?? true);
	const [orgPrompt, setOrgPrompt] = useState(initialSettings?.aiCompanion?.orgPrompt ?? "");
	const [emailFrequency, setEmailFrequency] = useState<"daily" | "every_2_days" | "weekly">(
		initialSettings?.aiCompanion?.emailFrequency ?? "daily",
	);
	const [sendTime, setSendTime] = useState(initialSettings?.aiCompanion?.sendTime ?? "09:00");
	const [timezone, setTimezone] = useState(initialSettings?.aiCompanion?.timezone ?? "Europe/London");

	// Contact state
	const [contactName, setContactName] = useState(initialSettings?.complianceContact?.name ?? "");
	const [contactEmail, setContactEmail] = useState(initialSettings?.complianceContact?.email ?? "");
	const [contactPhone, setContactPhone] = useState(initialSettings?.complianceContact?.phone ?? "");

	// Fetch current settings
	useEffect(() => {
		async function fetchSettings() {
			try {
				const response = await fetch(`/api/organisations/${organisationId}`);
				if (response.ok) {
					const data = await response.json();
					const settings = data.organisation?.settings as OrgSettings | undefined;
					if (settings?.aiCompanion) {
						setEnabled(settings.aiCompanion.enabled ?? true);
						setOrgPrompt(settings.aiCompanion.orgPrompt ?? "");
						setEmailFrequency(settings.aiCompanion.emailFrequency ?? "daily");
						setSendTime(settings.aiCompanion.sendTime ?? "09:00");
						setTimezone(settings.aiCompanion.timezone ?? "Europe/London");
					}
					if (settings?.complianceContact) {
						setContactName(settings.complianceContact.name ?? "");
						setContactEmail(settings.complianceContact.email ?? "");
						setContactPhone(settings.complianceContact.phone ?? "");
					}
				}
			} catch (error) {
				console.error("Failed to fetch settings:", error);
			}
		}
		fetchSettings();
	}, [organisationId]);

	// Save settings
	const handleSave = async () => {
		setSaving(true);
		setSaved(false);
		try {
			const response = await fetch(`/api/organisations/${organisationId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					aiCompanion: {
						enabled,
						orgPrompt: orgPrompt || undefined,
						emailFrequency,
						sendTime,
						timezone,
					},
					complianceContact: contactName || contactEmail ? {
						name: contactName,
						email: contactEmail,
						phone: contactPhone || undefined,
					} : undefined,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to save");
			}

			setSaved(true);
			setTimeout(() => setSaved(false), 3000);
		} catch (error) {
			console.error("Failed to save settings:", error);
		} finally {
			setSaving(false);
		}
	};

	// Preview sample email
	const handlePreview = async () => {
		setPreviewLoading(true);
		setPreviewEmail(null);
		try {
			// First save the current settings
			await handleSave();

			// Then generate a preview using a sample candidate
			// For demo, we'll use the AI to generate based on current settings
			const response = await fetch(`/api/organisations/${organisationId}/preview-email`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orgPrompt,
					complianceContact: {
						name: contactName,
						email: contactEmail,
						phone: contactPhone,
					},
				}),
			});

			if (response.ok) {
				const data = await response.json();
				setPreviewEmail({
					subject: data.email?.subject || "Sample compliance update",
					body: data.email?.body || "This is a sample email preview.",
				});
			}
		} catch (error) {
			console.error("Failed to generate preview:", error);
		} finally {
			setPreviewLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Enable/Disable */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Sparkles className="h-5 w-5 text-primary" />
							<div>
								<CardTitle>AI Companion</CardTitle>
								<CardDescription>
									Automated compliance communications for candidates
								</CardDescription>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								id="enabled"
								checked={enabled}
								onCheckedChange={(checked) => setEnabled(checked === true)}
							/>
							<Label htmlFor="enabled" className="font-medium">
								{enabled ? "Enabled" : "Disabled"}
							</Label>
						</div>
					</div>
				</CardHeader>
			</Card>

			{enabled && (
				<>
					{/* Compliance Contact */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Compliance Contact</CardTitle>
							<CardDescription>
								Contact details shown in candidate communications
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="contactName">Contact Name</Label>
									<div className="relative">
										<User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
										<Input
											id="contactName"
											placeholder="Sarah Jones"
											value={contactName}
											onChange={(e) => setContactName(e.target.value)}
											className="pl-9"
										/>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="contactEmail">Email</Label>
									<div className="relative">
										<Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
										<Input
											id="contactEmail"
											type="email"
											placeholder="compliance@company.com"
											value={contactEmail}
											onChange={(e) => setContactEmail(e.target.value)}
											className="pl-9"
										/>
									</div>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="contactPhone">Phone (optional)</Label>
								<div className="relative">
									<Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										id="contactPhone"
										placeholder="0800 123 4567"
										value={contactPhone}
										onChange={(e) => setContactPhone(e.target.value)}
										className="pl-9"
									/>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Organisation Voice */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Organisation Voice</CardTitle>
							<CardDescription>
								Customise how the AI writes on behalf of {organisationName}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="orgPrompt">Custom Instructions</Label>
								<Textarea
									id="orgPrompt"
									placeholder={`You're writing on behalf of ${organisationName}.

Tone: Warm and supportive. We help healthcare professionals find flexible work opportunities.

Be encouraging about the opportunities available once compliant.

Sign off as: "${organisationName} Compliance Team"`}
									value={orgPrompt}
									onChange={(e) => setOrgPrompt(e.target.value)}
									rows={8}
								/>
								<p className="text-xs text-muted-foreground">
									These instructions guide the AI's tone and style when writing emails.
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Schedule Settings */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Schedule</CardTitle>
							<CardDescription>
								When to send automated compliance emails
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-3">
								<div className="space-y-2">
									<Label>Frequency</Label>
									<Select value={emailFrequency} onValueChange={(v) => setEmailFrequency(v as typeof emailFrequency)}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="daily">Daily</SelectItem>
											<SelectItem value="every_2_days">Every 2 days</SelectItem>
											<SelectItem value="weekly">Weekly</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Send Time</Label>
									<Select value={sendTime} onValueChange={setSendTime}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="08:00">8:00 AM</SelectItem>
											<SelectItem value="09:00">9:00 AM</SelectItem>
											<SelectItem value="10:00">10:00 AM</SelectItem>
											<SelectItem value="11:00">11:00 AM</SelectItem>
											<SelectItem value="12:00">12:00 PM</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Timezone</Label>
									<Select value={timezone} onValueChange={setTimezone}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
											<SelectItem value="America/New_York">New York (EST/EDT)</SelectItem>
											<SelectItem value="America/Chicago">Chicago (CST/CDT)</SelectItem>
											<SelectItem value="America/Los_Angeles">Los Angeles (PST/PDT)</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Preview */}
					{previewEmail && (
						<Card className="border-primary">
							<CardHeader>
								<CardTitle className="text-base flex items-center gap-2">
									<Mail className="h-4 w-4" />
									Sample Email Preview
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="rounded-md bg-muted p-3 text-sm">
									<p><span className="font-medium">Subject:</span> {previewEmail.subject}</p>
								</div>
								<div className="rounded-md border p-4">
									<pre className="whitespace-pre-wrap font-sans text-sm">
										{previewEmail.body}
									</pre>
								</div>
								<Button variant="outline" size="sm" onClick={() => setPreviewEmail(null)}>
									Close Preview
								</Button>
							</CardContent>
						</Card>
					)}
				</>
			)}

			{/* Actions */}
			<div className="flex items-center gap-3">
				<Button onClick={handleSave} disabled={saving}>
					{saving ? (
						<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Save className="mr-2 h-4 w-4" />
					)}
					{saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
				</Button>
				{enabled && (
					<Button variant="outline" onClick={handlePreview} disabled={previewLoading}>
						{previewLoading ? (
							<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Sparkles className="mr-2 h-4 w-4" />
						)}
						Preview Sample Email
					</Button>
				)}
			</div>
		</div>
	);
}
