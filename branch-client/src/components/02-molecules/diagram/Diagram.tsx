import { useEffect, useId, useRef, useState } from 'react'
import './diagram.scss'

interface DiagramProps {
  title: string
  definition: string
}

let initialized = false

export function Diagram({ title, definition }: DiagramProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const containerRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    import('mermaid')
      .then(async ({ default: mermaid }) => {
        if (!initialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            themeVariables: {
              darkMode: true,
              background: '#161616',
              primaryColor: '#1e1b4b',
              primaryBorderColor: '#818cf8',
              primaryTextColor: '#f4f4f5',
              secondaryColor: '#022c22',
              secondaryBorderColor: '#34d399',
              secondaryTextColor: '#f4f4f5',
              tertiaryColor: '#1f1f1f',
              tertiaryBorderColor: '#3a3a3a',
              tertiaryTextColor: '#f4f4f5',
              lineColor: '#a1a1aa',
              textColor: '#f4f4f5',
              noteBkgColor: '#451a03',
              noteTextColor: '#fcd34d',
              noteBorderColor: '#fbbf24',
              actorBkg: '#1e1b4b',
              actorBorder: '#818cf8',
              actorTextColor: '#f4f4f5',
              signalColor: '#a1a1aa',
              signalTextColor: '#f4f4f5',
              clusterBkg: '#111111',
              clusterBorder: '#3a3a3a',
            },
          })
          initialized = true
        }
        const { svg } = await mermaid.render(`diagram-${id}`, definition)
        if (!cancelled && containerRef.current) containerRef.current.innerHTML = svg
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [definition, id])

  return (
    <figure className="diagram">
      <figcaption className="diagram__title">{title}</figcaption>
      <div ref={containerRef} className="diagram__canvas" role="img" aria-label={title} />
      {failed && <pre className="diagram__fallback">{definition}</pre>}
    </figure>
  )
}
