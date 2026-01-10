// TypeScript types generated from Credentially Public API v2.0.0 OpenAPI spec

export interface CustomFieldInputDto {
	fieldName: string;
	value: any;
}

export interface ChecklistAssignmentDto {
	id: string;
	status: string;
}

export interface ComplianceTagDto {
	key: string;
	name: string;
	group: string;
}

export interface CustomFieldDto {
	shortName: string;
	name: string;
	value: any;
}

export interface GradeDto {
	code: string;
	name: string;
}

export interface RoleDto {
	id: string;
	name: string;
}

export interface RoleExtendedDto {
	id: number;
	name: string;
	description: string;
	staffType: string;
	reserved: boolean;
	accessTags: string[];
}

export interface UserTitleDto {
	key: string;
	defaultValue: string;
}

export interface JobPositionDto {
	id: number;
	status: string;
	archivedDateTime?: string;
	startDate?: string;
	trialEndDate?: string;
	endDate?: string;
	signedOff: boolean;
	skipOnboarding: boolean;
	workSiteId: number;
	role: RoleDto;
	complianceStatus: string;
	complianceStatusTags: ComplianceTagDto[];
}

export interface ProfileDto {
	id: string;
	firstName: string;
	lastName: string;
	title?: UserTitleDto;
	gender?: string;
	birthDate?: string;
	gradeName?: GradeDto;
	otherGrade?: string;
	medicalCategory?: string;
	medicalSpecialty?: string;
	personnelType?: RoleExtendedDto;
	jobs: JobPositionDto[];
	complianceStatus: string;
	complianceStatusTags: ComplianceTagDto[];
	checklists: ChecklistAssignmentDto[];
	customProfileFields: CustomFieldDto[];
}

export interface CreateProfileRequestDto {
	email: string;
	roleName?: string;
	firstName?: string;
	lastName?: string;
	birthDate?: string;
	registrationNumber?: string;
	phone?: string;
	skipOnboarding?: boolean;
	sendInviteEmail?: boolean;
	fields?: CustomFieldInputDto[];
}

export interface CreateProfileResponseDto {
	customFieldUpdateResult: string;
	profileDto: ProfileDto;
}

export interface UpdateProfileFieldsRequestDto {
	email: string;
	fields: CustomFieldInputDto[];
}

export interface OrganisationRoleDto {
	id: number;
	name: string;
	description: string;
	staffType: string;
	reserved: boolean;
	accessTags: string[];
	employeesCount: number;
	signUpAllowed: boolean;
}

export interface ProfileMetadataResultDto {
	name: string;
	jsonSchema: Record<string, any>;
}

export interface OrganisationMetadataDto {
	profileFields: ProfileMetadataResultDto[];
	roles: OrganisationRoleDto[];
}

export interface UserSummaryDto {
	id: string;
	firstName: string;
	lastName: string;
	smallAvatarUrl?: string;
	roleName: string;
	active: boolean;
}

export interface VerificationDto {
	verificationType: string;
	note?: string;
	created: string;
	verifier: UserSummaryDto;
}

export interface VerificationStatusDto {
	status: string;
	verifier: UserSummaryDto;
	approvalRole: string;
	verifiedDate: string;
}

export interface ActiveFileDto {
	id: number;
	publicId: string;
	extraOcrFields: Record<string, any>;
	issued?: string;
	expiry?: string;
	monthToExpire?: number;
	daysToExpire?: number;
	created: string;
	issuesReason?: string;
	verifications: VerificationDto[];
	actualVerificationStatuses: VerificationStatusDto[];
	statusType: string;
	uploader: UserSummaryDto;
}

export interface DocumentTypeDto {
	id: number;
	name: string;
	description: string;
	key: string;
	shortName: string;
	expiryPeriodInMonths?: number;
	expireSoonPeriodInDays?: number;
	category: string;
	reminderText?: string;
	ocrSupported: boolean;
	common: boolean;
	profileOwnerRestricted: boolean;
}

export interface DocumentDto {
	id: string;
	description: string;
	type: DocumentTypeDto;
	otherTypeName?: string;
	profileId: string;
	versions: number;
	activeFile?: ActiveFileDto;
	statusType: string;
}

// Compliance Packages Types
export interface CheckIntegrationDto {
	name: string;
	type: string;
}

export interface DocumentTypeBaseDto {
	id: number;
	name: string;
	description: string;
	key: string;
}

export interface EmployeeBasicDto {
	id: string;
	firstName: string;
	lastName: string;
	smallAvatarUrl?: string;
}

export interface ReferenceFormBaseDto {
	id: string;
	title: string;
	businessRules?: string;
	phoneRequired: boolean;
	prohibitPersonalEmails: boolean;
	expired: boolean;
}

export interface TextRequirementShortDto {
	id: string;
	name: string;
}

export type ComplianceRequirementType =
	| "DOCUMENT_TYPE"
	| "INTEGRATION"
	| "REFERENCE_FORM"
	| "TEXT_REQUIREMENT";

export type ComplianceStatus = "COMPLIANT" | "NOT_COMPLIANT";

export interface EmployeeComplianceRequirementDto {
	id: string;
	type: ComplianceRequirementType;
	complianceStatus: ComplianceStatus;
	complianceTags: ComplianceTagDto[];
	documentType?: DocumentTypeBaseDto;
	referenceForm?: ReferenceFormBaseDto;
	requiredReferencesNumber?: number;
	integration?: CheckIntegrationDto;
	textRequirement?: TextRequirementShortDto;
	approved?: string;
	approvedBy?: EmployeeBasicDto;
}

export interface EmployeeComplianceGroupDto {
	id: string;
	name: string;
	requirements: EmployeeComplianceRequirementDto[];
}

export interface CompliancePackageDto {
	id: string;
	name: string;
	modified: boolean;
	groups: EmployeeComplianceGroupDto[];
}

// API Error Response
export interface ApiError {
	status: number;
	statusText: string;
	message: string;
}

// Legacy types - kept for backwards compatibility
export interface Customer {
	id: string;
	name: string;
	email: string;
	phone?: string;
	status?: "active" | "inactive" | "pending";
	createdAt?: string;
}

export interface ToolError {
	error: string;
}
