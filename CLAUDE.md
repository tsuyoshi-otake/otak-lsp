# AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: for existing codebase)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: design review)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: after implementation)
- Progress check: `/kiro:spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro:steering-custom`)

---

## Domain Knowledge: Japanese Grammar Analyzer VSCode Extension

### Architecture
- **LSP-based**: Language Server Protocol implementation with client/server architecture
- **Morphological Analysis**: kuromoji.js (pure JavaScript, no external MeCab dependency)
- **IPA Dictionary**: Embedded dictionary for Japanese tokenization

### Key Implementation Details

#### Position Calculation
- kuromoji's `word_position` returns **byte offset** (UTF-8), not character offset
- Japanese characters are 3 bytes in UTF-8, causing position mismatch
- Solution: Calculate character positions sequentially from token surfaces instead of using `word_position`

#### Grammar Rules Implemented
1. **Double Particle (二重助詞)**: Detects repeated particles like 「がが」「をを」
2. **Problematic Particle Sequence (助詞連続)**: Detects invalid combinations like 「がを」「をが」「にを」
3. **Verb-Particle Mismatch (動詞-助詞不整合)**: Detects intransitive verbs with 「を」
4. **Redundant Copula (冗長な助動詞)**: Detects patterns like 「でです」「でます」「にです」

#### Semantic Highlighting
- Token types: noun, verb, adjective, particle, adverb, other
- Colors mapped to Japanese parts of speech (品詞)
- Requires `workspace/semanticTokens/refresh` after async analysis completion

#### Valid Particle Combinations (Not Flagged)
- 「には」「では」「とは」「からは」「まで」「への」「からの」「との」

### File Structure
```
client/src/extension.ts    - VSCode extension client, status bar, commands
server/src/main.ts         - Language server entry point
server/src/mecab/analyzer.ts - kuromoji wrapper (MeCab-compatible API)
server/src/grammar/checker.ts - Grammar rule engine
server/src/semantic/tokenProvider.ts - Semantic token provider
server/src/hover/provider.ts - Hover information provider
shared/src/types.ts        - Shared type definitions
```

### Supported Languages
- plaintext, markdown, javascript, typescript, python, c, cpp, java, rust
- For code files: analyzes Japanese text in comments only
