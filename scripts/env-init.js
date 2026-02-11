const fs = require('fs');
const path = require('path');

const ENV_DIR = path.resolve(__dirname, '..', 'src', 'environments');

const templates = [
  { example: 'environment.example.ts', target: 'environment.ts' },
  { example: 'environment.prod.example.ts', target: 'environment.prod.ts' }
];

let created = 0;

for (const { example, target } of templates) {
  const targetPath = path.join(ENV_DIR, target);
  const examplePath = path.join(ENV_DIR, example);

  if (fs.existsSync(targetPath)) {
    continue;
  }

  if (!fs.existsSync(examplePath)) {
    console.error(`Missing template: ${example}`);
    process.exit(1);
  }

  fs.copyFileSync(examplePath, targetPath);
  console.log(`Created ${target} from ${example}`);
  created++;
}

if (created > 0) {
  console.log(`Initialized ${created} environment file(s)`);
}
