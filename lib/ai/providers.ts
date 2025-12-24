import { createAnthropic } from "@ai-sdk/anthropic";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

// Initialize Anthropic provider with API key
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        // Anthropic Claude - AI SDK 6 supports Claude 4.5 models
        "chat-model": anthropic("claude-sonnet-4-5"),
        "chat-model-reasoning": wrapLanguageModel({
          model: anthropic("claude-sonnet-4-5"),
          middleware: extractReasoningMiddleware({ tagName: "thinking" }),
        }),
        "title-model": anthropic("claude-haiku-4-5"),
        "artifact-model": anthropic("claude-sonnet-4-5"),
      },
    });
