import React from 'react';

/** Primary navigation. Each tab is a hash link, so refresh and back/forward keep the view. */
export function TabNav({ tabs, activeTab }) {
  return (
    <nav className="tab-nav" aria-label="Primary">
      <ul>
        {tabs.map((tab) => (
          <li key={tab.id}>
            <a href={`#${tab.id}`} aria-current={activeTab === tab.id ? 'page' : undefined}>{tab.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
