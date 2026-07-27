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

function repairMermaidBlock(code) {
  const lines = code.split('\n')
  const fixed = lines.map(line => {
    let l = line

    // Fix corrupted subgraph lines like: subgraph MVC["Spring MVC("Tomcat")"] -> subgraph MVC["Spring MVC (Tomcat)"]
    l = l.replace(/subgraph\s+([A-Za-z0-9_]+)\["([^"]*)\("([^"]+)"\)([^"]*)"\]/g, 'subgraph $1["$2($3)$4"]')

    // Fix cylinder nodes: ID[("text")]
    l = l.replace(/(\b[A-Za-z0-9_]+)\s*\[\(\s*"?\(?([^"\]\)]+?)\)?"?\s*\)\]/g, (m, id, text) => {
      const clean = text.replace(/"/g, "'").trim()
      return `${id}[("${clean}")]`
    })

    // Fix square bracket nodes with nested quotes inside:
    // e.g. Public["public\n("Visible Everywhere")"] -> Public["public\n(Visible Everywhere)"]
    // e.g. Graph["@EntityGraph("...")"] -> Graph["@EntityGraph(...)"]
    l = l.replace(/(\b[A-Za-z0-9_]+)\s*\[\s*"([\s\S]*?)"\s*\]/g, (m, id, text) => {
      // Skip cylinder [("...")]
      if (m.startsWith(`${id}[(`)) return m
      // Replace inner double quotes with single quotes or remove them inside parens
      let clean = text
      clean = clean.replace(/\("([^"]+)"\)/g, '($1)') // ("text") -> (text)
      clean = clean.replace(/"/g, "'") // Any remaining " -> '
      return `${id}["${clean}"]`
    })

    // Fix parens nodes: ID("text")
    l = l.replace(/(\b[A-Za-z0-9_]+)\s*\(\s*"([\s\S]*?)"\s*\)/g, (m, id, text) => {
      let clean = text.replace(/"/g, "'")
      return `${id}("${clean}")`
    })

    // Fix rhombus nodes: ID{"text"}
    l = l.replace(/(\b[A-Za-z0-9_]+)\s*\{\s*"([\s\S]*?)"\s*\}/g, (m, id, text) => {
      let clean = text.replace(/"/g, "'")
      return `${id}{"${clean}"}`
    })

    return l
  })

  return fixed.join('\n')
}

const mdFiles = getAllMdFiles(questionsDir)
let count = 0

for (const filePath of mdFiles) {
  const content = fs.readFileSync(filePath, 'utf-8')
  let modified = false

  const newContent = content.replace(/```mermaid\s*([\s\S]*?)```/g, (match, code) => {
    const fixed = repairMermaidBlock(code)
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

console.log(`Repaired Mermaid code blocks in ${count} markdown files.`)
