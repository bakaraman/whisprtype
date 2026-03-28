import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { JsonPreview } from "./components/JsonPreview";
import { Sidebar, type AppTab } from "./components/Sidebar";
import { StatusCard } from "./components/StatusCard";
import { Timeline } from "./components/Timeline";
import { getBootstrapState, revealPath, saveConfig } from "./lib/desktop";
import type { AppConfig, BootstrapState, OutputMode } from "./types/app";

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("quick");
  const [state, setState] = useState<BootstrapState | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBootstrapState().then((payload) => {
      setState(payload);
      setConfig(payload.config);
    });
  }, []);

  const grantedPermissions = useMemo(
    () => state?.permissions.filter((item) => item.state === "granted").length ?? 0,
    [state],
  );

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

  function updateOutputMode(mode: OutputMode) {
    if (!config) return;
    setConfig({
      ...config,
      output: {
        ...config.output,
        mode,
      },
    });
  }

  if (!state || !config) {
    return (
      <main className="loading-shell">
        <div className="loading-shell__pulse" />
        <div>
          <p className="eyebrow">Booting WhisprType</p>
          <h1>Preparing the control panel…</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Sidebar activeTab={activeTab} onSelect={setActiveTab} />

      <section className="content-shell">
        <header className="hero">
          <div>
            <p className="eyebrow">macOS dictation control panel</p>
            <h2>{state.tagline}</h2>
            <p className="hero__lede">
              Menubar-first local dictation with whisper.cpp, configurable hotkeys, paste-anywhere
              automation, and enough diagnostics to stay sane when macOS permissions get weird.
            </p>
          </div>

          <div className="hero__actions">
            <button className="button button--primary" onClick={() => revealPath(state.backend.configPath)} type="button">
              Reveal config
            </button>
            <button className="button" onClick={() => revealPath(config.storage.recordingsDir)} type="button">
              Open recordings
            </button>
          </div>
        </header>

        <section className="stats-grid">
          <StatusCard
            label="Default hotkey"
            value={config.hotkey.combo}
            hint={`${config.hotkey.mode === "toggle" ? "Toggle recording" : "Push to talk"} mode`}
            tone="success"
          />
          <StatusCard
            label="Backend"
            value={state.backend.backendReady ? "Ready" : "Needs setup"}
            hint={state.backend.whisperServerPath ?? "whisper-server not detected"}
            tone={state.backend.backendReady ? "success" : "warn"}
          />
          <StatusCard
            label="Permissions"
            value={`${grantedPermissions}/${state.permissions.length} granted`}
            hint="Microphone and Accessibility are the two critical macOS permissions."
            tone={grantedPermissions === state.permissions.length ? "success" : "warn"}
          />
          <StatusCard
            label="Model"
            value={config.transcription.model}
            hint={`Language: ${config.transcription.language} · Threads: ${config.transcription.threads}`}
          />
        </section>

        {activeTab === "quick" ? (
          <div className="section-stack">
            <section className="panel panel--feature">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Primary flow</p>
                  <h3>Quick Dictation</h3>
                </div>
              </div>
              <div className="feature-grid">
                <div className="feature-card">
                  <span>1</span>
                  <h4>Press your hotkey</h4>
                  <p>Default is {config.hotkey.combo}. Karabiner users can map Globe to F18.</p>
                </div>
                <div className="feature-card">
                  <span>2</span>
                  <h4>Speak naturally</h4>
                  <p>WhisprType captures audio locally, keeps a tiny pre-roll, then hands it to whisper.cpp.</p>
                </div>
                <div className="feature-card">
                  <span>3</span>
                  <h4>Paste instantly</h4>
                  <p>Finished transcripts paste as soon as they are ready, even if another recording is still live.</p>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Recent transcripts</p>
                  <h3>History</h3>
                </div>
              </div>
              <Timeline items={state.recentTranscripts} />
            </section>
          </div>
        ) : null}

        {activeTab === "hotkeys" ? (
          <div className="section-stack">
            <section className="panel form-grid">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Hotkeys</p>
                  <h3>Hotkeys & Behavior</h3>
                </div>
                <button className="button button--primary" onClick={persistConfig} type="button">
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>

              <label className="field">
                <span>Hotkey combo</span>
                <input
                  value={config.hotkey.combo}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      hotkey: { ...config.hotkey, combo: event.currentTarget.value },
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Hotkey mode</span>
                <select
                  value={config.hotkey.mode}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      hotkey: { ...config.hotkey, mode: event.currentTarget.value as AppConfig["hotkey"]["mode"] },
                    })
                  }
                >
                  <option value="toggle">Toggle recording</option>
                  <option value="ptt">Push-to-talk</option>
                </select>
              </label>

              <label className="field field--full">
                <span>Paste behavior</span>
                <div className="segmented">
                  {(["immediate", "clipboard", "typing"] as OutputMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={config.output.mode === mode ? "segmented__item is-active" : "segmented__item"}
                      onClick={() => updateOutputMode(mode)}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </label>

              <label className="checkbox-row field--full">
                <input
                  checked={config.output.pasteWhileRecording}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      output: { ...config.output, pasteWhileRecording: event.currentTarget.checked },
                    })
                  }
                  type="checkbox"
                />
                <span>Paste finished transcripts immediately, even while another recording is still running.</span>
              </label>
            </section>

            <JsonPreview title="Current behavior config" value={config} />
          </div>
        ) : null}

        {activeTab === "models" ? (
          <div className="section-stack">
            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Models</p>
                  <h3>Models & Performance</h3>
                </div>
              </div>
              <div className="model-grid">
                {state.models.map((model) => (
                  <article className="model-card" key={model.id}>
                    <div className="model-card__head">
                      <h4>{model.label}</h4>
                      <span className={model.installed ? "badge is-success" : "badge"}>{model.installed ? "Installed" : "Optional"}</span>
                    </div>
                    <p>{model.recommendedFor}</p>
                    <code>{model.path ?? "Not downloaded yet"}</code>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel form-grid">
              <label className="field">
                <span>Preferred model</span>
                <select
                  value={config.transcription.model}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      transcription: { ...config.transcription, model: event.currentTarget.value },
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
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      transcription: { ...config.transcription, language: event.currentTarget.value },
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Threads</span>
                <input
                  value={config.transcription.threads}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      transcription: { ...config.transcription, threads: event.currentTarget.value },
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Idle on battery (sec)</span>
                <input
                  type="number"
                  value={config.transcription.serverIdleSecondsBattery}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      transcription: {
                        ...config.transcription,
                        serverIdleSecondsBattery: Number(event.currentTarget.value),
                      },
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Idle on AC (sec)</span>
                <input
                  type="number"
                  value={config.transcription.serverIdleSecondsAC}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      transcription: {
                        ...config.transcription,
                        serverIdleSecondsAC: Number(event.currentTarget.value),
                      },
                    })
                  }
                />
              </label>
            </section>
          </div>
        ) : null}

        {activeTab === "permissions" ? (
          <div className="section-stack">
            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Diagnostics</p>
                  <h3>Permissions & Diagnostics</h3>
                </div>
              </div>
              <div className="permissions-grid">
                {state.permissions.map((permission) => (
                  <article className="permission-card" key={permission.name}>
                    <div className="permission-card__head">
                      <h4>{permission.name}</h4>
                      <span className={permission.state === "granted" ? "badge is-success" : "badge is-warn"}>
                        {permission.state}
                      </span>
                    </div>
                    <p>{permission.summary}</p>
                    <small>{permission.action}</small>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Backend status</p>
                  <h3>whisper.cpp integration</h3>
                </div>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>whisper-server</dt>
                  <dd>{state.backend.whisperServerPath ?? "Missing"}</dd>
                </div>
                <div>
                  <dt>whisper-cli</dt>
                  <dd>{state.backend.whisperCliPath ?? "Missing"}</dd>
                </div>
                <div>
                  <dt>Cache directory</dt>
                  <dd>{state.backend.cacheDir}</dd>
                </div>
                <div>
                  <dt>App Support</dt>
                  <dd>{state.backend.appSupportDir}</dd>
                </div>
                <div>
                  <dt>Config file</dt>
                  <dd>{state.backend.configPath}</dd>
                </div>
              </dl>
            </section>
          </div>
        ) : null}

        {activeTab === "advanced" ? (
          <div className="section-stack">
            <section className="panel form-grid">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Advanced</p>
                  <h3>Storage & capture tuning</h3>
                </div>
              </div>

              <label className="field">
                <span>Input device</span>
                <input
                  value={config.capture.inputDevice}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      capture: { ...config.capture, inputDevice: event.currentTarget.value },
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Pre-roll (ms)</span>
                <input
                  type="number"
                  value={config.capture.preRollMs}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      capture: { ...config.capture, preRollMs: Number(event.currentTarget.value) },
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Post-roll (ms)</span>
                <input
                  type="number"
                  value={config.capture.postRollMs}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      capture: { ...config.capture, postRollMs: Number(event.currentTarget.value) },
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Keep audio (days)</span>
                <input
                  type="number"
                  value={config.storage.keepAudioDays}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      storage: { ...config.storage, keepAudioDays: Number(event.currentTarget.value) },
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Keep transcripts (days)</span>
                <input
                  type="number"
                  value={config.storage.keepTranscriptDays}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      storage: {
                        ...config.storage,
                        keepTranscriptDays: Number(event.currentTarget.value),
                      },
                    })
                  }
                />
              </label>

              <label className="checkbox-row field--full">
                <input
                  checked={config.ui.showHud}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      ui: { ...config.ui, showHud: event.currentTarget.checked },
                    })
                  }
                  type="checkbox"
                />
                <span>Show the small on-screen HUD while recording and transcribing.</span>
              </label>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Tips</p>
                  <h3>Operator notes</h3>
                </div>
              </div>
              <ul className="tip-list">
                {state.quickTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default App;
