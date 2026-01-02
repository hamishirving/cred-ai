"use client";

import {
	createContext,
	useContext,
	useState,
	useEffect,
	type ReactNode,
} from "react";

export interface Organisation {
	id: string;
	name: string;
	type: string | null;
}

interface OrgContextValue {
	organisations: Organisation[];
	selectedOrg: Organisation | null;
	setSelectedOrgId: (id: string) => void;
	loading: boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
	const [organisations, setOrganisations] = useState<Organisation[]>([]);
	const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	// Fetch organisations on mount
	useEffect(() => {
		async function fetchOrganisations() {
			try {
				const response = await fetch("/api/organisations");
				const data = await response.json();
				if (data.organisations?.length > 0) {
					setOrganisations(data.organisations);
					// Select first org by default
					setSelectedOrgId(data.organisations[0].id);
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
