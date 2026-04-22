import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirectory = path.dirname(currentFilePath)
const repoRoot = path.resolve(currentDirectory, '..')

const rawVersion = process.argv[2]

if (!rawVersion) {
  console.error('Usage: node scripts/set-version.mjs <version>')
  process.exit(1)
}

const version = rawVersion.replace(/^v/i, '').trim()

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid version: ${rawVersion}`)
  process.exit(1)
}

const packageFiles = [
  'package.json',
  'backend/package.json',
  'frontend/package.json',
  'shared/package.json',
]

for (const relativePath of packageFiles) {
  const filePath = path.join(repoRoot, relativePath)
  const packageJson = JSON.parse(await readFile(filePath, 'utf8'))
  packageJson.version = version
  await writeFile(filePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8')
}

console.log(`Updated workspace package versions to ${version}`)
