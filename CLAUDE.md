# my-bun-labs

여러 사이드 프로젝트가 함께 사는 단일 모노레포. 매번 같은 결정을 다시 하지 않으려고 루트에 약속을 박제해둠. 이 문서는 그 약속들의 **목차이자 지도(map)** — 깊은 디테일은 각 섹션이 가리키는 곳으로 따라간다.

## 1. 레이아웃

```
my-bun-labs/
├─ apps/                # 사이드 프로젝트들 (각자 독립적으로 실행)
├─ packages/            # 여러 앱이 공유하는 라이브러리 (생기면 그 때 추출)
├─ tsconfig.base.json   # 모든 TS 프로젝트가 extends 하는 베이스
├─ biome.json           # 포매터+린터 통합 설정
├─ package.json         # workspaces: ["apps/*", "packages/*"]
└─ CLAUDE.md            # ← 지금 이 문서
```

→ 각 앱의 로컬 컨벤션은 `apps/<name>/CLAUDE.md`에. *(앱이 생기면 작성)*

## 2. 스택 디폴트

| 영역 | 디폴트 | 비고 |
|---|---|---|
| Runtime | **Bun ≥ 1.3.13** | 모든 install/run/test는 `bun` 우선 |
| Frontend | **React 19 + Vite 6 + shadcn/ui** | + Basic FSD 레이어링 |
| Backend | **Hono 4 on Bun** | `Bun.serve` + Hono |
| Lang | **TypeScript** strict | 루트 `tsconfig.base.json` extends |
| Lint/Format | **Biome 2** | ESLint + Prettier 대신 단일 도구 |
| Test | **`bun test`** | UI 컴포넌트 테스트 필요시 Vitest 추가 |

**Basic FSD** = `app/`, `pages/`, `shared/` 4개 레이어로 시작. `widgets`, `features/`, `entities`는 진짜 필요할 때만.

**이탈 정책**: 디폴트는 강제가 아니라 기본값. 다른 선택을 하면 해당 앱의 `README` 또는 로컬 `CLAUDE.md`에 사유 1-2줄. 루트는 손대지 않는다.

→ 스택 디테일이 깊어지면 `docs/stack/<topic>.md`로 분기. *(아직 없음)*

## 3. 새 프로젝트 시작

```bash
cd apps && bun init <name>
cd <name>
# 1) tsconfig.json 에서 "extends": "../../tsconfig.base.json"
# 2) 필요한 의존성: react, vite, hono 등
# 3) scripts: dev, build, typecheck (루트의 typecheck가 위임함)
```

루트의 `package.json` workspaces가 자동으로 인식. 의존성은 호이스팅됨.

## 4. Working principles

빠른 출시를 위한 6원칙. 이 리포의 모든 코드/리뷰/AI agent 작업의 기본 자세.

### 1) Default to action; pause when irreversible

빠른 출시의 핵심은 "토론 줄이고 diff 늘리기".

- **Reversible**(파일 편집, 프로토타입, 작은 추가)에서는 **먼저 실행**한다. 가정을 의식처럼 나열하지 말고, 일단 만들고 diff로 대화하라.
- **Irreversible / 비싼 결정**(공개 API 모양, DB 스키마/마이그레이션, 인증 방식, 새 dependency 추가, 외부 서비스 호출, 배포)에서는 **반드시 한 번 멈춰** 의도를 확인.
- 가정을 말로 푸는 비용 < 잘못 만든 비용 일 때만 질문. 그 외엔 그냥 짠다.
- 불확실하면 **walking skeleton**(가장 작은 검증 가능한 버전) 부터.

### 2) Simplicity first

- 요청된 것 외 기능 금지. 일회용 코드에 추상화 금지. 안 일어날 에러에 핸들러 금지.
- 200줄을 50줄로 만들 수 있으면 다시 쓴다.
- "시니어가 보면 over-engineered라고 할까?" — 그렇다면 줄여라.

### 3) Surgical changes

- 요청 범위 밖의 코드/포맷팅/주석을 "개선"하지 마라.
- 내 변경이 만든 고아(unused import 등)만 치운다. 기존 dead code는 언급만 하고 손대지 않는다.
- 모든 변경된 줄은 사용자 요청까지 추적 가능해야 한다.

### 4) Goal-driven, but ship-shaped

- 작업을 검증 가능한 목표로 바꾼다 ("validation 추가" → "잘못된 입력 테스트 작성 → 통과시키기").
- **검증의 기본 단위는 happy path 1개**. 엣지 케이스는 happy path가 동작한 다음에.
- 멀티스텝 작업은 짧은 plan을 적되, 한 단계씩 끝내고 다음으로.

### 5) Ship the simplest demo first

- Working > perfect. **End-to-end happy path 먼저**, 그 다음에 엣지/에러/폴리시.
- 깊이를 줄이지 말고 **scope를 줄여라**.
- Hardcode → mock → real 의 순서. 진짜 데이터는 진짜 필요해질 때.

### 6) Lean on the ecosystem

- 직접 짜기 전에 라이브러리부터 본다. NIH는 비용이다.
- 디폴트 스택을 기본으로 쓰고, 이탈은 사유 1-2줄로 기록.
- "최신 + 안정"이 기준. 1.x 미도달이거나 활발히 깨지는 라이브러리는 피한다.

## 5. 컨벤션

- **디렉토리/파일명**: kebab-case (`user-profile/`, `use-auth.ts`). (컨벤션이 있는 파일 예외: README.md) 
- **컴포넌트명**: 컴포넌트명이 소스코드상에 `PascalCase` 여도 파일명은 여전히 kebab-case로 `pascal-case.tsx`.
- **import 정렬**: Biome `assist`에 위임 (`bun run check`).
- **포맷팅 충돌**: Biome 결과가 정답. 수동 포맷팅 금지.
- **커밋 메시지**: 자유롭되 명령형 짧게. Conventional Commits는 강제 안 함.
- **`.env`**: 절대 커밋 금지. `.env.example`만 커밋.

## 6. Map (더 깊은 문서)

새 디테일이 쌓이면 여기에 한 줄씩 추가. 이 섹션이 리포의 진입점.

- *(비어있음. 첫 앱이 생기면 `apps/<name>/CLAUDE.md` 가 추가됨)*

## 7. AI agent 사용에 대해

이 리포는 Claude Code, Codex, OpenCode 등 여러 AI agent를 가정한다.

- `AGENTS.md`는 `CLAUDE.md`로의 심볼릭 링크 — 이 문서가 진실의 단일 원천.
- agent에게 작업을 시킬 때는 §4 원칙을 따른다고 가정해도 된다 (이 문서를 읽었으니).
- 큰 결정(스택 변경, 패키지 추출, 마이그레이션)은 agent가 단독으로 진행하지 말고 사람과 합의.
