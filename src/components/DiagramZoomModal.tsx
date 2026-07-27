import { useEffect, useRef, useState, useCallback } from 'react'

export interface DiagramData {
  html: string
  title?: string
}

export function DiagramZoomModal() {
  const [activeDiagram, setActiveDiagram] = useState<DiagramData | null>(null)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const hasDraggedRef = useRef<boolean>(false)

  // Listen for clicks on diagrams anywhere in the document
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return

      // Don't trigger if already clicking inside a modal or control button
      if (target.closest('.diagram-zoom-modal')) return

      // Match mermaid container, SVG, or prose image
      const diagramEl = target.closest<HTMLElement>(
        'pre.mermaid, .mermaid, .prose img, img.diagram-zoomable',
      )

      if (diagramEl) {
        // Prevent default navigation if wrapped in link
        e.preventDefault()

        let html = ''
        let title = 'Diagram Zoom'

        if (diagramEl.tagName.toLowerCase() === 'img') {
          const img = diagramEl as HTMLImageElement
          html = `<img src="${img.src}" alt="${img.alt || 'Diagram'}" style="max-width: 100%; max-height: 80vh; object-fit: contain; margin: 0 auto; display: block;" />`
          title = img.alt || 'Image Zoom'
        } else {
          // Mermaid SVG or Container
          const svg = diagramEl.querySelector('svg')
          if (svg) {
            const clone = svg.cloneNode(true) as SVGElement
            clone.style.width = '100%'
            clone.style.height = 'auto'
            clone.style.maxWidth = '100%'
            clone.style.maxHeight = '75vh'
            clone.style.display = 'block'
            clone.style.margin = '0 auto'
            html = clone.outerHTML
          } else if (diagramEl.innerHTML) {
            html = diagramEl.innerHTML
          }
        }

        if (html) {
          setActiveDiagram({ html, title })
          setScale(1)
          setPan({ x: 0, y: 0 })
        }
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Close on Escape & Zoom via keyboard
  useEffect(() => {
    if (!activeDiagram) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setActiveDiagram(null)
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(4, s + 0.25))
      } else if (e.key === '-') {
        setScale((s) => Math.max(0.5, s - 0.25))
      } else if (e.key === '0') {
        setScale(1)
        setPan({ x: 0, y: 0 })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeDiagram])

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.15 : -0.15
    setScale((s) => Math.min(4, Math.max(0.5, s + delta)))
  }, [])

  // Mouse drag panning & click backdrop to close
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Left click only
    setIsDragging(true)
    hasDraggedRef.current = false
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    panStartRef.current = { ...pan }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasDraggedRef.current = true
    }

    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    })
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null
    setIsDragging(false)

    // If user clicked (without panning/dragging) on empty space outside the diagram card, close modal
    if (!hasDraggedRef.current && target) {
      const isContent = target.closest('.diagram-zoom-content')
      const isControl = target.closest('.diagram-zoom-controls')
      
      if (!isContent && !isControl) {
        setActiveDiagram(null)
      }
    }
  }

  if (!activeDiagram) return null

  return (
    <div className="diagram-zoom-modal fixed inset-0 z-50 flex flex-col bg-carbon-950/90 backdrop-blur-md animate-fade">
      {/* Header bar */}
      <div className="diagram-zoom-controls flex h-14 shrink-0 items-center justify-between border-b border-carbon-700 bg-carbon-900 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
            ■ {activeDiagram.title}
          </span>
          <span className="font-mono text-[11px] text-carbon-400">
            ({Math.round(scale * 100)}%)
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(4, s + 0.25))}
            title="Zoom In (+)"
            className="flex size-8 items-center justify-center border border-carbon-700 bg-carbon-850 font-mono text-sm text-carbon-200 transition-colors hover:border-ember-500 hover:text-ember-400"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            title="Zoom Out (-)"
            className="flex size-8 items-center justify-center border border-carbon-700 bg-carbon-850 font-mono text-sm text-carbon-200 transition-colors hover:border-ember-500 hover:text-ember-400"
          >
            −
          </button>

          <button
            type="button"
            onClick={() => {
              setScale(1)
              setPan({ x: 0, y: 0 })
            }}
            title="Reset Zoom (0)"
            className="border border-carbon-700 bg-carbon-850 px-2.5 py-1 font-mono text-xs text-carbon-300 transition-colors hover:border-ember-500 hover:text-ember-400"
          >
            Reset
          </button>

          <div className="mx-1 h-5 w-px bg-carbon-700" />

          <button
            type="button"
            onClick={() => setActiveDiagram(null)}
            title="Close (Esc)"
            className="flex size-8 items-center justify-center border border-carbon-700 bg-carbon-850 font-mono text-sm text-carbon-300 transition-colors hover:border-signal-danger hover:text-signal-danger"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Diagram Canvas Container */}
      <div
        className={`relative flex-1 overflow-hidden select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
      >
        <div
          className="absolute inset-0 flex items-center justify-center p-6 transition-transform duration-75 ease-out pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <div
            className="diagram-zoom-content pointer-events-auto flex min-h-[300px] min-w-[320px] max-h-[85vh] max-w-[90vw] items-center justify-center rounded-xl border border-carbon-700 bg-carbon-900 p-6 shadow-2xl overflow-auto"
            dangerouslySetInnerHTML={{ __html: activeDiagram.html }}
          />
        </div>
      </div>

      {/* Footer hint */}
      <div className="diagram-zoom-controls flex h-10 shrink-0 items-center justify-between border-t border-carbon-700 bg-carbon-900 px-4 font-mono text-[11px] text-carbon-400">
        <span>Click empty space to close · Scroll to zoom · Drag to pan</span>
        <span className="hidden sm:inline">Shortcut: + / - / 0 / Esc</span>
      </div>
    </div>
  )
}
