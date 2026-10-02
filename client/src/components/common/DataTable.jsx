import React, { useState } from 'react';

/**
 * Compact table capped at `cap` rows with a Show all toggle; scrolls horizontally inside its own container.
 * columns: [{ key, header, render?(row), align?: 'right' }]
 */
export function DataTable({ caption, columns, rows, rowKey = (row) => row.id, cap = 10, emptyMessage = 'No records.' }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, cap);

  return (
    <div className="table-block">
      <div className="table-scroll">
        <table className="table">
          <caption className="table-caption">{caption}</caption>
          <thead>
            <tr>{columns.map((column) => <th key={column.key} scope="col" className={column.align === 'right' ? 'align-right' : undefined}>{column.header}</th>)}</tr>
          </thead>
          <tbody>
            {visible.length === 0 && <tr><td colSpan={columns.length} className="table-empty">{emptyMessage}</td></tr>}
            {visible.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={column.align === 'right' ? 'align-right num' : undefined}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > cap && (
        <div className="table-footer">
          <span className="num">Showing {visible.length} of {rows.length}</span>
          <button type="button" className="btn btn-link" aria-expanded={showAll} onClick={() => setShowAll((current) => !current)}>
            {showAll ? 'Show fewer' : 'Show all'}
          </button>
        </div>
      )}
    </div>
  );
}
