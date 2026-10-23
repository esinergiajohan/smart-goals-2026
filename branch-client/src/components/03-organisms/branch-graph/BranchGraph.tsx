import { useId } from 'react'
import { useElementWidth } from '../../../hooks/useElementWidth.ts'
import type { TicketBranches } from '../../../types/jira.ts'
import { BRANCH_ROLE_LABELS } from '../../../utils/branches.ts'
import './branch-graph.scss'

interface BranchGraphProps {
  branches: TicketBranches
}

interface Point {
  x: number
  y: number
}

type NodeTone = 'work' | 'merged'

const MIN_VIEW_WIDTH = 290
const MAX_VIEW_WIDTH = 520
const NODE_WIDTH = { min: 110, max: 200 }
const NODE_HEIGHT = 44
const NODE_GAP = 10
const NAME_CHAR_WIDTH = 6.1
const EDGE_SPAN = 56
const BRANCH_PREFIX = 'feature/'
const FRAME = { width: 136, height: 72, strip: 22, radius: 14, nodeX: 26 }
const VIEW_PADDING = 4

const stripPath = ({ strip, radius, height }: typeof FRAME) =>
  `M ${strip} 0 H ${radius} A ${radius} ${radius} 0 0 0 0 ${radius} V ${height - radius} A ${radius} ${radius} 0 0 0 ${radius} ${height} H ${strip} Z`

const shortName = (branch: string, max: number) => {
  const name = branch.trim().replace(BRANCH_PREFIX, '')
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

const layoutFor = (width: number) => {
  const viewWidth = Math.min(MAX_VIEW_WIDTH, Math.max(MIN_VIEW_WIDTH, Math.round(width)))
  const nodeWidth = Math.min(NODE_WIDTH.max, Math.max(NODE_WIDTH.min, viewWidth - FRAME.width - EDGE_SPAN))
  return { viewWidth, nodeWidth, childX: viewWidth - nodeWidth, nameLength: Math.floor((nodeWidth - 16) / NAME_CHAR_WIDTH) }
}

const edgePath = (from: Point, to: Point) => {
  const middle = (from.x + to.x) / 2
  return `M ${from.x} ${from.y} C ${middle} ${from.y}, ${middle} ${to.y}, ${to.x - 3} ${to.y}`
}

interface BranchNodeProps {
  tone: NodeTone
  label: string
  branch: string
  point: Point
  width: number
  nameLength: number
  bare?: boolean
}

function BranchNode({ tone, label, branch, point, width, nameLength, bare = false }: BranchNodeProps) {
  const name = branch.trim()

  return (
    <g className={`branch-graph__node branch-graph__node--${tone}`} transform={`translate(${point.x} ${point.y})`}>
      <title>{`${label}: ${name || 'sin definir'}`}</title>
      {!bare && <rect width={width} height={NODE_HEIGHT} rx="10" className="branch-graph__box" />}
      <circle cx="14" cy="14" r="4" className="branch-graph__dot" />
      <text x="24" y="17" className="branch-graph__role">
        {label}
      </text>
      <text x="12" y="34" className={name ? 'branch-graph__name' : 'branch-graph__name branch-graph__name--empty'}>
        {name ? shortName(name, nameLength) : 'sin definir'}
      </text>
    </g>
  )
}

export function BranchGraph({ branches }: BranchGraphProps) {
  const markerId = useId()
  const [figureRef, width] = useElementWidth<HTMLElement>(MIN_VIEW_WIDTH)
  const { viewWidth, nodeWidth, childX, nameLength } = layoutFor(width)

  const count = branches.merged.length
  const childrenHeight = count ? count * NODE_HEIGHT + (count - 1) * NODE_GAP : 0
  const contentHeight = Math.max(childrenHeight, FRAME.height)
  const frameY = VIEW_PADDING + (contentHeight - FRAME.height) / 2
  const childrenY = VIEW_PADDING + (contentHeight - childrenHeight) / 2
  const origin: Point = { x: FRAME.width, y: frameY + FRAME.height / 2 }
  const label = count
    ? `Grafo de ramas: la rama de Trabajo es la release y de ella se cortan ${count} ${count === 1 ? 'rama unida' : 'ramas unidas'}.`
    : 'Grafo de ramas: la rama de Trabajo es la release y todavía no tiene ramas unidas.'

  return (
    <figure ref={figureRef} className="branch-graph">
      <svg
        className="branch-graph__svg"
        viewBox={`0 0 ${viewWidth} ${contentHeight + VIEW_PADDING * 2}`}
        role="img"
        aria-label={label}
      >
        <defs>
          <linearGradient id={`${markerId}-fill`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c084fc" stopOpacity="0.2" />
            <stop offset="1" stopColor="#c084fc" stopOpacity="0.04" />
          </linearGradient>
          <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 z" className="branch-graph__arrow" />
          </marker>
        </defs>

        <g className="branch-graph__release" transform={`translate(0 ${frameY})`}>
          <rect width={FRAME.width} height={FRAME.height} rx={FRAME.radius}
            fill={`url(#${markerId}-fill)`}
            className="branch-graph__release-frame"
          />
          <path d={stripPath(FRAME)} className="branch-graph__release-strip" />
          <text
            x={FRAME.strip / 2}
            y={FRAME.height / 2}
            transform={`rotate(-90 ${FRAME.strip / 2} ${FRAME.height / 2})`}
            textAnchor="middle"
            dominantBaseline="central"
            className="branch-graph__release-text"
          >
            Release
          </text>
        </g>

        {branches.merged.map((_, index) => (
          <path
            key={index}
            d={edgePath(origin, { x: childX, y: childrenY + index * (NODE_HEIGHT + NODE_GAP) + NODE_HEIGHT / 2 })}
            className="branch-graph__edge"
            markerEnd={`url(#${markerId})`}
          />
        ))}

        <BranchNode
          tone="work"
          label={BRANCH_ROLE_LABELS.work}
          branch={branches.work}
          point={{ x: FRAME.nodeX, y: frameY + (FRAME.height - NODE_HEIGHT) / 2 }}
          width={FRAME.width - FRAME.nodeX}
          nameLength={Math.floor((FRAME.width - FRAME.nodeX - 16) / NAME_CHAR_WIDTH)}
          bare
        />

        {branches.merged.map((branch, index) => (
          <BranchNode
            key={index}
            tone="merged"
            label="Unida"
            branch={branch}
            point={{ x: childX, y: childrenY + index * (NODE_HEIGHT + NODE_GAP) }}
            width={nodeWidth}
            nameLength={nameLength}
          />
        ))}

        {!count && (
          <text x={childX - 10} y={frameY + FRAME.height / 2 + 3} className="branch-graph__hint">
            Sin ramas unidas
          </text>
        )}
      </svg>

      {count > 0 && (
        <figcaption className="branch-graph__legend">
          <span className="branch-graph__legend-item">cortadas de la release</span>
        </figcaption>
      )}
    </figure>
  )
}
