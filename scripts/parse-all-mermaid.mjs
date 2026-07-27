import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mermaid from 'mermaid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const questionsDir = path.resolve(__dirname, '../content/questions')

mermaid.initialize({
  startOnLoad: false,
  suppressErrorRendering: true,
})

function getAllMdFiles(dir) {
  let files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files = files.concat(getAllMdFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }
  return files
}

const mdFiles = getAllMdFiles(questionsDir)
console.log(`Testing ${mdFiles.length} files with mermaid.parse()...`)

let totalDiagrams = 0
let failedDiagrams = []

for (const filePath of mdFiles) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const relativePath = path.relative(path.resolve(__dirname, '..'), filePath)

  const mermaidRegex = /```mermaid\s*([\s\S]*?)```/g
  let match
  while ((match = mermaidRegex.exec(content)) !== null) {
    totalDiagrams++
    const code = match[1].trim()

    try {
      await mermaid.parse(code)
    } catch (err) {
      failedDiagrams.push({
        file: relativePath,
        code,
        error: err.message || String(err),
      })
    }
  }
}

console.log(`Tested ${totalDiagrams} diagrams across ${mdFiles.length} files.`)

if (failedDiagrams.length > 0) {
  console.log(`\n❌ Found ${failedDiagrams.length} INVALID Mermaid diagrams:`)
  failedDiagrams.forEach((f, idx) => {
    console.log(`\n--- Failed #${idx + 1}: ${f.file} ---`)
    console.log(`Error: ${f.error.split('\n')[0]}`)
    console.log(`Code:\n${f.code}\n`)
  })
} else {
  console.log(`\n✅ ALL ${totalDiagrams} MERMAID DIAGRAMS PASSED MERMAID.PARSE() SUCCESSFULLY!`)
}
