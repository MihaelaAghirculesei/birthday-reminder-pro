'use strict';

/**
 * Weekly health check: collects everything that needs a human and writes a
 * Markdown report. Nothing is reported when all is well.
 *
 * Checks:
 *   - latest CI / Release / CD / Android runs on main
 *   - Dependabot update jobs that failed and have not recovered since
 *   - production vulnerabilities (npm audit on the lockfile)
 *   - pull requests open for more than a week
 *   - Angular and Node end-of-life dates (endoflife.date)
 *   - the live site in headless Chrome: console errors, CSP violations,
 *     failed requests, unapplied stylesheet, horizontal overflow
 *
 * Env: GITHUB_REPOSITORY, GH_TOKEN (for the gh CLI), LIVE_URL,
 *      CHROME_PATH (default: google-chrome), REPORT_PATH, GITHUB_OUTPUT.
 * Needs Node >= 22 (global fetch and WebSocket); no npm install required.
 */

const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPO = process.env.GITHUB_REPOSITORY;
const LIVE_URL = (process.env.LIVE_URL || '').replace(/\/$/, '');
const CHROME_PATH = process.env.CHROME_PATH || 'google-chrome';
const DAY = 24 * 60 * 60 * 1000;
const STALE_PR_DAYS = 7;
const EOL_WARNING_DAYS = 60;
const MAIN_WORKFLOWS = ['CI', 'Release', 'CD', 'Android Build (Debug)'];
const LIVE_ROUTES = ['/', '/settings', '/privacy', '/terms'];
const VIEWPORTS = [
  { width: 1350, mobile: false },
  { width: 375, mobile: true },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const gh = (...args) => JSON.parse(execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
const isoDate = (date) => date.toISOString().slice(0, 10);

async function checkMainWorkflows() {
  const findings = [];
  for (const workflow of MAIN_WORKFLOWS) {
    const [run] = gh('run', 'list', '--repo', REPO, '--branch', 'main', '--workflow', workflow,
      '--status', 'completed', '--limit', '1', '--json', 'conclusion,url,headSha');
    if (run && !['success', 'skipped'].includes(run.conclusion)) {
      findings.push(`**${workflow}** on main ended \`${run.conclusion}\` (${run.headSha.slice(0, 7)}): ${run.url}`);
    }
  }
  return findings;
}

async function checkDependabotJobs() {
  const since = isoDate(new Date(Date.now() - 7 * DAY));
  const { workflow_runs: runs } = gh('api',
    `repos/${REPO}/actions/runs?event=dynamic&created=>=${since}&per_page=100`);
  // Runs are newest first; a job is broken only if its latest run failed.
  const latest = new Map();
  for (const run of runs.filter((r) => r.status === 'completed' && /Update #\d+$/.test(r.name))) {
    const job = run.name.replace(/ - Update #\d+$/, '');
    if (!latest.has(job)) latest.set(job, run);
  }
  return [...latest].filter(([, run]) => run.conclusion === 'failure')
    .map(([job, run]) => `Dependabot job **${job}** is failing — the log usually names the blocking dependency: ${run.html_url}`);
}

async function checkProductionAudit() {
  let report;
  try {
    report = execFileSync('npm', ['audit', '--omit=dev', '--package-lock-only', '--json'],
      { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  } catch (error) {
    report = error.stdout; // npm audit exits non-zero when it finds anything
  }
  const { vulnerabilities = {} } = JSON.parse(report);
  return Object.values(vulnerabilities).map((v) =>
    `Production dependency **${v.name}** has a ${v.severity} vulnerability` +
    (v.fixAvailable ? ' (fix available)' : ' (no fix yet)'));
}

async function checkStalePullRequests() {
  const prs = gh('pr', 'list', '--repo', REPO, '--state', 'open', '--json', 'number,title,createdAt,url');
  return prs.filter((pr) => Date.now() - Date.parse(pr.createdAt) > STALE_PR_DAYS * DAY)
    .map((pr) => `PR #${pr.number} open since ${pr.createdAt.slice(0, 10)}: ${pr.title} — ${pr.url}`);
}

async function checkEndOfLife() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const ci = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
  const products = [
    { name: 'Angular', product: 'angular', cycle: pkg.dependencies['@angular/core'].match(/\d+/)[0] },
    { name: 'Node.js', product: 'nodejs', cycle: ci.match(/node-version:\s*'(\d+)'/)[1] },
  ];
  const findings = [];
  for (const { name, product, cycle } of products) {
    const cycles = await (await fetch(`https://endoflife.date/api/${product}.json`)).json();
    const current = cycles.find((c) => String(c.cycle) === cycle);
    if (!current || typeof current.eol !== 'string') continue;
    const daysLeft = Math.ceil((Date.parse(current.eol) - Date.now()) / DAY);
    if (daysLeft <= EOL_WARNING_DAYS) {
      const latest = cycles[0].cycle;
      findings.push(`**${name} ${cycle}** ${daysLeft < 0 ? 'reached' : `reaches`} end of life on ` +
        `${current.eol}${daysLeft >= 0 ? ` (${daysLeft} days)` : ''}; latest is ${latest}.`);
    }
  }
  return findings;
}

async function auditLiveSite() {
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'health-chrome-'));
  const chrome = spawn(CHROME_PATH, [
    '--headless=new', '--no-sandbox', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', 'about:blank',
  ], { stdio: 'ignore' });

  try {
    let target;
    for (let i = 0; i < 50 && !target; i++) {
      await sleep(200);
      target = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json())
        .then((list) => list.find((t) => t.type === 'page')).catch(() => undefined);
    }
    if (!target) return ['Live audit could not start headless Chrome.'];

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let nextId = 0;
    const pending = new Map();
    const events = [];
    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); } else events.push(msg);
    };
    const send = (method, params = {}) => new Promise((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

    for (const domain of ['Page', 'Runtime', 'Network', 'Log']) await send(`${domain}.enable`);
    const problems = new Set();
    for (const { width, mobile } of VIEWPORTS) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile });
      for (const route of LIVE_ROUTES) {
        const where = `${route} @${width}px`;
        events.length = 0;
        await send('Page.navigate', { url: LIVE_URL + route });
        await sleep(6000);
        const { result } = await send('Runtime.evaluate', {
          returnByValue: true,
          expression: `({
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            unapplied: [...document.querySelectorAll('link[rel=stylesheet]')]
              .filter((l) => l.media && l.media !== 'all').map((l) => l.href),
          })`,
        });
        if (result.value.overflow) problems.add(`${where}: horizontal overflow`);
        for (const href of result.value.unapplied) problems.add(`${where}: stylesheet not applied (${href})`);
        for (const { method, params } of events) {
          if (method === 'Runtime.exceptionThrown') {
            const { exception, text } = params.exceptionDetails;
            problems.add(`${where}: uncaught ${(exception?.description || text).split('\n')[0]}`);
          } else if (method === 'Log.entryAdded' && params.entry.level === 'error') {
            problems.add(`${where}: ${params.entry.text.slice(0, 200)}`);
          } else if (method === 'Runtime.consoleAPICalled' && params.type === 'error') {
            problems.add(`${where}: console.error ${params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200)}`);
          } else if (method === 'Network.responseReceived' && params.response.status >= 400) {
            problems.add(`${where}: HTTP ${params.response.status} ${params.response.url}`);
          } else if (method === 'Network.loadingFailed' && !params.canceled) {
            problems.add(`${where}: request failed (${params.blockedReason || params.errorText})`);
          }
        }
      }
    }
    ws.close();
    return [...problems];
  } finally {
    chrome.kill();
  }
}

