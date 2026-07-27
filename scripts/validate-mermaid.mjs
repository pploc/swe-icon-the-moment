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

const mdFiles = getAllMdFiles(questionsDir)
console.log(`Scanning ${mdFiles.length} markdown files for mermaid blocks...`)

let totalBlocks = 0
let syntaxIssues = []

for (const filePath of mdFiles) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const relativePath = path.relative(path.resolve(__dirname, '..'), filePath)
  
  const mermaidRegex = /```mermaid\s*([\s\S]*?)```/g
  let match
  while ((match = mermaidRegex.exec(content)) !== null) {
    totalBlocks++
    const code = match[1].trim()
    
    // Check for common Mermaid syntax errors:
    // 1. Unquoted labels with nested brackets/parentheses inside node definitions like ID[label (text)] or ID(label [text])
    const lines = code.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || line.startsWith('%%')) continue
      
      // Check for unquoted node labels with parentheses inside brackets, e.g. A[label (info)]
      // Correct syntax: A["label (info)"]
      const unquotedBracketParen = /\b[A-Za-z0-9_]+\s*\[(?!\s*"|\(\s*")[^"\]]*?\([^\)]*?\)[^"\]]*?\]/
      if (unquotedBracketParen.test(line)) {
        syntaxIssues.push({
          file: relativePath,
          line: i + 1,
          codeLine: line,
          reason: 'Unquoted label with parentheses inside square brackets: A[Text (Info)] should be A["Text (Info)"]'
        })
      }
      
      // Check for unquoted node labels with square brackets inside parens, e.g. A(label [info])
      const unquotedParenBracket = /\b[A-Za-z0-9_]+\s*\((?!\s*")[^"\)]*?\[[^\]]*?\][^"\)]*?\)/
      if (unquotedParenBracket.test(line)) {
        syntaxIssues.push({
          file: relativePath,
          line: i + 1,
          codeLine: line,
          reason: 'Unquoted label with square brackets inside parentheses: A(Text [Info]) should be A("Text [Info]")'
        })
      }
      
      // Check for unquoted special characters like & or : inside node labels without quotes
      // e.g. A[JVM & Native] or A[Key: Value]
      const unquotedSpecial = /\b[A-Za-z0-9_]+\s*\[(?!\s*")[^"\]]*?[&:=][^"\]]*?\]/
      if (unquotedSpecial.test(line)) {
        syntaxIssues.push({
          file: relativePath,
          line: i + 1,
          codeLine: line,
          reason: 'Unquoted special character (&, :, =) inside bracket label: A[Text & Info] should be A["Text & Info"]'
        })
      }
    }
  }
}

console.log(`Found ${totalBlocks} mermaid blocks.`)
if (syntaxIssues.length > 0) {
  console.log(`\nFound ${syntaxIssues.length} potential syntax issues:`)
  syntaxIssues.forEach(issue => {
    console.log(`- ${issue.file}:${issue.line} => ${issue.reason}\n  Line: ${issue.codeLine}`)
  })
} else {
  console.log('No obvious syntax issues found with regex check.')
}
