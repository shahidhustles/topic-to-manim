# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the TypeScript API server and request handling logic.
- `src/index.ts` wires up the Hono HTTP server and routes.
- `src/api/generate.ts` implements `POST /api/generate`, orchestrating the single-call tool loop and output creation.
- `src/agent/` holds prompt and tool configuration, including provider-specific tool wiring and system prompt shaping (`system-prompt.ts`, `tools.ts`).
- `template/math-to-manim/` contains the agent’s skill templates, prompt formats, and examples used during generation.
- `generated/{requestId}/` is runtime output only and will contain the knowledge tree, verbose prompt, and Manim code files for each request.

## Build, Test, and Development Commands
- `pnpm run dev` starts the API with hot reload for local development and iterating on prompts/tools.
- `pnpm run build` compiles TypeScript into the production bundle.
- `pnpm run start` runs the compiled server build.
- `curl -X POST http://localhost:3001/api/generate ...` exercises the endpoint and produces files in `generated/{requestId}/`.
- `python3 -m py_compile generated/{requestId}/*_animation.py` validates generated Manim code syntax before rendering.

## Coding Style & Naming Conventions
- Language: TypeScript for the server and Python for generated Manim output.
- Indentation: 2 spaces in TS, 4 spaces in Python (match default formatter expectations).
- Naming: files and directories use `kebab-case` or `snake_case`; request outputs follow `{topic}_tree.json`, `{topic}_prompt.txt`, `{topic}_animation.py`.
- LaTeX in Manim must use raw strings to avoid escape bugs, e.g., `MathTex(r"\\frac{a}{b}")`.
- Prefer small, composable helpers in `src/agent/` to keep tool wiring readable and provider-agnostic.

## Testing Guidelines
- No dedicated test runner is defined in this repo today.
- Use the API `curl` example for functional checks and to verify request/response behavior.
- Validate Manim output with `py_compile` before running full renders to catch syntax issues early.
- Keep generated artifacts out of automated verification unless explicitly testing output stability.

## Commit & Pull Request Guidelines
- No explicit commit convention is documented; use concise, imperative summaries (e.g., “Add tool wiring for provider X”).
- PRs should include a brief description, repro steps, and example output files or logs when behavior changes.
- Link related issues or tickets when applicable.
- Call out any model/provider-specific changes because tool paths differ by provider.

## Configuration & Environment
- Required `.env` values: `AI_GATEWAY_API_KEY`. Optional: `PORT` (defaults to 3001).
- Manim CE must be installed on the host for validation and rendering.
- Local runs should ensure Python is available for validation and that `generated/` is writable.

## Rendering with Watermark
- `scripts/render.py` renders Manim animations with "© Vibe Ask" watermark overlay (bottom-right, 70% opacity).
- Usage: `python3 scripts/render.py <animation.py> <SceneName> -q <l|m|h|k>`
- Options: `-w "text"` (custom watermark), `--no-watermark` (skip), `--keep-original`, `--font-size N`, `--opacity 0.0-1.0`
- Requires: FFmpeg, PIL/Pillow (`pip install Pillow`)