async function checkLiveSite() {
  if (!LIVE_URL) return [];
  // Third-party hiccups (fonts, avatars) fail one run, not two; report only what repeats.
  const first = await auditLiveSite();
  if (first.length === 0) return [];
  const second = new Set(await auditLiveSite());
  return first.filter((problem) => second.has(problem)).map((problem) => `Live site: ${problem}`);
}

async function main() {
  const sections = [
    ['Workflows on main', checkMainWorkflows],
    ['Dependabot', checkDependabotJobs],
    ['Production vulnerabilities', checkProductionAudit],
    ['Stale pull requests', checkStalePullRequests],
    ['End of life', checkEndOfLife],
    ['Live site', checkLiveSite],
  ];

  const report = [];
  for (const [title, check] of sections) {
    let findings;
    try {
      findings = await check();
    } catch (error) {
      findings = [`Check could not run: ${error.message.split('\n')[0]}`];
    }
    console.log(`${findings.length ? '✗' : '✓'} ${title}`);
    if (findings.length) report.push(`### ${title}`, ...findings.map((f) => `- ${f}`), '');
  }

  const needsAction = report.length > 0;
  const body = needsAction
    ? [`Weekly health check on ${isoDate(new Date())} found items that need attention.`, '', ...report].join('\n')
    : `Weekly health check on ${isoDate(new Date())}: all checks passed.`;
  console.log(`\n${body}`);
  if (process.env.REPORT_PATH) fs.writeFileSync(process.env.REPORT_PATH, body);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `needs_action=${needsAction}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
