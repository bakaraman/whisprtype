const tabs = [
  { id: "quick", label: "Quick Dictation" },
  { id: "hotkeys", label: "Hotkeys & Behavior" },
  { id: "models", label: "Models & Performance" },
  { id: "permissions", label: "Permissions & Diagnostics" },
  { id: "advanced", label: "Advanced" },
] as const;

export type AppTab = (typeof tabs)[number]["id"];

interface SidebarProps {
  activeTab: AppTab;
  onSelect: (tab: AppTab) => void;
}

export function Sidebar({ activeTab, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__pulse" />
        <div>
          <p className="eyebrow">Local-first dictation</p>
          <h1>WhisprType</h1>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={tab.id === activeTab ? "sidebar__nav-item is-active" : "sidebar__nav-item"}
            onClick={() => onSelect(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="sidebar__footnote">
        <p>Built for macOS. Offline by default. Whisper.cpp under the hood.</p>
      </div>
    </aside>
  );
}
