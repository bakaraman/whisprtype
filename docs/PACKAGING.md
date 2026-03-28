# Packaging

## Release targets

- macOS `.dmg`
- macOS `.app.tar.gz`

## Source build prerequisites

- Xcode Command Line Tools
- Rust toolchain
- Node.js 20+

## Packaging flow

```bash
npm install
npm run build
npm run tauri build
```

## Installer script

`scripts/install-latest-macos.sh` downloads the latest GitHub release asset and installs it under `/Applications`.

## Release hygiene

- update screenshots
- update changelog
- confirm `README` quick start
- verify `config.example.json`
