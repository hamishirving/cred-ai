import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { createForm } from "./ai/tools/create-form";
import type { draftEmail } from "./ai/tools/draft-email";
import type { getCustomer } from "./ai/tools/get-customer";
import type { getMetadata } from "./ai/tools/get-org-metadata";
import type { getDocuments } from "./ai/tools/get-profile-documents";
import type { getWeather } from "./ai/tools/get-weather";
import type { lookupProfile } from "./ai/tools/lookup-profile";
import type { manageProfile } from "./ai/tools/manage-profile";
import type { queryDataAgent } from "./ai/tools/query-data-agent";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { updateDocument } from "./ai/tools/update-document";
import type { Suggestion } from "./db/schema";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
	createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type customerTool = InferUITool<typeof getCustomer>;
type queryDataAgentTool = InferUITool<typeof queryDataAgent>;
type lookupProfileTool = InferUITool<typeof lookupProfile>;
type getDocumentsTool = InferUITool<typeof getDocuments>;
type getMetadataTool = InferUITool<typeof getMetadata>;
type manageProfileTool = InferUITool<typeof manageProfile>;
type createFormTool = InferUITool<typeof createForm>;
type draftEmailTool = InferUITool<typeof draftEmail>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
	ReturnType<typeof requestSuggestions>
>;

export type ChatTools = {
	getWeather: weatherTool;
	getCustomer: customerTool;
	queryDataAgent: queryDataAgentTool;
	lookupProfile: lookupProfileTool;
	getDocuments: getDocumentsTool;
	getMetadata: getMetadataTool;
	manageProfile: manageProfileTool;
	createForm: createFormTool;
	draftEmail: draftEmailTool;
	createDocument: createDocumentTool;
	updateDocument: updateDocumentTool;
	requestSuggestions: requestSuggestionsTool;
};

export type CustomUIDataTypes = {
	textDelta: string;
	imageDelta: string;
	sheetDelta: string;
	codeDelta: string;
	suggestion: Suggestion;
	appendMessage: string;
	id: string;
	title: string;
	kind: ArtifactKind;
	clear: null;
	finish: null;
	usage: AppUsage;
};

export type ChatMessage = UIMessage<
	MessageMetadata,
	CustomUIDataTypes,
	ChatTools
>;

export type Attachment = {
	name: string;
	url: string;
	contentType: string;
};
