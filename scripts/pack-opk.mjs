import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const archiver = (() => {
  try {
    return require('archiver');
  } catch {
    return null;
  }
})();

const root = cwd();
const distDir = join(root, 'dist');
const outDir = join(root, 'release');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version ?? '0.0.0';
const opkPath = join(outDir, `lol-coach-${version}.opk`);

if (!existsSync(distDir)) {
  console.error('Missing dist/. Run npm run build first.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

// Store/install package: strip local-dev auto-refresh block.
const manifestPath = join(distDir, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest?.data?.developer) {
  delete manifest.data.developer;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function packWithArchiver() {
  const output = createWriteStream(opkPath);
  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.pipe(output);
  archive.directory(distDir, false);
  await archive.finalize();
  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
  });
}

async function packWithPowershell() {
  const zipPath = opkPath.replace(/\.opk$/i, '.zip');
  const ps = `
$ErrorActionPreference = 'Stop'
if (Test-Path -LiteralPath '${zipPath.replace(/'/g, "''")}') { Remove-Item -LiteralPath '${zipPath.replace(/'/g, "''")}' -Force }
if (Test-Path -LiteralPath '${opkPath.replace(/'/g, "''")}') { Remove-Item -LiteralPath '${opkPath.replace(/'/g, "''")}' -Force }
Compress-Archive -Path '${distDir.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -CompressionLevel Optimal
Move-Item -LiteralPath '${zipPath.replace(/'/g, "''")}' -Destination '${opkPath.replace(/'/g, "''")}'
`;
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(result.status ?? 1);
  }
}

if (archiver) {
  await packWithArchiver();
} else {
  await packWithPowershell();
}

console.log(`Created ${opkPath}`);
