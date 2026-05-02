# 진행 상태 스냅샷

> 새 세션에서 가장 먼저 읽는 페이지. "지금 어디까지 왔고 다음에 뭘 할지"를 한 화면에.
> 자세한 결정 맥락은 `decisions-log.md`, 제품 정의는 `prd.md`, 모드 가설은 `modes/_hypotheses.md`.

마지막 업데이트: 2026-05-03

## 완료 (1단계: 메타앱)

- 모노레포 + ho-english 골격 (React 19 / Vite 6 / Tailwind 4 / FSD `app|pages|shared`).
- 의존성: `hono`, `@google/genai`.
- `.env.example` (`GEMINI_API_KEY`, `SERVER_PORT`).
- `server/index.ts` — Hono BFF, `/api/health`, `/api/ocr`. 모델 ID는 `MODEL_ID` 상수 한 곳.
- `server/prompts/ocr.md` — 한국 고등학교 영어 교과서 맥락 OCR system prompt.
- `vite.config.ts` proxy: `/api` → `http://localhost:${SERVER_PORT}`.
- `package.json` 스크립트: `dev`, `dev:server`, `build`, `typecheck`.
- `src/shared/text/tokenize.ts` — `tokenize`, `toChunks`.
- `src/shared/components/chunked-text.tsx` — 라벨링·뷰 양쪽 모드.
- `src/pages/label/label-page.tsx` — 메타앱 UI (사진 → OCR → spacer 터치 → JSON 다운로드).
- `docs/golden/samples/` — CEO 제공 내신 지문 사진 4장 (HEIC).
- `apps/ho-english/CLAUDE.md` 갱신 — Product Stage / Architecture / Running Locally.
- 검증: typecheck, Biome check, `vite build`, BFF `/api/health` 응답 모두 통과.

## CEO 진행 중 (1단계 완료를 위해 필요)

1. `cp .env.example .env` 후 `GEMINI_API_KEY` 채우기.
2. 두 터미널: `bun run dev:server` + `bun run dev`.
3. 사진 4장 라벨링 → JSON 4개 다운로드.
4. 다운로드한 JSON을 어디에 모을지 결정 (제안: `docs/golden/labels/`).
5. 라벨링 중 떠오른 청크 분할 기준·UX 불편 메모 → `modes/_hypotheses.md`의 끊어읽기 항목에 추가.

## 차단됨 / 진행 전 결정 필요

- **4개 모드(끊어읽기/지문분석/어휘/문법)는 가설.** 학생 인터뷰 5명 후 확정. 인터뷰 전엔 첫 모드 우선순위 변경에 대해 단정 X. (`modes/_hypotheses.md` 참조)
- **골든샘플 git 커밋 여부** 미정. HEIC 사진 + JSON 라벨. 저작권은 사적 이용 영역이지만 repo 공개 시 재고. 일단 `docs/golden/`은 untracked로 둠.
- **본 앱 `/api/analyze` 출력 스키마**(끊어읽기 외) 미정 — 모드 확정 후.

## 다음 단계 후보 (CEO 결정 대기)

A. **§F1 본 앱 v0 walking skeleton** (메타앱 라벨링 통과 후) — `pages/scan/` + `/api/analyze`(chunking) + 골든샘플 few-shot.
B. **학생 인터뷰 5명** (모드 가설 검증) — 코드 0줄, 1주. CEO가 진행.
C. **유사지문 생성 모드** (Future TODO) — 본 앱 v0 통과 후 v0.2 후보 1순위.

권장 순서: B → 결과로 첫 모드 재확인 → A → C.

## 알려진 미해결 이슈

- HEIC 미리보기는 Chrome에서 안 보일 수 있음 (Safari OK). OCR 자체는 Gemini가 처리.
- `gemini-3-flash-preview`는 preview — rate limit·응답 포맷 변동 가능. `MODEL_ID` 상수 한 곳에서 변경.
- 메타앱 모바일 라벨링 시 spacer 터치 정확도는 실제 시도 후 패딩 튜닝 필요할 수 있음.
