import { streamText, stepCountIs, createGateway } from "ai";
import { getSystemPrompt } from "../agent/system-prompt.js";
import { getTools } from "../agent/tools.js";
import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import { join } from "path";

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY!,
});

interface GenerateRequest {
  topic: string;
  model?: string;
}

export async function handleGenerate(body: GenerateRequest) {
  const { topic, model } = body;
  const requestId = randomUUID();
  const outputDir = join(process.cwd(), "generated", requestId);
  const resolvedModel = model || "anthropic/claude-haiku-4.5";

  console.log("🎯 Starting generation for topic:", topic);
  console.log("🆔 Request ID:", requestId);
  console.log("📁 Output directory:", outputDir);
  console.log("🤖 Model:", resolvedModel);

  mkdirSync(outputDir, { recursive: true });

  // Resolve tools and system prompt based on model provider
  const tools = await getTools(resolvedModel);
  const system = getSystemPrompt(resolvedModel);

  console.log("🚀 Calling AI model with streamText...");
  const result = streamText({
    model: gateway(resolvedModel),
    system,
    prompt: `Create a Manim animation for the topic: "${topic}"\n\nWrite all output files (JSON, TXT, PY) into the directory: ${outputDir}`,
    tools,
    stopWhen: stepCountIs(50),
    onError({ error }) {
      console.error("❌ streamText error:", error);
    },
  });

  for await (const textPart of result.textStream) {
    process.stdout.write(textPart);
  }
  process.stdout.write("\n");

  const [text, usage, steps] = await Promise.all([
    result.text,
    result.usage,
    result.steps,
  ]);

  console.log("✨ AI generation completed");
  console.log("📈 Total steps executed:", steps?.length ?? 0);
  console.log("📊 Token usage:", usage);

  return {
    requestId,
    text,
    usage,
    steps: steps?.length ?? 0,
  };
}
