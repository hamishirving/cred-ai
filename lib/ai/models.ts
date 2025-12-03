export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Claude Sonnet",
    description: "Fast, intelligent model with excellent tool support",
  },
  {
    id: "chat-model-reasoning",
    name: "Claude Reasoning",
    description: "Uses extended thinking for complex problems (tools disabled)",
  },
];
