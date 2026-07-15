# memest — 성경 암송 복습 게임

장절 → 말씀 첫 구절 연결을 회복하는 개인용 복습 PWA. 스마트폰이 주 사용 환경.

- **배포**: https://kimilhee.github.io/my-bun-labs/ (main 푸시 시 GitHub Actions 자동 배포)
- **문서**: [docs/PRD.md](docs/PRD.md) 무엇을·왜 / [docs/ADR.md](docs/ADR.md) 결정 근거 / [docs/design.md](docs/design.md) 구현 설계. 설계가 바뀌면 문서를 같은 커밋에서 갱신한다.

## 명령

```bash
bun dev            # dev 서버 (--host + 자체서명 HTTPS — 폰 마이크 테스트용)
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
  lib/          # 순수 로직: types, data, scheduler(Leitner), session(큐),
                #   app-state(리듀서), hints(초성), match(자모 LCS 채점),
                #   archaic(옛말 사전), speech(Web Speech 래퍼), storage
  ui/           # 화면: session-screen(핵심), start-screen, 시트들
docs/           # PRD / ADR / design
```

상태는 전부 `lib/app-state.ts`의 리듀서 + localStorage(`memest:v1`). UI는 dispatch만 한다.

## 이 앱의 규칙

- **배포되는 변경마다 `package.json` version을 올린다** (수정=패치, 기능=마이너). 버전은 설정 시트 하단에 표시되며, 사용자가 폰에서 배포 반영을 확인하는 수단이다. 문서만 바꿀 땐 안 올려도 된다.
- **검증 루틴**: `biome check --write` → `typecheck` → `build` + 로직 변경 시 `bun -e`로 리듀서/채점 헤드리스 테스트. UI는 사용자가 폰에서 실사용 확인.
- **옛말 오인식 제보가 오면** `src/lib/archaic.ts`에 단어/어미를 추가한다 (근거: ADR-9).
- 안드로이드 STT의 괴상한 동작(중복·조기종료)은 `lib/speech.ts`에 우회가 모여 있다 (ADR-10). 함부로 단순화하지 말 것.
- 채점 임계값(일반 80%/옛말 50%/완벽 75%, 세션 85%/첫소절 80%)은 `lib/match.ts` 상단 상수. 조정 요청이 잦은 지점.
- 카드는 (파트,제목,장절)이 유일 단위 — 장절 dedupe 금지 (ADR-6).
- localStorage 스키마를 바꿀 때는 `storage.ts`의 기본값 병합으로 하위호환을 지킨다.
