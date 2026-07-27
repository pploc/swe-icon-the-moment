import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const questionsDir = path.resolve(__dirname, '../content/questions')

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

function cleanMermaidCode(code) {
  const lines = code.split('\n')
  const cleaned = lines.map(line => {
    let l = line

    // Step 1: Remove double-nested quotes caused by broken script
    // e.g. ID["public\n("Visible Everywhere")"] -> ID["public\n(Visible Everywhere)"]
    // e.g. ID[("("text")")] -> ID[("text")]
    
    // Fix ID[(" ... ")] cylinder
    l = l.replace(/(\b[A-Za-z0-9_]+)\s*\[\(\s*["']?\s*\(?\s*["']?([^"'\)\]]+?)["']?\s*\)?\s*["']?\s*\)\]/g, (m, id, text) => {
      const clean = text.replace(/["'\(\)]/g, '').trim()
      return `${id}[("${clean}")]`
    })

    // Fix ID[" ... "] box
    l = l.replace(/(\b[A-Za-z0-9_]+)\s*\[\s*["']?\s*([^"\]]+?)\s*["']?\s*\]/g, (m, id, text) => {
      // If it was already cylinder [("...")], skip
      if (m.startsWith(`${id}[(`)) return m
      // Clean inner quotes
      let clean = text.trim()
      // Remove leading/trailing quotes if double-quoted inside
      if (clean.startsWith('"') && clean.endsWith('"')) {
        clean = clean.slice(1, -1)
      }
      // Remove any weird inner quotes like ("text") -> (text)
      clean = clean.replace(/\("([^"]+)"\)/g, '($1)').replace(/"/g, "'")
      return `${id}["${clean}"]`
    })

    // Fix ID(" ... ") round
    l = l.replace(/(\b[A-Za-z0-9_]+)\s*\(\s*["']?\s*([^"\)]+?)\s*["']?\s*\)/g, (m, id, text) => {
      let clean = text.trim()
      if (clean.startsWith('"') && clean.endsWith('"')) {
        clean = clean.slice(1, -1)
      }
      clean = clean.replace(/"/g, "'")
      return `${id}("${clean}")`
    })

    // Fix ID{" ... "} rhombus
    l = l.replace(/(\b[A-Za-z0-9_]+)\s*\{\s*["']?\s*([^"\}]+?)\s*["']?\s*\}/g, (m, id, text) => {
      let clean = text.trim()
      if (clean.startsWith('"') && clean.endsWith('"')) {
        clean = clean.slice(1, -1)
      }
      clean = clean.replace(/"/g, "'")
      return `${id}{"${clean}"}`
    })

    return l
  })

  return cleaned.join('\n')
}

const mdFiles = getAllMdFiles(questionsDir)
let count = 0

for (const filePath of mdFiles) {
  const content = fs.readFileSync(filePath, 'utf-8')
  let modified = false

  const newContent = content.replace(/```mermaid\s*([\s\S]*?)```/g, (match, code) => {
    const cleaned = cleanMermaidCode(code)
    if (cleaned !== code) {
      modified = true
    }
    return '```mermaid\n' + cleaned + '\n```'
  })

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf-8')
    count++
  }
}

console.log(`Cleaned up Mermaid code in ${count} markdown files.`)
