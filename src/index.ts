import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { handleGenerate } from "./api/generate.js";
import { getTools, isAnthropicModel } from "./agent/tools.js";
import { getSystemPrompt } from "./agent/system-prompt.js";
import { join } from "path";
import { existsSync, unlinkSync } from "fs";

const app = new Hono();

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Tool testing endpoint — exercises all tools for a given model path
app.get("/api/test-tools", async (c) => {
  const model = c.req.query("model") || "openai/gpt-4o";
  const isAnthropic = isAnthropicModel(model);
  console.log(
    `\n🧪 Testing tools for model: ${model} (anthropic=${isAnthropic})`,
  );

  const results: Record<string, { ok: boolean; detail: string }> = {};

  try {
    const tools = await getTools(model);
    results["getTools"] = {
      ok: true,
      detail: `Loaded tools: ${Object.keys(tools).join(", ")}`,
    };

    const prompt = getSystemPrompt(model);
    results["getSystemPrompt"] = {
      ok: true,
      detail: `Prompt length: ${prompt.length} chars, mentions: ${isAnthropic ? "str_replace_based_edit_tool" : "readFile/writeFile/strReplace"}`,
    };

    if (isAnthropic) {
      // For Anthropic tools, we can't call execute directly without the proper wrapper context
      // Just verify the tools loaded with the right keys
      results["anthropicTools"] = {
        ok: "str_replace_based_edit_tool" in tools && "bash" in tools,
        detail: `Keys: ${Object.keys(tools).join(", ")}`,
      };
    } else {
      // ── Test readFile ──
      try {
        const readResult = await tools.readFile.execute(
          { path: join(process.cwd(), "template/math-to-manim/SKILL.md") },
          { toolCallId: "test-read", messages: [] },
        );
        const content =
          typeof readResult === "string"
            ? readResult
            : JSON.stringify(readResult);
        results["readFile"] = {
          ok: content.length > 0,
          detail: `Read ${content.length} chars from SKILL.md`,
        };
      } catch (e: any) {
        results["readFile"] = { ok: false, detail: e.message };
      }

      // ── Test writeFile ──
      const testFilePath = join(
        process.cwd(),
        "generated",
        "_test_tools_probe.txt",
      );
      try {
        const writeResult = await tools.writeFile.execute(
          { path: testFilePath, content: "hello from test-tools" },
          { toolCallId: "test-write", messages: [] },
        );
        const wrote = existsSync(testFilePath);
        results["writeFile"] = {
          ok: wrote,
          detail: wrote
            ? `Wrote ${testFilePath}`
            : "File not found after write",
        };
        // Cleanup
        if (wrote) unlinkSync(testFilePath);
      } catch (e: any) {
        results["writeFile"] = { ok: false, detail: e.message };
      }

      // ── Test bash ──
      try {
        const bashResult = await tools.bash.execute(
          { command: "echo 'hello' && python3 --version" },
          { toolCallId: "test-bash", messages: [] },
        );
        const output =
          typeof bashResult === "string"
            ? bashResult
            : JSON.stringify(bashResult);
        results["bash"] = {
          ok: output.includes("hello"),
          detail: output.substring(0, 200),
        };
      } catch (e: any) {
        results["bash"] = { ok: false, detail: e.message };
      }

      // ── Test strReplace ──
      const replaceTestFile = join(
        process.cwd(),
        "generated",
        "_test_replace_probe.txt",
      );
      try {
        // First create the file
        await tools.writeFile.execute(
          { path: replaceTestFile, content: "AAA BBB CCC" },
          { toolCallId: "test-replace-setup", messages: [] },
        );
        const replaceResult = await tools.strReplace.execute(
          { path: replaceTestFile, old_str: "BBB", new_str: "XXX" },
          { toolCallId: "test-replace", messages: [] },
        );
        const detail =
          typeof replaceResult === "string"
            ? replaceResult
            : JSON.stringify(replaceResult);
        results["strReplace"] = {
          ok: detail.includes("updated"),
          detail,
        };
        // Cleanup
        if (existsSync(replaceTestFile)) unlinkSync(replaceTestFile);
      } catch (e: any) {
        results["strReplace"] = { ok: false, detail: e.message };
        if (existsSync(replaceTestFile)) unlinkSync(replaceTestFile);
      }

      // ── Test insert ──
      const insertTestFile = join(
        process.cwd(),
        "generated",
        "_test_insert_probe.txt",
      );
      try {
        await tools.writeFile.execute(
          { path: insertTestFile, content: "line0\nline1\nline2" },
          { toolCallId: "test-insert-setup", messages: [] },
        );
        const insertResult = await tools.insert.execute(
          { path: insertTestFile, insert_line: 1, insert_text: "INSERTED" },
          { toolCallId: "test-insert", messages: [] },
        );
        const detail =
          typeof insertResult === "string"
            ? insertResult
            : JSON.stringify(insertResult);
        results["insert"] = {
          ok: detail.includes("inserted") || detail.includes("Inserted"),
          detail,
        };
        if (existsSync(insertTestFile)) unlinkSync(insertTestFile);
      } catch (e: any) {
        results["insert"] = { ok: false, detail: e.message };
        if (existsSync(insertTestFile)) unlinkSync(insertTestFile);
      }
    }

    const allOk = Object.values(results).every((r) => r.ok);
    console.log(`🧪 Test results: ${allOk ? "✅ ALL PASS" : "❌ SOME FAILED"}`);
    return c.json({ model, allOk, results });
  } catch (e: any) {
    console.error("🧪 Test failed:", e);
    return c.json({ model, allOk: false, error: e.message, results }, 500);
  }
});

// Main generation endpoint
app.post("/api/generate", async (c) => {
  console.log("\n📥 Received POST request to /api/generate");
  try {
    const body = await c.req.json();
    console.log("📋 Request body:", JSON.stringify(body, null, 2));

    const result = await handleGenerate(body);

    console.log("✅ Generation completed successfully");
    console.log("📊 Result summary:", {
      requestId: result.requestId,
      steps: result.steps,
      usageTokens: result.usage?.totalTokens,
    });

    return c.json(result);
  } catch (error: any) {
    console.error("Error in /api/generate:", error);
    return c.json(
      {
        error: error.message || "Internal server error",
        details: error.stack,
      },
      500,
    );
  }
});

// Global error handler
app.onError((err, c) => {
  console.error("Uncaught error:", err);
  return c.json(
    {
      error: "Internal server error",
      message: err.message,
    },
    500,
  );
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

// Start server
const port = Number(process.env.PORT) || 3001;
const server = serve({
  fetch: app.fetch,
  port,
});

console.log(`🚀 Server running on http://localhost:${port}`);
console.log(`📡 Health check: http://localhost:${port}/health`);
console.log(`🎬 Generate endpoint: http://localhost:${port}/api/generate`);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⏸️  Shutting down gracefully...");
  server.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n⏸️  Shutting down gracefully...");
  server.close((err) => {
    if (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
    process.exit(0);
  });
});
