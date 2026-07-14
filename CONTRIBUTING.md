# Contributing to ComfyUI Workflow Debugger

Thank you for contributing! This guide mirrors the practices used by large open-source projects such as Vue, Vite, and Node.js, adapted to this repository.

The same content is also summarized in [README.md](./README.md#contributing) and [README.zh.md](./README.zh.md#开源贡献指南-contributing) (中文).

## Code of Conduct

Be respectful. Harassment and discrimination are not acceptable.  
Report concerns via [Issues](https://github.com/kaili-yang/ComfyUI-Workflow-Debugger/issues) or contact [Kaili Yang](https://github.com/kaili-yang).

## Ways to contribute

- Fix bugs in analysis, auto-fix, or UI
- Add diagnostics / fix strategies
- Improve docs and translations
- Sync built-in node schema with ComfyUI
- Donate minimal reproduction workflows (sanitized)

Look for Issues labeled `good first issue` or `help wanted`.

## Setup

```bash
git clone git@github.com:kaili-yang/ComfyUI-Workflow-Debugger.git
cd ComfyUI-Workflow-Debugger
pnpm install
pnpm dev       # http://localhost:5177/
pnpm build     # required before opening a PR
```

Requires Node.js 20+ (or current LTS) and [pnpm](https://pnpm.io/).

## Workflow

1. Fork → clone → branch from `main` (`fix/...` or `feat/...`)
2. Keep the PR focused on one change
3. Run `pnpm build`
4. Open a PR against `main` with **what / why / how to test**
5. Address review feedback

### PR checklist

- [ ] Clear problem or value
- [ ] Checks in `src/lib/checks/` stay pure
- [ ] Fixes in `src/lib/fixes/` mark matching issues `fixable: true`
- [ ] Preserve fix order in `fixer.ts` (`fixGhostLinks` before `fixLinkTypeMetadata`)
- [ ] No secrets or private workflow paths
- [ ] `pnpm build` passes

See [CLAUDE.md](./CLAUDE.md) for architecture details when adding checks or fixes.

## Commit messages

Use imperative, Conventional Commit–style subjects:

```
feat: …
fix: …
docs: …
chore: …
style: …
```

Author identity for GitHub contribution graph credit must use a **verified** GitHub email.  
Maintainers of this repo use: `Kelly Yang <124ykl@gmail.com>`.

## Bugs & features

**Bugs:** include version/commit, browser/OS, offline vs connected ComfyUI, minimal JSON repro, expected vs actual.

**Features:** describe the user problem, acceptance criteria, and whether a live ComfyUI server is required.

## License

Licensed under **AGPL-3.0-only**. Contributions are submitted under the same license.

## Contact

- Maintainer: [Kaili Yang](https://github.com/kaili-yang)
- Repo: https://github.com/kaili-yang/ComfyUI-Workflow-Debugger
- Demo: https://comfy-workflow-debugger.netlify.app/
