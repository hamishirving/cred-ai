"use client";

import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	type ReactNode,
} from "react";
import type { OrgSettings } from "@/lib/db/schema/organisations";

export interface Organisation {
	id: string;
	name: string;
	type: string | null;
	settings?: OrgSettings | null;
}

interface OrgContextValue {
	organisations: Organisation[];
	selectedOrg: Organisation | null;
	setSelectedOrgId: (id: string) => void;
	loading: boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

// Helper to set cookie (client-side)
function setOrgCookie(orgId: string) {
	document.cookie = `selectedOrgId=${orgId}; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year
}

// Helper to get cookie value
function getOrgCookie(): string | null {
	const match = document.cookie.match(/selectedOrgId=([^;]+)/);
	return match ? match[1] : null;
}

export function OrgProvider({ children }: { children: ReactNode }) {
	const [organisations, setOrganisations] = useState<Organisation[]>([]);
	const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	// Wrapper that also sets cookie
	const setSelectedOrgId = useCallback((id: string) => {
		setSelectedOrgIdState(id);
		setOrgCookie(id);
	}, []);

	// Fetch organisations on mount
	useEffect(() => {
		async function fetchOrganisations() {
			try {
				const response = await fetch("/api/organisations");
				const data = await response.json();
				if (data.organisations?.length > 0) {
					setOrganisations(data.organisations);

					// Check for existing cookie first
					const cookieOrgId = getOrgCookie();
					const validCookieOrg = cookieOrgId && data.organisations.some((o: Organisation) => o.id === cookieOrgId);

					if (validCookieOrg) {
						setSelectedOrgIdState(cookieOrgId);
					} else {
						// Select first org by default and set cookie
						const firstOrgId = data.organisations[0].id;
						setSelectedOrgIdState(firstOrgId);
						setOrgCookie(firstOrgId);
					}
				}
			} catch (err) {
				console.error("Failed to fetch organisations:", err);
			} finally {
				setLoading(false);
			}
		}
		fetchOrganisations();
	}, []);

	const selectedOrg =
		organisations.find((o) => o.id === selectedOrgId) ?? null;

	return (
		<OrgContext.Provider
			value={{
				organisations,
				selectedOrg,
				setSelectedOrgId,
				loading,
			}}
		>
			{children}
		</OrgContext.Provider>
	);
}

export function useOrg() {
	const context = useContext(OrgContext);
	if (!context) {
		throw new Error("useOrg must be used within an OrgProvider");
	}
	return context;
}
