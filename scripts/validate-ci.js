const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const resolve = (...parts) => path.join(ROOT, ...parts);

let errors = 0;
let warnings = 0;

function fail(msg) { console.error(`  \u274C ${msg}`); errors++; }
function warn(msg) { console.warn(`  \u26A0\uFE0F  ${msg}`); warnings++; }
function info(msg) { console.log(`  \u2139\uFE0F  ${msg}`); }
function pass(msg) { console.log(`  \u2705 ${msg}`); }

console.log('\n[1/5] CI Workflow');

const ciPath = resolve('.github', 'workflows', 'ci.yml');
if (!fs.existsSync(ciPath)) {
  fail('CI workflow not found: .github/workflows/ci.yml');
} else {
  pass('ci.yml exists');

  const ci = fs.readFileSync(ciPath, 'utf8');

  const expressions = ci.match(/\$\{\{[^}]*\}\}/g) || [];
  const malformed = expressions.filter(e => !e.endsWith('}}'));
  if (malformed.length > 0) {
    fail(`Malformed expressions in ci.yml: ${malformed.join(', ')}`);
  } else {
    pass(`${expressions.length} workflow expressions OK`);
  }

  const jobNames = [];
  const jobRegex = /^  (\w[\w-]*):\s*$/gm;
  let match;
  while ((match = jobRegex.exec(ci)) !== null) {
    jobNames.push(match[1]);
  }

  const needsRegex = /needs:\s*\[([^\]]+)\]/g;
  const allNeeds = [];
  while ((match = needsRegex.exec(ci)) !== null) {
    match[1].split(',').map(s => s.trim()).forEach(n => allNeeds.push(n));
  }

  const invalidNeeds = allNeeds.filter(n => !jobNames.includes(n));
  if (invalidNeeds.length > 0) {
    fail(`Invalid job references in 'needs': ${invalidNeeds.join(', ')}`);
  } else {
    pass(`Job dependency graph valid (${jobNames.length} jobs)`);
  }

  const secretRefs = ci.match(/secrets\.(\w+)/g) || [];
  const uniqueSecrets = [...new Set(secretRefs.map(s => s.replace('secrets.', '')))];
  if (uniqueSecrets.length > 0) {
    const filtered = uniqueSecrets.filter(s => s !== 'GITHUB_TOKEN');
    if (filtered.length > 0) {
      info(`CI uses GitHub secrets: ${filtered.join(', ')}`);
    }
  }
}

console.log('\n[2/5] Firebase Configuration');

const firebasePath = resolve('firebase.json');
if (!fs.existsSync(firebasePath)) {
  warn('firebase.json not found');
} else {
  const firebase = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));
  pass('firebase.json exists');

  if (firebase.firestore?.rules) {
    const rulesPath = resolve(firebase.firestore.rules);
    if (fs.existsSync(rulesPath)) {
      pass(`Firestore rules: ${firebase.firestore.rules}`);
    } else {
      fail(`Firestore rules file missing: ${firebase.firestore.rules}`);
    }
  }

  if (firebase.firestore?.indexes) {
    const indexPath = resolve(firebase.firestore.indexes);
    if (fs.existsSync(indexPath)) {
      pass(`Firestore indexes: ${firebase.firestore.indexes}`);
    } else {
      fail(`Firestore indexes file missing: ${firebase.firestore.indexes}`);
    }
  }
}

console.log('\n[3/5] Environment Files');

const envTemplates = [
  { example: 'src/environments/environment.example.ts', target: 'src/environments/environment.ts' },
  { example: 'src/environments/environment.prod.example.ts', target: 'src/environments/environment.prod.ts' }
];

for (const { example, target } of envTemplates) {
  const examplePath = resolve(example);
  const targetPath = resolve(target);

  if (!fs.existsSync(examplePath)) {
    fail(`Missing template: ${example}`);
  } else {
    pass(`${example} (template)`);
  }

  if (!fs.existsSync(targetPath)) {
    info(`${target} not found — run "npm run env:init" to create from template`);
  }
}

console.log('\n[4/5] Required Config Files');

const requiredFiles = [
  'tsconfig.app.json',
  'tsconfig.spec.json',
  'angular.json',
  'karma.conf.js',
  'cypress.config.ts'
];

for (const file of requiredFiles) {
  if (fs.existsSync(resolve(file))) {
    pass(file);
  } else {
    fail(`Missing: ${file}`);
  }
}

console.log('\n[5/5] Package Scripts');

const pkg = JSON.parse(fs.readFileSync(resolve('package.json'), 'utf8'));
const requiredScripts = ['lint', 'test', 'build', 'e2e:ci', 'start'];

for (const script of requiredScripts) {
  if (pkg.scripts[script]) {
    pass(`npm run ${script}`);
  } else {
    fail(`Missing script: ${script}`);
  }
}

console.log('\n' + '='.repeat(50));
if (errors > 0) {
  console.error(`\u274C ${errors} error(s), ${warnings} warning(s) — fix errors before pushing`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\u26A0\uFE0F  ${warnings} warning(s), 0 errors — OK to push but review warnings`);
} else {
  console.log('\u2705 All CI checks passed — safe to push');
}
