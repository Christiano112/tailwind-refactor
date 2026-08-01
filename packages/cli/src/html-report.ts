import type { Transformation } from '@tailwind-refactor/plugin-api';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

export interface HTMLReportData {
  targetDir: string;
  totalTransformations: number;
  fileReports: { file: string; count: number; items: Transformation[] }[];
  skippedDynamicReports: { file: string; line?: number; expression: string; reason?: string }[];
  timestamp: string;
}

export function generateHTMLReport(data: HTMLReportData, outputPath: string): string {
  const absPath = resolve(process.cwd(), outputPath);

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tailwind Refactor Telemetry Report</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #151d30;
      --card-hover: #1c263e;
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #38bdf8;
      --border: #24314c;
      --red: #f87171;
      --red-bg: rgba(248, 113, 113, 0.1);
      --green: #4ade80;
      --green-bg: rgba(74, 222, 128, 0.1);
      --yellow: #facc15;
      --yellow-bg: rgba(250, 204, 21, 0.1);
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Code", sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font);
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 16px;
      -webkit-font-smoothing: antialiased;
    }

    @media (min-width: 640px) {
      body {
        padding: 32px;
      }
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 24px;
    }

    .header-title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    h1 {
      font-size: 1.65rem;
      font-weight: 800;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    h1 span {
      color: var(--accent);
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--card-hover);
      color: var(--accent);
      border: 1px solid var(--border);
    }

    .meta {
      color: var(--muted);
      font-size: 0.875rem;
      margin-top: 8px;
      word-break: break-all;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }

    .card:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
    }

    .card .value {
      font-size: 2rem;
      font-weight: 800;
      color: var(--accent);
      line-height: 1.1;
    }

    .card .label {
      font-size: 0.85rem;
      color: var(--muted);
      margin-top: 6px;
      font-weight: 500;
    }

    .search-box {
      margin-bottom: 24px;
    }

    .search-input {
      width: 100%;
      padding: 12px 16px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .search-input:focus {
      border-color: var(--accent);
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 28px 0 16px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
    }

    .table-wrapper {
      width: 100%;
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--card-bg);
      margin-bottom: 32px;
      -webkit-overflow-scrolling: touch;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 700px;
    }

    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      font-size: 0.875rem;
    }

    th {
      background: #0f172a;
      color: var(--muted);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: var(--card-hover);
    }

    .file-path {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.82rem;
      color: var(--text);
      word-break: break-all;
    }

    .code-original {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--red);
      background: var(--red-bg);
      padding: 2px 6px;
      border-radius: 4px;
      word-break: break-all;
    }

    .code-replacement {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--green);
      background: var(--green-bg);
      padding: 2px 6px;
      border-radius: 4px;
      word-break: break-all;
    }

    .rule-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(148, 163, 184, 0.1);
      color: var(--muted);
      font-size: 0.75rem;
      font-family: ui-monospace, monospace;
    }

    .reason-text {
      color: var(--muted);
      font-size: 0.825rem;
    }

    @media (max-width: 768px) {
      .table-wrapper {
        border-radius: 8px;
      }
      th, td {
        padding: 10px 12px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-title-row">
        <h1>⚡ Tailwind Refactor <span>Telemetry</span></h1>
        <span class="badge">Production Report</span>
      </div>
      <div class="meta">Target: <code>${data.targetDir}</code> | Generated: ${data.timestamp}</div>
    </header>

    <div class="metrics">
      <div class="card">
        <div class="value">${data.totalTransformations}</div>
        <div class="label">Refactoring Opportunities</div>
      </div>
      <div class="card">
        <div class="value">${data.fileReports.length}</div>
        <div class="label">Files Modified</div>
      </div>
      <div class="card">
        <div class="value">${data.skippedDynamicReports.length}</div>
        <div class="label">Skipped Dynamic Values</div>
      </div>
    </div>

    <div class="search-box">
      <input type="text" id="reportSearch" class="search-input" placeholder="🔍 Search findings by filename, rule, or utility class..." onkeyup="filterReport()">
    </div>

    <h2 class="section-title">
      <span>Refactoring Findings</span>
      <span class="badge" id="rowCount">${data.fileReports.reduce((acc, f) => acc + f.items.length, 0)} Items</span>
    </h2>

    <div class="table-wrapper">
      <table id="findingsTable">
        <thead>
          <tr>
            <th>File</th>
            <th>Original Class</th>
            <th>Canonical Replacement</th>
            <th>Rule</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          ${data.fileReports
            .flatMap((fileReport) =>
              fileReport.items.map(
                (item) => `
            <tr>
              <td class="file-path">${fileReport.file}</td>
              <td><span class="code-original">${item.original}</span></td>
              <td><span class="code-replacement">${item.replacement}</span></td>
              <td><span class="rule-pill">${item.rule}</span></td>
              <td class="reason-text">${item.reason}</td>
            </tr>`
              )
            )
            .join('')}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    function filterReport() {
      const input = document.getElementById('reportSearch');
      const filter = input.value.toLowerCase();
      const table = document.getElementById('findingsTable');
      const trs = table.getElementsByTagName('tr');
      let visibleCount = 0;

      for (let i = 1; i < trs.length; i++) {
        const text = trs[i].textContent || trs[i].innerText;
        if (text.toLowerCase().indexOf(filter) > -1) {
          trs[i].style.display = '';
          visibleCount++;
        } else {
          trs[i].style.display = 'none';
        }
      }
      document.getElementById('rowCount').textContent = visibleCount + ' Items';
    }
  </script>
</body>
</html>`;

  writeFileSync(absPath, htmlContent, 'utf-8');
  return absPath;
}
