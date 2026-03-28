const tabs = [
  { id: "dictation", label: "Dictation" },
  { id: "settings", label: "Settings" },
] as const;

export type AppTab = (typeof tabs)[number]["id"];

interface SidebarProps {
  activeTab: AppTab;
  onSelect: (tab: AppTab) => void;
  version: string;
}

export function Sidebar({ activeTab, onSelect, version }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <h1>WhisprType</h1>
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
        <p>v{version}</p>
      </div>
    </aside>
  );
}
