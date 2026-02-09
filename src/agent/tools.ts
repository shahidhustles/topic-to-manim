import { anthropic } from "@ai-sdk/anthropic";
import { tool } from "ai";
import { z } from "zod";
import { createBashTool, type Sandbox } from "bash-tool";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

// ── Shared execute helpers (used by both Anthropic and generic paths) ──

function executeStrReplace(
  path: string,
  oldStr: string,
  newStr: string,
): string {
  const fullPath = resolve(path);
  console.log(`🧰 Tool: Updating ${path} (str_replace)`);
  if (!existsSync(fullPath))
    return `Error: File ${path} not found for str_replace`;
  const current = readFileSync(fullPath, "utf-8");
  if (!current.includes(oldStr)) {
    return `Error: old_str not found in ${path}. Make sure the string matches exactly including whitespace.`;
  }
  const updated = current.replace(oldStr, newStr);
  writeFileSync(fullPath, updated, "utf-8");
  return `File updated: ${path}`;
}

function executeInsert(
  path: string,
  insertLine: number,
  insertText: string,
): string {
  const fullPath = resolve(path);
  console.log(`🧰 Tool: Inserting into ${path} at line ${insertLine}`);
  if (!existsSync(fullPath)) return `Error: File ${path} not found for insert`;
  const lines = readFileSync(fullPath, "utf-8").split("\n");
  lines.splice(insertLine, 0, insertText);
  writeFileSync(fullPath, lines.join("\n"), "utf-8");
  return `Text inserted at line ${insertLine} in ${path}`;
}

// ── Anthropic-specific tools (provider-defined, used when model is anthropic/*) ──

function getAnthropicTextEditorTool() {
  return anthropic.tools.textEditor_20250728({
    maxCharacters: 50000,
    execute: async ({
      command,
      path,
      file_text,
      old_str,
      new_str,
      insert_line,
      insert_text,
      view_range,
    }) => {
      const fullPath = resolve(path);

      switch (command) {
        case "view": {
          if (view_range) {
            console.log(
              `🧰 Tool: Reading ${path} (lines ${view_range[0]}-${view_range[1]})`,
            );
          } else {
            console.log(`🧰 Tool: Reading ${path}`);
          }
          if (!existsSync(fullPath)) return `Error: File ${path} not found`;
          const content = readFileSync(fullPath, "utf-8");
          if (view_range) {
            const lines = content.split("\n");
            return lines.slice(view_range[0] - 1, view_range[1]).join("\n");
          }
          return content;
        }

        case "create": {
          console.log(`🧰 Tool: Writing ${path}`);
          mkdirSync(dirname(fullPath), { recursive: true });
          writeFileSync(fullPath, file_text!, "utf-8");
          return `File created: ${path}`;
        }

        case "str_replace":
          return executeStrReplace(path, old_str!, new_str!);

        case "insert":
          return executeInsert(path, insert_line!, insert_text!);

        default:
          return `Unknown command: ${command}`;
      }
    },
  });
}

function getAnthropicBashTool() {
  return anthropic.tools.bash_20250124({
    execute: async ({ command, restart }) => {
      if (restart) {
        console.log("🧰 Tool: Bash session restarted");
        return "Bash session restarted";
      }
      try {
        console.log(`🧰 Tool: Running command: ${command}`);
        const { execSync } = await import("child_process");
        const result = execSync(command, {
          timeout: 30000,
          encoding: "utf-8",
          maxBuffer: 1024 * 1024,
        });
        return result || "Command executed successfully (no output)";
      } catch (error: any) {
        return `Error: ${error.message}\nStderr: ${error.stderr || ""}\nStdout: ${error.stdout || ""}`;
      }
    },
  });
}

// ── Generic tools (model-agnostic, uses bash-tool from AI SDK registry) ──

function getStrReplaceTool() {
  return tool({
    description:
      "Replace a specific string in a file. Use this to make surgical edits to existing files. " +
      "The old_str must match EXACTLY (including whitespace/indentation). " +
      "Only the first occurrence is replaced.",
    inputSchema: z.object({
      path: z.string().describe("Absolute path to the file to edit"),
      old_str: z
        .string()
        .describe(
          "The exact string to find and replace. Must match exactly including whitespace.",
        ),
      new_str: z
        .string()
        .describe("The replacement string. Can be empty to delete old_str."),
    }),
    execute: async ({ path, old_str, new_str }) => {
      return executeStrReplace(path, old_str, new_str);
    },
  });
}

function getInsertTool() {
  return tool({
    description:
      "Insert text at a specific line number in a file. " +
      "Line numbers are 0-indexed. The text is inserted before the specified line.",
    inputSchema: z.object({
      path: z.string().describe("Absolute path to the file"),
      insert_line: z
        .number()
        .describe("The 0-indexed line number to insert text before"),
      insert_text: z.string().describe("The text to insert"),
    }),
    execute: async ({ path, insert_line, insert_text }) => {
      return executeInsert(path, insert_line, insert_text);
    },
  });
}

// ── Host sandbox (runs everything on the local machine, not in isolation) ──
// Swap this for @vercel/sandbox when deploying to production.

function createHostSandbox(): Sandbox {
  return {
    async executeCommand(command: string) {
      try {
        console.log(`🧰 Tool: Running command: ${command}`);
        const stdout = execSync(command, {
          timeout: 30000,
          encoding: "utf-8",
          maxBuffer: 1024 * 1024,
          cwd: process.cwd(),
          env: { ...process.env },
        });
        return { stdout: stdout || "", stderr: "", exitCode: 0 };
      } catch (error: any) {
        return {
          stdout: error.stdout || "",
          stderr: error.stderr || error.message,
          exitCode: error.status ?? 1,
        };
      }
    },
    async readFile(path: string) {
      const fullPath = resolve(path);
      console.log(`🧰 Tool: Reading ${path}`);
      if (!existsSync(fullPath)) {
        throw new Error(`File not found: ${path}`);
      }
      return readFileSync(fullPath, "utf-8");
    },
    async writeFiles(files: Array<{ path: string; content: string | Buffer }>) {
      for (const file of files) {
        const fullPath = resolve(file.path);
        console.log(`🧰 Tool: Writing ${file.path}`);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, file.content, "utf-8");
      }
    },
  };
}

async function getGenericTools() {
  const hostSandbox = createHostSandbox();
  const { tools: bashTools } = await createBashTool({
    sandbox: hostSandbox,
    destination: process.cwd(),
    onBeforeBashCall: ({ command }) => {
      console.log(`🧰 Tool (bash-tool): Running command: ${command}`);
      return undefined;
    },
    onAfterBashCall: ({ command, result }) => {
      if (result.exitCode !== 0) {
        console.log(
          `🧰 Tool: Command failed (exit ${result.exitCode}): ${command}`,
        );
      }
      return undefined;
    },
  });

  return {
    bash: bashTools.bash,
    readFile: bashTools.readFile,
    writeFile: bashTools.writeFile,
    strReplace: getStrReplaceTool(),
    insert: getInsertTool(),
  };
}

// ── Public API ──

export type ToolSet = Record<string, any>;

export function isAnthropicModel(modelId: string): boolean {
  return modelId.startsWith("anthropic/");
}

export async function getTools(modelId: string): Promise<ToolSet> {
  if (isAnthropicModel(modelId)) {
    console.log("🔧 Using Anthropic provider-defined tools");
    return {
      str_replace_based_edit_tool: getAnthropicTextEditorTool(),
      bash: getAnthropicBashTool(),
    };
  }

  console.log("🔧 Using generic tools (bash-tool + custom file tools)");
  return getGenericTools();
}
