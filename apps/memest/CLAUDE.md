# memest — 성경 암송 복습 게임

장절 → 말씀 첫 구절 연결을 회복하는 개인용 복습 PWA. 스마트폰이 주 사용 환경.

- **배포**: https://kimilhee.github.io/my-bun-labs/ (main 푸시 시 GitHub Actions 자동 배포)
- **문서**: [docs/PRD.md](docs/PRD.md) 무엇을·왜 / [docs/ADR.md](docs/ADR.md) 결정 근거 / [docs/design.md](docs/design.md) 구현 설계 / [docs/hard-drill.md](docs/hard-drill.md) 하드드릴 점수 규칙 상세. 설계가 바뀌면 문서를 같은 커밋에서 갱신한다.

## 명령

```bash
bun dev            # dev 서버 (--host — 폰에서 같은 Wi-Fi로 접속 가능)
bun run build      # 프로덕션 빌드 (base=/my-bun-labs/, PWA 프리캐시 생성)
bun run typecheck  # tsc --noEmit
bun run convert    # BTT 원본 → data/verses.json, data/parts.json 재생성
bunx biome check --write .   # 린트+포맷 (루트 biome.json)
```

## 구조

```
BTT/            # 원본 데이터 (EUC-KR, 수정 금지 — 변환기의 입력)
data/           # verses.json(카드 495개)·parts.json(파트 16개) — convert가 생성
scripts/convert-btt.ts
src/
  lib/          # 순수 로직: types, data, curriculum(42일 진도표·복습 순서), drill(하드드릴 부채),
                #   session(큐·범위), app-state(리듀서), hints(초성),
                #   match(어절·첫머리 매칭), speech(Web Speech 래퍼), storage
  ui/           # 화면: session-screen(핵심), start-screen(홈 = 모드 2장), 시트들
docs/           # PRD / ADR / design
```

상태는 전부 `lib/app-state.ts`의 리듀서 + localStorage(`memest:v1`). UI는 dispatch만 한다.

## 이 앱의 규칙

- **배포되는 변경마다 `package.json` version의 패치(맨 뒤) 숫자만 올린다.** 마이너/메이저는 사용자가 명시적으로 허락할 때만. 버전은 설정 시트 하단에 표시되며, 사용자가 폰에서 배포 반영을 확인하는 수단이다. 문서만 바꿀 땐 안 올려도 된다.
- **검증 루틴**: `biome check --write` → `typecheck` → `build` + 로직 변경 시 `bun -e`로 리듀서/채점 헤드리스 테스트. UI는 사용자가 폰에서 실사용 확인.
- **전체 암송의 음성 채점은 재도입하지 말 것** — v0.0~0.1에서 두 방식(대조 채점, 따라 열림)을 시도하고 정확도 문제로 제거했다 (ADR-9·14·15). 허용된 음성 기능은 **첫머리(10글자 어절) 확인**뿐: 글자 단위 50% (ADR-16). 암송 본체는 더블탭 어절 열기 + 자가 판정.
- **모드는 둘뿐이다 (ADR-19)**: 매일 복습(42일 진도 순회, 점수 없음) / 하드 드릴(범위 직접 지정, 부채 점수). 두 세션은 `sessions.daily`·`sessions.drill`로 완전히 분리되어 오가도 각자 남는다. 범위 선택과 −점수는 하드 드릴에만 있다.
- **SRS(Leitner) 스케줄링은 없다** — v0.3.1에서 제거했다 (ADR-20). 되살리려면 git에서 `scheduler.ts`를 꺼내면 되지만, 다시 넣기 전에 사용자와 합의할 것. 남은 기록은 `seen`(다뤄본 적)과 `stats`(누적 틀린 횟수·힌트)뿐.
- 카드는 (파트,제목,장절)이 유일 단위 — 장절 dedupe 금지 (ADR-6).
- localStorage 스키마를 바꿀 때는 `storage.ts`의 기본값 병합으로 하위호환을 지킨다.
