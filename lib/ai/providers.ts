import { gateway } from "@ai-sdk/gateway";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

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
        // Anthropic Claude - excellent tool support
        "chat-model": gateway.languageModel(
          "anthropic/claude-sonnet-4-20250514"
        ),
        "chat-model-reasoning": wrapLanguageModel({
          model: gateway.languageModel("anthropic/claude-sonnet-4-20250514"),
          middleware: extractReasoningMiddleware({ tagName: "thinking" }),
        }),
        "title-model": gateway.languageModel(
          "anthropic/claude-sonnet-4-20250514"
        ),
        "artifact-model": gateway.languageModel(
          "anthropic/claude-sonnet-4-20250514"
        ),
      },
    });
