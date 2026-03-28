import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { Sidebar, type AppTab } from "./components/Sidebar";
import {
  bootstrapRuntime,
  downloadModel,
  getBootstrapState,
  getDictationStatus,
  onDictationStatus,
  revealPath,
  saveConfig,
  startDictation,
  stopDictation,
  toggleDictation,
} from "./lib/desktop";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import type { AppConfig, BootstrapState, DictationStatus, OutputMode } from "./types/app";

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("dictation");
  const [state, setState] = useState<BootstrapState | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [dictationStatus, setDictationStatus] = useState<DictationStatus | null>(null);

  useEffect(() => {
    getBootstrapState().then((payload) => {
      setState(payload);
      setConfig(payload.config);
    });
    getDictationStatus().then(setDictationStatus);
    let unlisten: (() => void) | undefined;
    onDictationStatus((payload) => setDictationStatus(payload)).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!config) return;

    const shortcut = config.hotkey.combo
      .split("Cmd")
      .join("Command")
      .split("\u2318")
      .join("Command")
      .split("Option")
      .join("Alt");

    const registerShortcut = async () => {
      await unregisterAll().catch(() => undefined);
      await register(shortcut, async (event) => {
        if (event.state === "Pressed") {
          const status = await toggleDictation();
          setDictationStatus(status);
        }
      });
    };

    registerShortcut().catch(() => undefined);

    return () => {
      unregisterAll().catch(() => undefined);
    };
  }, [config?.hotkey.combo]);

  const runtimeReady = state?.backend.backendReady ?? false;
  const modelInstalled = useMemo(
    () => state?.models.some((m) => m.id === config?.transcription.model && m.installed) ?? false,
    [config?.transcription.model, state?.models],
  );
  const canDictate = runtimeReady && modelInstalled;

  async function persistConfig() {
    if (!config) return;
    setSaving(true);
    try {
      const saved = await saveConfig(config);
      setConfig(saved);
    } finally {
      setSaving(false);
    }
  }

  async function refreshBootstrap() {
    const payload = await getBootstrapState();
    setState(payload);
    setConfig(payload.config);
  }

  async function runBootstrap() {
    setBusyAction("bootstrap");
    try {
      const payload = await bootstrapRuntime();
      setState(payload);
      setConfig(payload.config);
    } catch (err) {
      setBusyAction(null);
      alert(err instanceof Error ? err.message : String(err));
      return;
    }
    setBusyAction(null);
  }

  async function runDownload(modelId: string) {
    setBusyAction(`download:${modelId}`);
    try {
      const payload = await downloadModel(modelId);
      setState(payload);
      setConfig(payload.config);
    } catch (err) {
      setBusyAction(null);
      alert(err instanceof Error ? err.message : String(err));
      return;
    }
    setBusyAction(null);
  }

  async function handleStartStop() {
    if (dictationStatus?.recording) {
      setDictationStatus(await stopDictation());
    } else {
      setDictationStatus(await startDictation());
    }
  }

  if (!state || !config) {
    return (
      <main className="loading-view">
        <div className="loading-spinner" />
        <p>Loading…</p>
      </main>
    );
  }

  const needsSetup =
    !runtimeReady ||
    !modelInstalled ||
    state.permissions.some((p) => p.state === "required");

  return (
    <main className="window-shell">
      <Sidebar activeTab={activeTab} onSelect={setActiveTab} version={state.version} />

      <section className="content-shell">
        {activeTab === "dictation" ? (
          <div className="section-stack">
            <section className="panel">
              <div className="panel__header">
                <h3>Dictation</h3>
                <button
                  className="toolbar-button is-primary"
                  disabled={!canDictate}
                  onClick={handleStartStop}
                  type="button"
                >
                  {dictationStatus?.recording ? "Stop" : "Start"}
                </button>
              </div>

              <div className="status-row">
                <span
                  className={
                    "status-dot" +
                    (dictationStatus?.recording
                      ? " is-recording"
                      : dictationStatus?.transcribing
                        ? " is-transcribing"
                        : "")
                  }
                />
                <span className="status-label">
                  {dictationStatus?.recording
                    ? "Recording…"
                    : dictationStatus?.transcribing
                      ? `Transcribing (${dictationStatus.queueDepth} in queue)`
                      : "Idle"}
                </span>
              </div>

              {dictationStatus?.lastError && (
                <p className="status-error">{dictationStatus.lastError}</p>
              )}

              <p className="hint">
                Hotkey: <strong>{config.hotkey.combo}</strong>{" "}
                ({config.hotkey.mode === "toggle" ? "toggle" : "push-to-talk"})
              </p>
            </section>

            {needsSetup && (
              <section className="panel">
                <div className="panel__header">
                  <h3>Setup</h3>
                  <button className="toolbar-button" onClick={refreshBootstrap} type="button">
                    Refresh
                  </button>
                </div>

                <div className="checklist">
                  <div className="checklist__item">
                    <span>Runtime</span>
                    <div className="checklist__right">
                      {runtimeReady ? (
                        <span className="badge is-success">Ready</span>
                      ) : (
                        <>
                          <span className="badge is-warning">Not found</span>
                          <button
                            className="toolbar-button"
                            disabled={busyAction === "bootstrap"}
                            onClick={runBootstrap}
                            type="button"
                          >
                            {busyAction === "bootstrap" ? "Setting up…" : "Bootstrap"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="checklist__item">
                    <span>Model ({config.transcription.model})</span>
                    <div className="checklist__right">
                      {modelInstalled ? (
                        <span className="badge is-success">Installed</span>
                      ) : (
                        <>
                          <span className="badge is-warning">Not downloaded</span>
                          <button
                            className="toolbar-button"
                            disabled={!!busyAction?.startsWith("download")}
                            onClick={() => runDownload(config.transcription.model)}
                            type="button"
                          >
                            {busyAction === `download:${config.transcription.model}`
                              ? "Downloading…"
                              : "Download"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {state.permissions.map((p) => (
                    <div className="checklist__item" key={p.name}>
                      <span>{p.name}</span>
                      <div className="checklist__right">
                        <span
                          className={
                            p.state === "granted"
                              ? "badge is-success"
                              : p.state === "unknown"
                                ? "badge"
                                : "badge is-warning"
                          }
                        >
                          {p.state === "granted"
                            ? "Granted"
                            : p.state === "unknown"
                              ? "Check on first use"
                              : "Required"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {!runtimeReady && (
                  <p className="hint">
                    Bootstrap links whisper-server, whisper-cli, rec, and sox from your
                    PATH. Install prerequisites first:{" "}
                    <code>brew install whisper-cpp sox</code>
                  </p>
                )}
              </section>
            )}
          </div>
        ) : (
          <div className="section-stack">
            <section className="panel">
              <div className="panel__header">
                <h3>Settings</h3>
                <button
                  className="toolbar-button is-primary"
                  onClick={persistConfig}
                  type="button"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>Shortcut</span>
                  <input
                    value={config.hotkey.combo}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        hotkey: { ...config.hotkey, combo: e.currentTarget.value },
                      })
                    }
                  />
                </label>

                <label className="field">
                  <span>Hotkey mode</span>
                  <select
                    value={config.hotkey.mode}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        hotkey: {
                          ...config.hotkey,
                          mode: e.currentTarget.value as AppConfig["hotkey"]["mode"],
                        },
                      })
                    }
                  >
                    <option value="toggle">Toggle</option>
                    <option value="ptt">Push to Talk</option>
                  </select>
                </label>

                <div className="field field--full">
                  <span>Output mode</span>
                  <div className="segmented">
                    {(["immediate", "clipboard", "typing"] as OutputMode[]).map((mode) => (
                      <button
                        key={mode}
                        className={
                          config.output.mode === mode
                            ? "segmented__item is-active"
                            : "segmented__item"
                        }
                        onClick={() =>
                          setConfig({ ...config, output: { ...config.output, mode } })
                        }
                        type="button"
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="checkbox-row field--full">
                  <input
                    checked={config.output.pasteWhileRecording}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        output: {
                          ...config.output,
                          pasteWhileRecording: e.currentTarget.checked,
                        },
                      })
                    }
                    type="checkbox"
                  />
                  <span>Paste finished transcripts while another recording is running</span>
                </label>

                <label className="field">
                  <span>Model</span>
                  <select
                    value={config.transcription.model}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        transcription: {
                          ...config.transcription,
                          model: e.currentTarget.value,
                        },
                      })
                    }
                  >
                    <option value="small">small</option>
                    <option value="medium">medium</option>
                    <option value="large-v3">large-v3</option>
                  </select>
                </label>

                <label className="field">
                  <span>Language</span>
                  <input
                    value={config.transcription.language}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        transcription: {
                          ...config.transcription,
                          language: e.currentTarget.value,
                        },
                      })
                    }
                  />
                </label>

                <label className="field">
                  <span>Threads</span>
                  <input
                    value={config.transcription.threads}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        transcription: {
                          ...config.transcription,
                          threads: e.currentTarget.value,
                        },
                      })
                    }
                  />
                </label>

                <label className="field">
                  <span>Recordings directory</span>
                  <input
                    value={config.storage.recordingsDir}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        storage: {
                          ...config.storage,
                          recordingsDir: e.currentTarget.value,
                        },
                      })
                    }
                  />
                </label>
              </div>
            </section>

            <section className="panel">
              <h3>Paths</h3>
              <dl className="detail-list">
                <div>
                  <dt>Config file</dt>
                  <dd>
                    <button
                      className="link-button"
                      onClick={() => revealPath(state.backend.configPath)}
                      type="button"
                    >
                      {state.backend.configPath}
                    </button>
                  </dd>
                </div>
                <div>
                  <dt>Recordings</dt>
                  <dd>
                    <button
                      className="link-button"
                      onClick={() => revealPath(config.storage.recordingsDir)}
                      type="button"
                    >
                      {config.storage.recordingsDir}
                    </button>
                  </dd>
                </div>
                <div>
                  <dt>Models</dt>
                  <dd>{state.backend.cacheDir}</dd>
                </div>
              </dl>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
