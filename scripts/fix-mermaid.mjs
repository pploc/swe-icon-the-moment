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

function fixMermaidCode(code) {
  const lines = code.split('\n')
  const fixedLines = lines.map(line => {
    let l = line

    // Fix cylinder nodes: ID[(text)] -> ID[("text")]
    l = l.replace(/(\b[A-Za-z0-9_]+)\s*\[\(\s*(?!"|\()([^"\]\)]+?)\s*\)\]/g, '$1[("$2")]')

    // Fix square bracket nodes: ID[text] -> ID["text"] if not already quoted
    l = l.replace(/(\b[A-Za-z0-9_]+)\s*\[\s*(?!"|\()([^"\]]+?)\s*\]/g, (match, id, text) => {
      if (/[ \(\):=&%\/\-@#\$]/g.test(text) || text.includes('\n')) {
        const cleanText = text.replace(/"/g, '\\"')
        return `${id}["${cleanText}"]`
      }
      return match
    })

    // Fix paren nodes: ID(text) -> ID("text") if contains special chars and not quoted
    l = l.replace(/(\b[A-Za-z0-9_]+)\s*\(\s*(?!"|\()([^"\)]+?)\s*\)/g, (match, id, text) => {
      if (/[ \[\xa0\]:=&%\/\-@#\$]/g.test(text) || text.includes('\n')) {
        const cleanText = text.replace(/"/g, '\\"')
        return `${id}("${cleanText}")`
      }
      return match
    })

    // Fix rhombus/curly nodes: ID{text} -> ID{"text"}
    l = l.replace(/(\b[A-Za-z0-9_]+)\s*\{\s*(?!"|\()([^"\}]+?)\s*\}/g, (match, id, text) => {
      if (/[ \(\)\[\]:=&%\/\-@#\$]/g.test(text) || text.includes('\n')) {
        const cleanText = text.replace(/"/g, '\\"')
        return `${id}{"${cleanText}"}`
      }
      return match
    })

    return l
  })

  return fixedLines.join('\n')
}

const mdFiles = getAllMdFiles(questionsDir)
let count = 0

for (const filePath of mdFiles) {
  const content = fs.readFileSync(filePath, 'utf-8')
  let modified = false

  const newContent = content.replace(/```mermaid\s*([\s\S]*?)```/g, (match, code) => {
    const fixed = fixMermaidCode(code)
    if (fixed !== code) {
      modified = true
    }
    return '```mermaid\n' + fixed + '\n```'
  })

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf-8')
    count++
  }
}

console.log(`Successfully fixed Mermaid syntax in ${count} markdown files.`)
