# ho-english

This app follows the root workspace conventions in `../../CLAUDE.md`.

## Runtime And Tooling

- Use Bun for package management and scripts: `bun install`, `bun run`, `bun test`, `bunx`.
- Do not use Node-specific commands when Bun can run the same workflow.
- Keep TypeScript strict and extend the root `tsconfig.base.json`.
- Use Biome via the root workspace configuration for formatting and linting.

## Frontend Direction

- Use the root default stack unless this app documents a reason to diverge: React 19, Vite 6, and shadcn/ui.
- The Bun-generated "don't use Vite" guidance does not apply here; Vite is the workspace default for frontend apps.
- If this app later chooses Bun HTML imports instead of Vite, document the reason in this file before changing the stack.

## Project Shape

- Start with the Basic FSD layers from the root guide: `app/`, `pages/`, and `shared/`.
- Add `widgets/`, `features/`, or `entities/` only when the app grows enough to need them.
- Keep files and directories in kebab-case.

## Docs Map (새 세션 agent 진입점)

새 세션이 작업을 이어받을 때 다음 순서로 읽으면 컨텍스트 회복:

1. `docs/state.md` — 지금 어디까지 왔고 다음에 뭘 할지.
2. `docs/decisions-log.md` — 왜 이렇게 됐는지(누적 의사결정).
3. `docs/prd.md` — 1쪽 PRD. **4개 모드는 가설**임을 강조.
4. `docs/modes/_hypotheses.md` — 모드 가설 카드. 인터뷰 후 카드별 유지/기각.
5. (선택) `~/.claude/plans/delegated-snacking-bird.md` — 초기 플랜 원본 (로컬 파일, 새 세션에선 없을 수 있음).

골든샘플·프롬프트·라벨 결과 위치는 §Architecture 참조.

## Product Stage

- Current stage: **메타앱(끊어읽기 라벨링 도구)**. 사용자(CEO)가 사진을 OCR하고 단어 사이를 터치해 끊어읽기 위치를 표시 → JSON 다운로드.
- 목적: 본 앱(v0.1, AI 자동 끊어읽기)에 들어갈 골든샘플을 손으로 모으는 동시에, 본 앱이 그대로 재사용할 컴포넌트(`ChunkedText`, `tokenize`, BFF, 프롬프트 파이프)를 까는 것.
- 다음 단계 후보 우선순위는 `docs/state.md`의 "다음 단계 후보" 참조 (학생 인터뷰 5명 → 본 앱 v0 → 유사지문 생성).

## Architecture (메타앱 기준)

- **Frontend**: React 19 + Vite 6 + Tailwind 4. 페이지는 `src/pages/label/` 하나.
- **BFF**: `server/index.ts` — Hono on Bun, 포트 `SERVER_PORT`(기본 3001). `/api/ocr` 엔드포인트 1개. Vite의 `/api` proxy로 클라이언트에 노출.
- **LLM**: Gemini API (`@google/genai`). 모델 ID는 `server/index.ts`의 `MODEL_ID` 상수 한 곳에서 관리. 현재 `gemini-3-flash-preview` (CEO 지정 preview 모델 — rate limit·응답 포맷 변동 가능).
- **프롬프트**: `server/prompts/*.md` — 마크다운 파일로 분리. 코드 변경 없이 프롬프트만 수정하려고. 런타임에 `Bun.file().text()`로 로드.
- **샘플 사진**: `docs/golden/samples/` (HEIC). Gemini는 image/heic을 직접 받음.
- **골든샘플 저장 형식**: 클라이언트가 다운로드하는 JSON. `{ id, image, text, boundaries[], chunks[], labeled_at }`. 본 앱 v0.1에서 few-shot 자료 + 회귀 테스트 시드로 사용.

## Running Locally

두 터미널 필요 (BFF + Vite 개발 서버):

```bash
# 1) .env 준비 (한 번만)
cp .env.example .env   # GEMINI_API_KEY 채우기

# 2) 터미널 A — BFF
bun run dev:server

# 3) 터미널 B — Vite
bun run dev            # 모바일 폰에서 같은 와이파이로 접속하려면 Vite가 host: true로 떠 있음
```

타입체크: `bun run typecheck`. 포매팅·린트: 루트에서 `bun run check`.
