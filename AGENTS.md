# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Math-to-Manim AI: A TypeScript API server that transforms any topic into professional Manim (Python math animation library) code using a single LLM call with tool-use loops.

## Commands

```bash
# Development (hot reload)
npm run dev

# Build TypeScript
npm run build

# Production
npm run start

# Test the API
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"topic": "heap sort"}'

# Validate generated Manim code
python3 -m py_compile generated/{requestId}/*_animation.py
```

## Environment Variables

Requires `.env` with:

- `AI_GATEWAY_API_KEY` - Vercel AI Gateway API key (or provider-specific key)
- `PORT` (optional) - Server port, defaults to 3000

## Architecture

### Request Flow

```
POST /api/generate { topic, model? }
  → streamText() with any model via AI Gateway
  → getTools(model) selects tool implementation:
    - Anthropic models → provider-defined tools (textEditor + bash)
    - Other models → bash-tool (AI SDK registry) + custom file tools
  → getSystemPrompt(model) adapts tool references in prompt
  → Agent reads template skill files via file tools
  → Agent executes six-agent pipeline in reasoning (single LLM call)
  → Agent creates output files via file tools
  → Agent validates Python via bash tool
  → Returns generated code
```

### Key Components

- `src/index.ts` - Hono HTTP server entry point
- `src/api/generate.ts` - Main generation endpoint handler using Vercel AI SDK `generateText()`
- `src/agent/system-prompt.ts` - `getSystemPrompt(modelId)` — adapts tool references per provider
- `src/agent/tools.ts` - `getTools(modelId)` — dual-path tool factory (Anthropic native vs generic)

### Six-Agent Pipeline (Conceptual)

The system prompt guides the LLM to act as six sequential "agents" in one pass:

1. **ConceptAnalyzer** - Parse topic into concept/domain/level/goal
2. **PrerequisiteExplorer** - Build knowledge tree via recursive prerequisite discovery
3. **MathematicalEnricher** - Add LaTeX equations to each tree node
4. **VisualDesigner** - Specify colors, animations, camera movements
5. **NarrativeComposer** - Generate verbose scene-by-scene prompt (2000+ tokens)
6. **CodeGenerator** - Produce working Manim CE Python code

### Template/Skill Files

Located in `template/math-to-manim/`:

- `SKILL.md` - Pipeline overview (read first by the agent)
- `reverse-knowledge-tree.md` - Prerequisite discovery algorithm
- `agent-system-prompts.md` - Detailed prompts for each conceptual agent
- `verbose-prompt-format.md` - Scene prompt structure
- `manim-code-patterns.md` - Manim code patterns and anti-patterns
- `examples/pythagorean-theorem/` - Complete worked example

### Output Directory

Generated files go to `generated/{requestId}/`:

- `{topic}_tree.json` - Knowledge tree
- `{topic}_prompt.txt` - Verbose narrative prompt
- `{topic}_animation.py` - Manim Python code

## Code Patterns

### LaTeX in Manim

Always use raw strings:

```python
MathTex(r"\frac{a}{b}")  # Correct
MathTex("\\frac{a}{b}")  # Wrong - escape issues
```

### Tool Definitions

Tools are selected at runtime based on the model provider:

**Anthropic models** (`anthropic/*`) — uses provider-defined tools:

```typescript
anthropic.tools.textEditor_20250728({ execute: async (...) => {...} })
anthropic.tools.bash_20250124({ execute: async (...) => {...} })
```

**All other models** — uses `bash-tool` (AI SDK tools registry) + custom tools:

```typescript
// From bash-tool package (Vercel)
const { tools } = await createBashTool({...});
// tools.bash, tools.readFile, tools.writeFile

// Custom surgical edit tools
tool({ description: '...', inputSchema: z.object({...}), execute: ... })
// strReplace, insert
```

Shared execute helpers (`executeStrReplace`, `executeInsert`) are used by both paths.

### AI SDK Usage

Uses `gateway()` from `ai` package for model routing:

```typescript
model: gateway("anthropic/claude-sonnet-4.5");
```

## Dependencies

- **Hono** - Lightweight HTTP framework
- **Vercel AI SDK** (`ai`, `@ai-sdk/gateway`, `@ai-sdk/anthropic`) - LLM orchestration
- **bash-tool** + **just-bash** - AI SDK tools registry bash/file tools (model-agnostic path)
- **Manim CE** - Required on host for validation/rendering (Python)

### Model Support

Pass `model` in the request body to use any AI Gateway-supported model:

```bash
# Anthropic (default) — uses native provider tools
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"topic": "heap sort"}'

# OpenAI — uses bash-tool + custom tools
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"topic": "heap sort", "model": "openai/gpt-4o"}'

# Google — uses bash-tool + custom tools
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"topic": "heap sort", "model": "google/gemini-2.0-flash"}'
```
