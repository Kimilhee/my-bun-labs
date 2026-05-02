# my-bun-labs

여러 사이드 프로젝트가 함께 사는 모노레포. Bun + React/Vite/shadcn/FSD + Hono 가 기본 스택.

## 사전 요구사항

- [Bun](https://bun.sh) ≥ 1.3.13

## 시작

```bash
bun install
```

## 구조

- `apps/` — 사이드 프로젝트들
- `packages/` — 공유 라이브러리 (필요해질 때 추가)

## 더 자세한 가이드

리포 컨벤션, 스택 디폴트, 작업 원칙은 [`CLAUDE.md`](./CLAUDE.md)를 참고.
(`AGENTS.md`는 `CLAUDE.md`의 심볼릭 링크 — Codex/OpenCode 같은 다른 AI agent도 같은 문서를 읽음.)
