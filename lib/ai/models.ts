export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Claude Sonnet 4.5",
    description: "Most capable model with excellent tool support",
  },
  {
    id: "chat-model-reasoning",
    name: "Claude Sonnet 4.5 (Reasoning)",
    description: "Uses extended thinking for complex problems (tools disabled)",
  },
];
