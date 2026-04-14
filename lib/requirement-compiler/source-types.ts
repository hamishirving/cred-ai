export interface MedsolProtocolAssetGroup {
	msName: string;
	msProtocolAsset1: string;
	msProtocolAsset2: string;
	msProtocolAsset3: string;
	msProtocolAsset4: string;
	msProtocolAsset5: string;
}

export interface MedsolConditionalAssetPayload {
	msProtocolassetid: string;
	msName: string;
	msDisplayname: string;
	msProtocolassetcategoryname?: string;
	msProtocolassettypename: string;
	msIsglobal: boolean;
	msProtocolexpirationtypename: string;
	protocolAssetGroups: MedsolProtocolAssetGroup[];
	msInternalinstructions: string;
	msAffiliateinstructions?: string;
	msTravelerinstructions?: string;
	layerInternalInstructions?: string;
	layerAffiliateInstructions?: string;
	layerTravelerInstructions?: string;
}

export interface TxmRequirementItem {
	id: string;
	title: string;
	category: string;
	scope: "profile" | "placement";
	evidenceKinds: string[];
	physicalExpiryMonths?: number | null;
	reviewCadenceMonths?: number | null;
	carryForward: boolean;
	allowsWaiver: boolean;
	notes: string[];
}

export interface TxmRequirementPayload {
	organisation: string;
	model: string;
	placementReviewCadenceMonths: number;
	requirements: TxmRequirementItem[];
}
