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

## First-run bootstrap

Fresh macOS users should be able to install WhisprType without manually setting up `whisper.cpp` binaries first.

The intended product flow is:

- install the app
- launch it
- let WhisprType bootstrap or unpack its runtime assets
- choose and download a model from inside the app
- start dictating

## Release hygiene

- update screenshots
- update changelog
- confirm `README` quick start
- verify `config.example.json`
