import { gateway } from "@ai-sdk/gateway";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

type ProviderModelIds = {
  chat: string;
  reasoning: string;
  title: string;
  artifact: string;
};

type ProviderConfig = {
  models: ProviderModelIds;
  loadModel: (modelId: string) => ReturnType<typeof gateway.languageModel>;
};

const applyModelOverrides = (defaults: ProviderModelIds): ProviderModelIds => ({
  chat: process.env.CHAT_MODEL_ID ?? defaults.chat,
  reasoning: process.env.REASONING_MODEL_ID ?? defaults.reasoning,
  title: process.env.TITLE_MODEL_ID ?? defaults.title,
  artifact: process.env.ARTIFACT_MODEL_ID ?? defaults.artifact,
});

const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const xaiApiKey = process.env.XAI_API_KEY;

const providerConfig: ProviderConfig = (() => {
  if (geminiApiKey) {
    const googleProvider = createGoogleGenerativeAI({ apiKey: geminiApiKey });
    return {
      loadModel: (model: string) => googleProvider.languageModel(model),
      models: applyModelOverrides({
        chat: process.env.GEMINI_CHAT_MODEL_ID ?? "gemini-2.5-flash",
        reasoning: process.env.GEMINI_REASONING_MODEL_ID ?? "gemini-2.5-flash",
        title: process.env.GEMINI_TITLE_MODEL_ID ?? "gemini-2.5-flash",
        artifact: process.env.GEMINI_ARTIFACT_MODEL_ID ?? "gemini-2.5-flash",
      }),
    };
  }

  if (xaiApiKey) {
    const xaiProvider = createXai({ apiKey: xaiApiKey });
    return {
      loadModel: (model: string) => xaiProvider.languageModel(model),
      models: applyModelOverrides({
        chat: "grok-2-vision-1212",
        reasoning: "grok-3-mini",
        title: "grok-2-1212",
        artifact: "grok-2-1212",
      }),
    };
  }

  return {
    loadModel: (model: string) => gateway.languageModel(`xai/${model}`),
    models: applyModelOverrides({
      chat: "grok-2-vision-1212",
      reasoning: "grok-3-mini",
      title: "grok-2-1212",
      artifact: "grok-2-1212",
    }),
  };
})();

const selectModel = (key: keyof ProviderModelIds) =>
  providerConfig.loadModel(providerConfig.models[key]);

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
        "chat-model": selectModel("chat"),
        "chat-model-reasoning": wrapLanguageModel({
          model: selectModel("reasoning"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "title-model": selectModel("title"),
        "artifact-model": selectModel("artifact"),
      },
    });
