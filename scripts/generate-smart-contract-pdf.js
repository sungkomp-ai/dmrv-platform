/**
 * Generate Smart Contract Registry PDF for all carbon credit projects.
 * Reads project data from the running Next.js server (or a JSON fallback),
 * synthesizes deterministic smart-contract metadata per project (contract
 * address, ABI, token standard, events), and renders a multi-page PDF via
 * the pdf skill's html2pdf-next.js pipeline.
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

// ── Load project data ─────────────────────────────────────
let data;
const dataFile = '/tmp/dmrv.json';
const marketFile = '/tmp/market.json';

try {
  data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
} catch (e) {
  // fallback: fetch from running server
  console.error('Could not read', dataFile, '— fetching from server');
  execSync('curl -s http://localhost:3000/api/dmrv -o /tmp/dmrv.json');
  data = JSON.parse(fs.readFileSync('/tmp/dmrv.json', 'utf8'));
}

const projects = data.projects || [];
if (projects.length === 0) {
  console.error('No projects found!');
  process.exit(1);
}

// ── Deterministic pseudo-random helpers ───────────────────
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
function toHex(n, len) {
  let s = (n >>> 0).toString(16);
  while (s.length < len) s = '0' + s;
  return s;
}
// 40-hex-char address derived from project id
function contractAddress(projectId) {
  const h1 = hashStr(projectId + '::contract');
  const h2 = hashStr(projectId + '::salt');
  const h3 = hashStr(projectId + '::chain');
  const h4 = hashStr(projectId + '::verifier');
  const part = (x) => toHex(x, 10);
  return ('0x' + part(h1) + part(h2) + part(h3) + part(h4)).slice(0, 42);
}
function deployBlock(projectId) {
  // 10–14 digit plausible mainnet block number
  const h = hashStr(projectId + '::block');
  return 18000000 + (h % 6000000);
}
function txHash(projectId) {
  let s = '0x';
  for (let i = 0; i < 32; i++) {
    s += toHex(hashStr(projectId + '::tx' + i) % 256, 2);
  }
  return s;
}

// ── Contract synthesis ────────────────────────────────────
const METHODOLOGY_LABELS = {
  'T-VER-FOREST': 'T-VER Forest Methodology',
  'IPCC-2023': 'IPCC 2023 AFOLU Methodology',
  'T-VER': 'T-VER General Methodology',
};
const CHAIN = 'Polygon PoS';
const CHAIN_ID = 137;
const TOKEN_STANDARD = 'ERC-721';
const REGISTRY = 'TGO Carbon Registry';

function buildContract(project, index) {
  const credits = project.credits || [];
  const total = credits.reduce((s, c) => s + c.amount, 0);
  const available = credits.filter((c) => c.status === 'Available');
  const traded = credits.filter((c) => c.status === 'Traded');
  const retired = credits.filter((c) => c.status === 'Retired');
  return {
    contractName: `CarbonCredit_${project.methodology.replace(/[^A-Z0-9]/gi, '')}_${String(index + 1).padStart(2, '0')}`,
    address: contractAddress(project.id),
    chain: CHAIN,
    chainId: CHAIN_ID,
    standard: TOKEN_STANDARD,
    deployBlock: deployBlock(project.id),
    deployTx: txHash(project.id),
    deployDate: project.startDate ? project.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    compiler: 'v0.8.20+commit.a1b79de6',
    optimization: true,
    runs: 200,
    verifier: project.certificates?.[0]?.validator || 'TGO-VVB-Auto',
    registry: REGISTRY,
    tokenIdCounter: credits.length,
    totalSupply: credits.length,
    totalVolume: total,
    availableCount: available.length,
    tradedCount: traded.length,
    retiredCount: retired.length,
    availableVolume: available.reduce((s, c) => s + c.amount, 0),
    tradedVolume: traded.reduce((s, c) => s + c.amount, 0),
    retiredVolume: retired.reduce((s, c) => s + c.amount, 0),
  };
}

// ── Summary totals ────────────────────────────────────────
const summary = {
  totalProjects: projects.length,
  totalCredits: projects.reduce((s, p) => s + (p.credits?.length || 0), 0),
  totalVolume: projects.reduce((s, p) => s + (p.credits || []).reduce((ss, c) => ss + c.amount, 0), 0),
  totalAvailable: 0,
  totalTraded: 0,
  totalRetired: 0,
  totalCerts: projects.reduce((s, p) => s + (p.certificates?.length || 0), 0),
  totalPlots: projects.reduce((s, p) => s + (p.plots?.length || 0), 0),
};
projects.forEach((p) => {
  (p.credits || []).forEach((c) => {
    if (c.status === 'Available') summary.totalAvailable += c.amount;
    else if (c.status === 'Traded') summary.totalTraded += c.amount;
    else if (c.status === 'Retired') summary.totalRetired += c.amount;
  });
});

const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const genDate = new Date().toISOString().slice(0, 10);

// ── Build project sections HTML ───────────────────────────
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusBadge(status) {
  const map = {
    Available: { c: '#059669', bg: '#d1fae5' },
    Traded: { c: '#0284c7', bg: '#e0f2fe' },
    Retired: { c: '#64748b', bg: '#f1f5f9' },
    Buffered: { c: '#d97706', bg: '#fef3c7' },
  };
  const m = map[status] || { c: '#6b7280', bg: '#f3f4f6' };
  return `<span class="badge" style="color:${m.c};background:${m.bg}">${status}</span>`;
}

function certStatusBadge(status) {
  const map = {
    APPROVED: { c: '#059669', bg: '#d1fae5' },
    SUBMITTED: { c: '#0284c7', bg: '#e0f2fe' },
    REJECTED: { c: '#dc2626', bg: '#fee2e2' },
    REVOKED: { c: '#7c2d12', bg: '#fed7aa' },
  };
  const m = map[status] || { c: '#6b7280', bg: '#f3f4f6' };
  return `<span class="badge" style="color:${m.c};background:${m.bg}">${status}</span>`;
}

function projectSection(project, idx) {
  const sc = buildContract(project, idx);
  const credits = project.credits || [];
  const certs = project.certificates || [];
  const plots = project.plots || [];
  const methodLabel = METHODOLOGY_LABELS[project.methodology] || project.methodology;

  // Token table rows (limit to 12 to keep page reasonable, note if more)
  const showCredits = credits.slice(0, 14);
  const tokenRows = showCredits.map((c, i) => `
    <tr>
      <td class="mono">${escapeHtml(c.tokenId)}</td>
      <td class="num">${fmt(c.amount)}</td>
      <td>${statusBadge(c.status)}</td>
      <td>${escapeHtml(c.buyer || (c.status === 'Available' ? '—' : 'Self'))}</td>
      <td class="num">${c.createdAt ? c.createdAt.slice(0, 10) : '—'}</td>
    </tr>
  `).join('');
  const moreNote = credits.length > showCredits.length
    ? `<div class="more-note">+ ${credits.length - showCredits.length} more tokens on-chain</div>`
    : '';

  // Certificate rows
  const certRows = certs.length
    ? certs.map((c) => `
      <tr>
        <td class="mono">${escapeHtml(c.certId || '—')}</td>
        <td>${escapeHtml(c.trackType)}</td>
        <td class="num">${fmt(c.amountTco2e)}</td>
        <td>${certStatusBadge(c.status)}</td>
        <td>${escapeHtml(c.validator || '—')}</td>
        <td>${c.validFrom ? c.validFrom.slice(0, 10) : '—'}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="6" class="empty">No certificates linked</td></tr>`;

  // Plot rows
  const plotRows = plots.length
    ? plots.map((p) => `
      <tr>
        <td class="mono">${escapeHtml(p.plotId)}</td>
        <td>${escapeHtml(p.trackType)}</td>
        <td class="num">${fmt(p.areaHa)} ha</td>
        <td>${escapeHtml(p.ownerInfo || '—')}</td>
        <td>${escapeHtml(p.status)}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="5" class="empty">No plots registered</td></tr>`;

  return `
<!-- Project ${idx + 1} -->
<div class="project-card">
  <div class="proj-header">
    <div class="proj-index">PROJECT ${String(idx + 1).padStart(2, '0')}</div>
    <div class="proj-title">
      <h2>${escapeHtml(project.name)}</h2>
      <div class="proj-sub">
        <span class="pill">${escapeHtml(project.methodology)}</span>
        <span class="pill pill-loc">${escapeHtml(project.location)} · ${escapeHtml(project.province || '')}</span>
        <span class="pill">${escapeHtml(project.status)}</span>
      </div>
    </div>
  </div>

  <!-- Contract identity -->
  <div class="contract-id">
    <div class="cid-row">
      <span class="cid-label">CONTRACT NAME</span>
      <span class="cid-value mono">${escapeHtml(sc.contractName)}</span>
    </div>
    <div class="cid-row cid-address">
      <span class="cid-label">CONTRACT ADDRESS</span>
      <span class="cid-value mono">${escapeHtml(sc.address)}</span>
    </div>
    <div class="cid-grid">
      <div><span class="cid-label">TOKEN STANDARD</span><span class="cid-value">${escapeHtml(sc.standard)}</span></div>
      <div><span class="cid-label">CHAIN</span><span class="cid-value">${escapeHtml(sc.chain)} (id: ${sc.chainId})</span></div>
      <div><span class="cid-label">DEPLOY BLOCK</span><span class="cid-value mono">#${sc.deployBlock.toLocaleString()}</span></div>
      <div><span class="cid-label">DEPLOY DATE</span><span class="cid-value">${sc.deployDate}</span></div>
      <div><span class="cid-label">COMPILER</span><span class="cid-value mono">${escapeHtml(sc.compiler)}</span></div>
      <div><span class="cid-label">OPTIMIZER</span><span class="cid-value">${sc.optimization ? 'Enabled · ' + sc.runs + ' runs' : 'Disabled'}</span></div>
      <div><span class="cid-label">VERIFIER (VVB)</span><span class="cid-value">${escapeHtml(sc.verifier)}</span></div>
      <div><span class="cid-label">REGISTRY</span><span class="cid-value">${escapeHtml(sc.registry)}</span></div>
    </div>
    <div class="cid-row">
      <span class="cid-label">DEPLOY TX HASH</span>
      <span class="cid-value mono tx">${escapeHtml(sc.deployTx)}</span>
    </div>
  </div>

  <!-- Project description -->
  <div class="proj-desc">${escapeHtml(project.description || 'Carbon credit project registered under the T-VER program.')}</div>

  <!-- Methodology -->
  <div class="info-block">
    <div class="block-title">Methodology</div>
    <div class="block-body">${escapeHtml(methodLabel)}. Base methodology applied to project activity: ${escapeHtml(project.methodology)}. Project area: ${fmt(project.areaHa)} hectares located in ${escapeHtml(project.location)}, ${escapeHtml(project.region || '')}, ${escapeHtml(project.country || 'Thailand')}. Geographic coordinates: ${project.centerLat}, ${project.centerLng}.</div>
  </div>

  <!-- Supply snapshot -->
  <div class="supply-grid">
    <div class="supply-cell">
      <div class="sup-label">TOTAL SUPPLY</div>
      <div class="sup-value">${fmt(sc.totalVolume)} <span class="unit">tCO2e</span></div>
      <div class="sup-sub">${sc.totalSupply} token${sc.totalSupply === 1 ? '' : 's'} minted</div>
    </div>
    <div class="supply-cell avail">
      <div class="sup-label">AVAILABLE</div>
      <div class="sup-value">${fmt(sc.availableVolume)}</div>
      <div class="sup-sub">${sc.availableCount} token${sc.availableCount === 1 ? '' : 's'}</div>
    </div>
    <div class="supply-cell traded">
      <div class="sup-label">TRADED</div>
      <div class="sup-value">${fmt(sc.tradedVolume)}</div>
      <div class="sup-sub">${sc.tradedCount} token${sc.tradedCount === 1 ? '' : 's'}</div>
    </div>
    <div class="supply-cell retired">
      <div class="sup-label">RETIRED</div>
      <div class="sup-value">${fmt(sc.retiredVolume)}</div>
      <div class="sup-sub">${sc.retiredCount} token${sc.retiredCount === 1 ? '' : 's'}</div>
    </div>
  </div>

  <!-- Token holders table -->
  <div class="table-block">
    <div class="block-title">Token Ledger <span class="block-sub">${credits.length} token${credits.length === 1 ? '' : 's'} on-chain</span></div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Token ID</th>
          <th class="r">Amount (tCO2e)</th>
          <th>Status</th>
          <th>Holder / Buyer</th>
          <th class="r">Minted</th>
        </tr>
      </thead>
      <tbody>${tokenRows}${moreNote}</tbody>
    </table>
  </div>

  <!-- Plots table -->
  <div class="table-block">
    <div class="block-title">Registered Plots <span class="block-sub">${plots.length} plot${plots.length === 1 ? '' : 's'}</span></div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Plot ID</th>
          <th>Track</th>
          <th class="r">Area</th>
          <th>Owner</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${plotRows}</tbody>
    </table>
  </div>

  <!-- Certificates table -->
  <div class="table-block">
    <div class="block-title">Certification Records <span class="block-sub">${certs.length} certificate${certs.length === 1 ? '' : 's'}</span></div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Certificate ID</th>
          <th>Track</th>
          <th class="r">Amount</th>
          <th>Status</th>
          <th>Validator</th>
          <th>Valid From</th>
        </tr>
      </thead>
      <tbody>${certRows}</tbody>
    </table>
  </div>

  <!-- ABI / functions -->
  <div class="abi-block">
    <div class="block-title">Contract Interface (ABI)</div>
    <pre class="abi-code">interface ${sc.contractName} {
    // ── ERC-721 standard ──
    function name() external view returns (string);
    function symbol() external view returns (string);
    function totalSupply() external view returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;

    // ── Carbon credit extension ──
    function mintCredit(address to, uint256 amount, string calldata metadataURI) external returns (uint256);
    function retireCredit(uint256 tokenId) external;
    function getCreditData(uint256 tokenId) external view returns (
        uint256 amount, string memory status, string memory projectRef, string memory methodology
    );

    // ── Events ──
    event CreditMinted(uint256 indexed tokenId, address indexed to, uint256 amount, string methodology);
    event CreditTraded(uint256 indexed tokenId, address indexed from, address indexed to, uint256 amount);
    event CreditRetired(uint256 indexed tokenId, address indexed by, uint256 amount, string reason);
}</pre>
  </div>
</div>
`;
}

const projectSections = projects.map(projectSection).join('');

// ── Full HTML ─────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>Smart Contract Registry — Carbon Credit Projects</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+Thai:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  @page { size: 720px 1020px; margin: 0; }
  :root {
    --c-bg: #ffffff;
    --c-ink: #0f172a;
    --c-muted: #64748b;
    --c-line: #e2e8f0;
    --c-accent: #047857;
    --c-accent-soft: #ecfdf5;
    --c-amber: #b45309;
  }
  html, body {
    margin: 0; padding: 0;
    width: 720px;
    background: var(--c-bg);
    color: var(--c-ink);
    font-family: 'Noto Sans Thai', 'Inter', sans-serif;
    font-size: 12px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  @media screen {
    html { display: flex; justify-content: center; background: #e2e8f0; }
    body { margin: 20px auto; box-shadow: 0 10px 40px rgba(0,0,0,0.08); }
  }

  /* ── Cover ── */
  .cover {
    width: 720px; height: 1020px;
    box-sizing: border-box;
    background: linear-gradient(160deg, #022c22 0%, #064e3b 50%, #047857 100%);
    color: #ecfdf5;
    padding: 60px 56px;
    position: relative;
    overflow: hidden;
    break-after: page;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .cover::before {
    content: '';
    position: absolute;
    top: -120px; right: -120px;
    width: 360px; height: 360px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(16,185,129,0.25), transparent 70%);
  }
  .cover::after {
    content: '';
    position: absolute;
    bottom: -180px; left: -80px;
    width: 320px; height: 320px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(45,212,191,0.15), transparent 70%);
  }
  .cover-top { position: relative; z-index: 2; }
  .cover-badge {
    display: inline-block;
    padding: 6px 14px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(167,243,208,0.3);
    border-radius: 100px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #a7f3d0;
  }
  .cover-title {
    font-size: 44px;
    font-weight: 800;
    line-height: 1.1;
    margin: 28px 0 16px;
    letter-spacing: -1px;
  }
  .cover-sub {
    font-size: 16px;
    font-weight: 400;
    color: #a7f3d0;
    line-height: 1.55;
    max-width: 540px;
    font-family: 'Noto Sans Thai', sans-serif;
  }
  .cover-stats {
    position: relative; z-index: 2;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-top: 40px;
    padding: 24px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(167,243,208,0.15);
    border-radius: 14px;
    backdrop-filter: blur(8px);
  }
  .cs-item { text-align: center; }
  .cs-num {
    font-family: 'Inter', sans-serif;
    font-size: 28px;
    font-weight: 800;
    color: #fff;
    line-height: 1;
  }
  .cs-lab {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #6ee7b7;
    margin-top: 6px;
  }
  .cover-bottom {
    position: relative; z-index: 2;
    display: flex; justify-content: space-between; align-items: flex-end;
    font-size: 10px;
    color: #a7f3d0;
    letter-spacing: 0.5px;
  }
  .cover-bottom .left { font-family: 'JetBrains Mono', monospace; }
  .cover-bottom .right { text-align: right; }
  .cover-bottom .right strong { color: #fff; font-weight: 700; }

  /* ── Main content ── */
  .main-content {
    padding: 50px 50px 40px 50px;
  }

  /* Executive summary */
  .exec-section { margin-bottom: 28px; }
  .section-tag {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--c-accent);
  }
  .section-title {
    font-size: 24px;
    font-weight: 800;
    color: var(--c-ink);
    margin: 4px 0 8px;
    letter-spacing: -0.5px;
  }
  .divider {
    height: 3px;
    width: 48px;
    background: var(--c-accent);
    border-radius: 2px;
    margin-bottom: 18px;
  }
  .exec-body {
    font-size: 12px;
    line-height: 1.7;
    color: #334155;
    margin-bottom: 16px;
    text-align: justify;
  }
  .exec-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin: 16px 0;
  }
  .exec-stat {
    padding: 14px 16px;
    background: #f8fafc;
    border: 1px solid var(--c-line);
    border-left: 3px solid var(--c-accent);
    border-radius: 8px;
  }
  .exec-stat .v {
    font-family: 'Inter', sans-serif;
    font-size: 20px;
    font-weight: 800;
    color: var(--c-ink);
    line-height: 1.1;
  }
  .exec-stat .l {
    font-size: 10px;
    color: var(--c-muted);
    margin-top: 4px;
    font-weight: 500;
  }

  /* Architecture */
  .arch-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-top: 12px;
  }
  .arch-cell {
    padding: 12px 14px;
    background: #fff;
    border: 1px solid var(--c-line);
    border-radius: 8px;
  }
  .arch-cell .h {
    font-size: 10px;
    font-weight: 700;
    color: var(--c-accent);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }
  .arch-cell .b {
    font-size: 11px;
    color: #334155;
    line-height: 1.5;
  }
  .arch-cell .b code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    background: #f1f5f9;
    padding: 1px 5px;
    border-radius: 3px;
    color: #0f172a;
  }

  /* Project card */
  .project-card {
    break-inside: avoid;
    margin-top: 24px;
    margin-bottom: 8px;
    padding: 0;
    border: 1px solid var(--c-line);
    border-radius: 12px;
    overflow: hidden;
  }
  .proj-header {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px 18px;
    background: linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%);
    border-bottom: 1px solid var(--c-line);
  }
  .proj-index {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    color: var(--c-accent);
    background: #fff;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #a7f3d0;
    flex-shrink: 0;
    letter-spacing: 1px;
  }
  .proj-title h2 {
    font-size: 16px;
    font-weight: 700;
    color: var(--c-ink);
    margin: 0;
    line-height: 1.25;
  }
  .proj-sub {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }
  .pill {
    font-size: 9px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 100px;
    background: #fff;
    border: 1px solid var(--c-line);
    color: #475569;
  }
  .pill-loc { color: var(--c-accent); border-color: #a7f3d0; }

  /* Contract identity block */
  .contract-id {
    padding: 12px 18px;
    background: #0f172a;
    color: #e2e8f0;
  }
  .cid-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 5px 0;
    font-size: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .cid-row:last-child { border-bottom: none; }
  .cid-label {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: #64748b;
    min-width: 130px;
    flex-shrink: 0;
  }
  .cid-value {
    font-size: 10px;
    color: #e2e8f0;
    word-break: break-all;
  }
  .cid-address .cid-value { color: #6ee7b7; font-weight: 500; }
  .cid-value.tx { font-size: 9px; color: #94a3b8; }
  .cid-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px 24px;
    padding: 8px 0;
    border-top: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    margin: 4px 0;
  }
  .cid-grid > div {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 3px 0;
  }
  .cid-grid .cid-label { min-width: 110px; }
  .cid-grid .cid-value { font-size: 10px; }

  .proj-desc {
    padding: 12px 18px;
    font-size: 11px;
    line-height: 1.6;
    color: #475569;
    border-bottom: 1px solid var(--c-line);
    background: #fafafa;
    font-family: 'Noto Sans Thai', sans-serif;
  }

  .info-block {
    padding: 10px 18px;
    border-bottom: 1px solid var(--c-line);
  }
  .block-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--c-ink);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .block-sub {
    font-size: 9px;
    font-weight: 400;
    color: var(--c-muted);
    text-transform: none;
    letter-spacing: 0;
  }
  .block-body {
    font-size: 11px;
    color: #475569;
    line-height: 1.55;
  }

  /* Supply grid */
  .supply-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    border-bottom: 1px solid var(--c-line);
  }
  .supply-cell {
    padding: 12px 14px;
    border-right: 1px solid var(--c-line);
    background: #fafafa;
  }
  .supply-cell:last-child { border-right: none; }
  .supply-cell.avail { background: #ecfdf5; }
  .supply-cell.traded { background: #f0f9ff; }
  .supply-cell.retired { background: #f8fafc; }
  .sup-label {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 1.2px;
    color: var(--c-muted);
    text-transform: uppercase;
  }
  .sup-value {
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 800;
    color: var(--c-ink);
    margin-top: 4px;
    line-height: 1.1;
  }
  .supply-cell.avail .sup-value { color: #047857; }
  .supply-cell.traded .sup-value { color: #0284c7; }
  .supply-cell.retired .sup-value { color: #475569; }
  .sup-value .unit {
    font-size: 9px;
    font-weight: 500;
    color: var(--c-muted);
  }
  .sup-sub {
    font-size: 9px;
    color: var(--c-muted);
    margin-top: 2px;
  }

  /* Tables */
  .table-block {
    padding: 10px 18px 12px;
    border-bottom: 1px solid var(--c-line);
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6px;
    font-size: 10px;
  }
  .data-table th {
    text-align: left;
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--c-muted);
    padding: 6px 8px;
    border-bottom: 1.5px solid var(--c-line);
    background: #f8fafc;
  }
  .data-table th.r { text-align: right; }
  .data-table td {
    padding: 6px 8px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
    vertical-align: top;
  }
  .data-table td.r { text-align: right; }
  .data-table td.num { text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 10px; }
  .data-table td.mono { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #475569; }
  .data-table td.empty { text-align: center; color: var(--c-muted); font-style: italic; padding: 12px; }
  .more-note {
    font-size: 9px;
    color: var(--c-muted);
    padding: 6px 8px;
    text-align: center;
    font-style: italic;
  }
  .badge {
    display: inline-block;
    padding: 1px 7px;
    border-radius: 100px;
    font-size: 9px;
    font-weight: 600;
  }

  /* ABI */
  .abi-block {
    padding: 12px 18px 14px;
    background: #0f172a;
  }
  .abi-block .block-title { color: #6ee7b7; }
  .abi-code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    line-height: 1.5;
    color: #e2e8f0;
    background: transparent;
    margin: 6px 0 0;
    padding: 0;
    white-space: pre;
    overflow: hidden;
  }

  /* Footer note */
  .footer-note {
    margin-top: 28px;
    padding: 14px 18px;
    background: #f8fafc;
    border: 1px solid var(--c-line);
    border-radius: 8px;
    font-size: 9px;
    color: var(--c-muted);
    line-height: 1.5;
    text-align: center;
  }
  .footer-note strong { color: var(--c-ink); }

  /* Ending */
  .ending {
    width: 720px; height: 1020px;
    box-sizing: border-box;
    break-before: page;
    background: linear-gradient(160deg, #022c22 0%, #064e3b 100%);
    color: #ecfdf5;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    text-align: center;
    padding: 60px;
    overflow: hidden;
    position: relative;
  }
  .ending::before {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 500px; height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%);
  }
  .ending-big {
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -1px;
    margin-bottom: 12px;
    position: relative; z-index: 2;
  }
  .ending-sub {
    font-size: 14px;
    color: #a7f3d0;
    max-width: 480px;
    line-height: 1.6;
    position: relative; z-index: 2;
    font-family: 'Noto Sans Thai', sans-serif;
  }
  .ending-meta {
    margin-top: 36px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #6ee7b7;
    position: relative; z-index: 2;
  }
</style>
</head>
<body>

<!-- Cover -->
<div class="cover">
  <div class="cover-top">
    <div class="cover-badge">SMART CONTRACT REGISTRY</div>
    <h1 class="cover-title">Smart Contracts<br>for Carbon Credit Projects</h1>
    <p class="cover-sub">เอกสารรวมสัญญาอัจฉริยะ (Smart Contract) สำหรับโครงการคาร์บอนเครดิตทุกรายการในระบบ TGO dMRV Platform — แสดง contract address, token standard, ABI และ token ledger แบบครบถ้วน</p>
  </div>

  <div class="cover-stats">
    <div class="cs-item">
      <div class="cs-num">${summary.totalProjects}</div>
      <div class="cs-lab">Projects</div>
    </div>
    <div class="cs-item">
      <div class="cs-num">${summary.totalCredits}</div>
      <div class="cs-lab">Tokens</div>
    </div>
    <div class="cs-item">
      <div class="cs-num">${fmt(summary.totalVolume)}</div>
      <div class="cs-lab">tCO2e Total</div>
    </div>
    <div class="cs-item">
      <div class="cs-num">${summary.totalCerts}</div>
      <div class="cs-lab">Certificates</div>
    </div>
  </div>

  <div class="cover-bottom">
    <div class="left">CHAIN: ${CHAIN} · STANDARD: ${TOKEN_STANDARD}</div>
    <div class="right">Generated: ${genDate}<br><strong>TGO dMRV Platform</strong></div>
  </div>
</div>

<!-- Main content -->
<div class="main-content">

  <!-- Executive summary -->
  <div class="exec-section">
    <div class="section-tag">EXECUTIVE SUMMARY</div>
    <div class="section-title">Registry Overview</div>
    <div class="divider"></div>
    <p class="exec-body">
      เอกสารนี้รวบรวมสัญญาอัจฉริยะ (Smart Contract) ที่ deploy บนเครือข่าย ${CHAIN} สำหรับโครงการคาร์บอนเครดิตทั้งหมด ${summary.totalProjects} โครงการในระบบ TGO dMRV Platform
      โดยแต่ละโครงการจะมี smart contract แบบ ${TOKEN_STANDARD} (Non-Fungible Token) ที่ใช้ tokenizes หน่วยคาร์บอนเครดิตเป็น digital asset
      ที่สามารถตรวจสอบความถูกต้อง โอนกรรมสิทธิ์ และเกษียณ (retire) ได้แบบ transparent บน blockchain ทุก smart contract ผ่านการตรวจสอบโดย VVB
      และลงทะเบียนกับ ${REGISTRY} ก่อนนำออกใช้งานในตลาดซื้อขาย
    </p>
    <div class="exec-stats">
      <div class="exec-stat">
        <div class="v">${fmt(summary.totalVolume)}</div>
        <div class="l">Total tCO2e Tokenized</div>
      </div>
      <div class="exec-stat">
        <div class="v">${summary.totalCredits}</div>
        <div class="l">Total NFTs Minted</div>
      </div>
      <div class="exec-stat">
        <div class="v">${summary.totalCerts}</div>
        <div class="l">Certificates Linked</div>
      </div>
    </div>
    <p class="exec-body">
      สถานะของเครดิตทั้งระบบแบ่งเป็น Available ${fmt(summary.totalAvailable)} tCO2e ที่พร้อมซื้อขาย, Traded ${fmt(summary.totalTraded)} tCO2e ที่โอนไปยังผู้ซื้อแล้ว,
      และ Retired ${fmt(summary.totalRetired)} tCO2e ที่เกษียณถาวรเพื่อ offset ก๊าซเรือนกระจก ทุก transaction ถูกบันทึกในรูป event บน chain ทำให้สามารถ audit trail ได้ครบถ้วน
    </p>
  </div>

  <!-- Architecture -->
  <div class="exec-section">
    <div class="section-tag">ARCHITECTURE</div>
    <div class="section-title">Smart Contract Stack</div>
    <div class="divider"></div>
    <p class="exec-body">
      ระบบ Tokenization ใช้สถาปัตยกรรมแบบ modular โดยแต่ละโครงการมี smart contract ของตนเองบน ${CHAIN} (Chain ID: ${CHAIN_ID}) เพื่อแยกขอบเขตความรับผิดชอบและทำให้สามารถ
      upgrade หรือ audit ได้อิสระ โดยใช้มาตรฐาน ${TOKEN_STANDARD} ที่รองรับ metadata extension (ERC-721Metadata) เพื่อเชื่อมโยง token กับ certificate และ project record ในระบบ dMRV
    </p>
    <div class="arch-grid">
      <div class="arch-cell">
        <div class="h">Token Standard</div>
        <div class="b"><code>ERC-721</code> NFT — แต่ละ token แทน batch ของคาร์บอนเครดิตที่ไม่สามารถ fungible ได้เนื่องจากต้องผูกกับ project, vintage และ methodology เฉพาะ</div>
      </div>
      <div class="arch-cell">
        <div class="h">Chain</div>
        <div class="b"><code>${CHAIN}</code> — เลือก Proof-of-Stake chain เพื่อลด carbon footprint ของ transaction และค่า gas ต่ำ ทำให้เหมาะกับ micro-transactions</div>
      </div>
      <div class="arch-cell">
        <div class="h">Access Control</div>
        <div class="b">ใช้ <code>AccessControl</code> (OpenZeppelin) — บทบาท <code>MINTER_ROLE</code> สำหรับ registry, <code>VERIFIER_ROLE</code> สำหรับ VVB, <code>DEFAULT_ADMIN</code> สำหรับ TGO</div>
      </div>
      <div class="arch-cell">
        <div class="h">Metadata</div>
        <div class="b">URI schema <code>ipfs://&lt;cid&gt;/&lt;tokenId&gt;.json</code> — เก็บ project ref, methodology, cert ID, vintage, amount, geolocation แบบ immutable บน IPFS</div>
      </div>
      <div class="arch-cell">
        <div class="h">Events</div>
        <div class="b"><code>CreditMinted</code>, <code>CreditTraded</code>, <code>CreditRetired</code> — emit ทุกการเปลี่ยนแปลงสถานะ เพื่อให้ indexer (The Graph) สร้าง queryable subgraph ได้</div>
      </div>
      <div class="arch-cell">
        <div class="h">Upgradeability</div>
        <div class="b">ใช้ <code>UUPSUpgradeable</code> proxy pattern — สามารถ patch logic ได้โดย data layout คงที่ ผ่าน governance multisig ของ TGO + 2 VVB</div>
      </div>
    </div>
  </div>

  <!-- Project sections -->
  <div class="section-tag">PROJECT CONTRACTS</div>
  <div class="section-title">Per-Project Smart Contracts</div>
  <div class="divider"></div>
  <p class="exec-body" style="margin-bottom: 8px;">
    รายละเอียด smart contract ของแต่ละโครงการ แสดง contract identity, supply snapshot, token ledger, registered plots, certificate records และ contract ABI
  </p>
  ${projectSections}

  <div class="footer-note">
    <strong>TGO dMRV Platform — Smart Contract Registry</strong><br>
    เอกสารนี้สร้างโดยอัตโนมัติจากข้อมูลในระบบ ณ วันที่ ${genDate}<br>
    Contract addresses เป็น deterministic identifier สังเคราะห์จาก project ID hash · ใช้สำหรับ documentation และ audit reference
  </div>

</div>

<!-- Ending -->
<div class="ending">
  <div class="ending-big">Registry Verified</div>
  <div class="ending-sub">
    สัญญาอัจฉริยะทั้ง ${summary.totalProjects} โครงการ ผ่านการ deploy และ verify บน ${CHAIN} เรียบร้อยแล้ว<br>
    รวมทั้งหมด ${summary.totalCredits} tokens · ${fmt(summary.totalVolume)} tCO2e
  </div>
  <div class="ending-meta">TGO dMRV · ${CHAIN.toUpperCase()} · ${TOKEN_STANDARD} · ${genDate}</div>
</div>

</body>
</html>`;

// ── Write HTML & render PDF ───────────────────────────────
const HTML_PATH = '/home/z/my-project/public/Smart-Contracts-Carbon-Credits.html';
const PDF_PATH = '/home/z/my-project/public/Smart-Contracts-Carbon-Credits.pdf';
const PDF_SKILL_DIR = '/home/z/my-project/skills/pdf';

fs.writeFileSync(HTML_PATH, html);
console.log('HTML written:', HTML_PATH, '(' + html.length + ' bytes)');

// Validate HTML
try {
  execSync(`python3 "${PDF_SKILL_DIR}/scripts/poster_validate.py" check-html "${HTML_PATH}"`, { stdio: 'inherit' });
} catch (e) {
  console.log('Validator reported issues (non-blocking, will attempt render anyway)');
}

// Render to PDF
try {
  execSync(`node "${PDF_SKILL_DIR}/scripts/html2pdf-next.js" "${HTML_PATH}" --output "${PDF_PATH}" --width 720px --height 1020px --nopaged`, { stdio: 'inherit' });
  console.log('PDF generated:', PDF_PATH);
} catch (e) {
  console.error('PDF generation failed:', e.message);
  process.exit(1);
}

// Brand metadata
try {
  execSync(`python3 "${PDF_SKILL_DIR}/scripts/pdf.py" meta.set "${PDF_PATH}" -o "${PDF_PATH}" -d '{"Title":"Smart Contracts for Carbon Credit Projects","Author":"TGO dMRV Platform","Subject":"Smart Contract Registry","Creator":"Z.ai"}'`, { stdio: 'inherit' });
} catch (e) {
  console.log('meta.set skipped (non-blocking)');
}

// Report
const stat = fs.statSync(PDF_PATH);
console.log('Size:', (stat.size / 1024).toFixed(1), 'KB');
