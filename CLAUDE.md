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

이 리포에 특화된 행동 디폴트. 보편 원칙(Simplicity first · Surgical changes · Goal-driven · Ship simplest demo · Lean on ecosystem)은 `~/.claude/CLAUDE.md` §1 참조.

### Default to action; pause when irreversible

이 리포는 사이드 프로젝트 모노레포 — 이 디폴트가 특히 강하게 적용된다 (대부분 그린필드, 안전망보다 출시 속도가 우선). 빠른 출시의 핵심은 "토론 줄이고 diff 늘리기".

- **Reversible**(파일 편집, 프로토타입, 작은 추가)에서는 **먼저 실행**한다. 가정을 의식처럼 나열하지 말고, 일단 만들고 diff로 대화하라.
- **Irreversible / 비싼 결정**(공개 API 모양, DB 스키마/마이그레이션, 인증 방식, 새 dependency 추가, 외부 서비스 호출, 배포)에서는 **반드시 한 번 멈춰** 의도를 확인.
- 가정을 말로 푸는 비용 < 잘못 만든 비용 일 때만 질문. 그 외엔 그냥 짠다.
- 불확실하면 **walking skeleton**(가장 작은 검증 가능한 버전) 부터.

## 5. 컨벤션

- **디렉토리/파일명**: kebab-case (`user-profile/`, `use-auth.ts`). (컨벤션이 있는 파일 예외: README.md) 
- **컴포넌트명**: 컴포넌트명이 소스코드상에 `PascalCase` 여도 파일명은 여전히 kebab-case로 `pascal-case.tsx`.
- **import 정렬**: Biome `assist`에 위임 (`bun run check`).
- **포맷팅 충돌**: Biome 결과가 정답. 수동 포맷팅 금지.
- **커밋 메시지**: 자유롭되 명령형 짧게. Conventional Commits는 강제 안 함.

## 6. Map (더 깊은 문서)

새 디테일이 쌓이면 여기에 한 줄씩 추가. 이 섹션이 리포의 진입점.

- `apps/memest/docs/design.md` — 성경 암송 복습 게임(memest) 설계서. 음성(STT) 암송 채점 + Leitner 스케줄링, GitHub Pages 배포(PWA).

## 7. AI agent 사용에 대해

보편 가정(AGENTS.md = CLAUDE.md 심볼릭, 우선순위, 큰 결정 단독 금지)은 `~/.claude/CLAUDE.md` §4 참조. agent는 글로벌 + 이 문서의 원칙을 함께 따른다고 가정한다.
