import { useId, type KeyboardEvent } from 'react'
import { useElementWidth } from '../../../hooks/useElementWidth.ts'
import type { TicketStatus } from '../../../types/jira.ts'
import type { BranchOrigin, JoinedBranch, ReleaseGraph as ReleaseGraphValue } from '../../../types/release.ts'
import { classNames } from '../../../utils/classNames.ts'
import { formatShortDate } from '../../../utils/formatDate.ts'
import { BRANCH_ORIGIN_LABELS, describeBase, JOIN_METHOD_LABELS, mixedBranches } from '../../../utils/releases.ts'
import { statusTone } from '../../../utils/status.ts'
import { Switch } from '../../01-atoms/switch/Switch.tsx'
import './release-graph.scss'

interface ReleaseGraphProps {
  graph: ReleaseGraphValue
  ticketKeys: string[]
  statuses: Record<string, TicketStatus>
  selected?: string
  closures: Record<string, string | undefined>
  onSelect: (key: string) => void
  onClosureChange: (key: string, closing: boolean) => void
}

type EdgeStroke = 'merge' | 'cherry-pick' | 'direct' | 'pending'

interface GraphNode {
  id: string
  ticketKey?: string
  branch?: JoinedBranch
  direct?: boolean
}

const MIN_VIEW_WIDTH = 400
const NODE_WIDTH = { min: 200, max: 290, share: 0.6 }
const NAME_CHAR_WIDTH = 6.7
const NODE_HEIGHT = 56
const CLOSURE_ROW = 26
const NODE_GAP = 8
const FRAME = { width: 152, minHeight: 92, strip: 22, radius: 14, lineHeight: 13, spread: 0.6 }
const EDGE_INSET = 18
const VIEW_PADDING = 4
const MAX_FRAME_TEXT_LENGTH = 21
const CHEVRON = { spacing: 11, samples: 80 }
const BADGE = { x: 10, y: 39, height: 12, padding: 6, charWidth: 5.9, maxWidth: 110 }
const BRANCH_PREFIX = /^(feature|bugfix|fix|hotfix|release)\//
const ORIGIN_ORDER: BranchOrigin[] = ['staging', 'develop', 'main', 'release']
const ORIGIN_ROLES: Record<BranchOrigin, string> = {
  main: 'de main ✓',
  release: 'de la release',
  staging: 'trae staging ✗',
  develop: 'trae develop ✗',
}
const MARKER_TONES = ['main', 'release', 'alert', 'pending'] as const

const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

const shortName = (branch: string, max: number) => shorten(branch.replace(BRANCH_PREFIX, ''), max)

const markerTone = (branch: JoinedBranch) => {
  if (!branch.joined) return 'pending'
  if (branch.origin === 'staging' || branch.origin === 'develop') return 'alert'
  return branch.origin
}

const progress = (branch: JoinedBranch) =>
  branch.joined === 0 ? 'sin unir' : branch.joined < branch.commits ? `${branch.joined}/${branch.commits}` : ''

const statusLabel = (status?: TicketStatus) => status?.name ?? 'Estado…'

const badgeText = (label: string) =>
  shorten(label, Math.floor((BADGE.maxWidth - BADGE.padding * 2) / BADGE.charWidth))

const badgeWidth = (label: string) => badgeText(label).length * BADGE.charWidth + BADGE.padding * 2

const commitsLabel = (commits: number) => (commits ? `${commits} ${commits === 1 ? 'commit' : 'commits'}` : 'sin commits')

const DIRECT_ROLE = 'directo en la release'

const nodeRole = ({ branch, direct }: GraphNode) =>
  branch
    ? [JOIN_METHOD_LABELS[branch.method], progress(branch), ORIGIN_ROLES[branch.origin]].filter(Boolean).join(' · ')
    : direct
      ? DIRECT_ROLE
      : 'sin commits en la release'

const nodeTitle = (node: GraphNode, status?: TicketStatus) =>
  [
    node.branch
      ? `${node.branch.name}: ${JOIN_METHOD_LABELS[node.branch.method]}, ${BRANCH_ORIGIN_LABELS[node.branch.origin]}, ${node.branch.joined} de ${node.branch.commits} commits en la release${node.branch.pullRequest ? `, PR #${node.branch.pullRequest}` : ''}`
      : `${node.ticketKey}: ${nodeRole(node)}`,
    node.ticketKey && `Jira: ${statusLabel(status)}`,
  ]
    .filter(Boolean)
    .join('. ')

interface Layout {
  viewWidth: number
  nodeWidth: number
  releaseX: number
  nameLength: number
}

const layoutFor = (width: number): Layout => {
  const viewWidth = Math.max(MIN_VIEW_WIDTH, Math.round(width))
  const releaseX = viewWidth - FRAME.width
  const nodeWidth = Math.min(NODE_WIDTH.max, Math.max(NODE_WIDTH.min, releaseX * NODE_WIDTH.share))
  return { viewWidth, nodeWidth, releaseX, nameLength: Math.floor((nodeWidth - 20) / NAME_CHAR_WIDTH) }
}

const edgePoints = ({ nodeWidth, releaseX }: Layout, fromY: number, toY: number) => {
  const middle = (nodeWidth + releaseX) / 2
  return [
    [nodeWidth, fromY],
    [middle, fromY],
    [middle, toY],
    [releaseX - 3, toY],
  ] as const
}

const edgePath = (layout: Layout, fromY: number, toY: number) => {
  const [start, first, second, end] = edgePoints(layout, fromY, toY)
  return `M ${start.join(' ')} C ${first.join(' ')}, ${second.join(' ')}, ${end.join(' ')}`
}

const chevrons = (layout: Layout, fromY: number, toY: number) => {
  const [p0, p1, p2, p3] = edgePoints(layout, fromY, toY)
  const at = (t: number, axis: 0 | 1) =>
    (1 - t) ** 3 * p0[axis] + 3 * (1 - t) ** 2 * t * p1[axis] + 3 * (1 - t) * t ** 2 * p2[axis] + t ** 3 * p3[axis]
  const samples = Array.from({ length: CHEVRON.samples + 1 }, (_, index) => {
    const t = index / CHEVRON.samples
    return { x: at(t, 0), y: at(t, 1) }
  })
  const marks: Array<{ x: number; y: number; angle: number }> = []
  let travelled = 0
  let next = CHEVRON.spacing
  for (let index = 1; index < samples.length; index++) {
    const from = samples[index - 1]
    const to = samples[index]
    travelled += Math.hypot(to.x - from.x, to.y - from.y)
    if (travelled < next) continue
    marks.push({ x: to.x, y: to.y, angle: (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI })
    next += CHEVRON.spacing
  }
  return marks.slice(0, -1)
}

const edgeStroke = (node: GraphNode): EdgeStroke | undefined => {
  if (!node.branch) return node.direct ? 'direct' : undefined
  if (!node.branch.joined) return 'pending'
  return node.branch.method === 'cherry-pick' ? 'cherry-pick' : 'merge'
}

const stripPath = (height: number) => {
  const { strip, radius } = FRAME
  return `M ${strip} 0 H ${radius} A ${radius} ${radius} 0 0 0 0 ${radius} V ${height - radius} A ${radius} ${radius} 0 0 0 ${radius} ${height} H ${strip} Z`
}

export function ReleaseGraph({
  graph,
  ticketKeys,
  statuses,
  selected,
  closures,
  onSelect,
  onClosureChange,
}: ReleaseGraphProps) {
  const id = useId()
  const [figureRef, width] = useElementWidth<HTMLElement>(MIN_VIEW_WIDTH)
  const layout = layoutFor(width)
  const keys = new Set(ticketKeys)
  const mixed = mixedBranches(graph)
  const commitsByKey = new Map(graph.tickets.map((ticket) => [ticket.key, ticket.commits]))
  const branchNodes: GraphNode[] = graph.branches
    .filter(
      (branch) =>
        branch.method !== 'sync' &&
        ((branch.ticketKey && keys.has(branch.ticketKey)) || mixed.includes(branch) || (branch.origin === 'main' && branch.joined > 0)),
    )
    .sort((a, b) => ORIGIN_ORDER.indexOf(a.origin) - ORIGIN_ORDER.indexOf(b.origin) || a.name.localeCompare(b.name))
    .map((branch) => ({
      id: `${branch.method}:${branch.name}`,
      ticketKey: branch.ticketKey && keys.has(branch.ticketKey) ? branch.ticketKey : undefined,
      branch,
    }))
  const withBranch = new Set(branchNodes.map((node) => node.ticketKey))
  const nodes = [
    ...branchNodes,
    ...ticketKeys.filter((key) => !withBranch.has(key)).map((key): GraphNode => ({ id: `ticket:${key}`, ticketKey: key, direct: Boolean(commitsByKey.get(key)) })),
  ]

  const showsClosure = ({ ticketKey }: GraphNode) =>
    Boolean(ticketKey && (closures[ticketKey] || (statuses[ticketKey] && statuses[ticketKey].category !== 'done')))
  const heights = nodes.map((node) => NODE_HEIGHT + (showsClosure(node) ? CLOSURE_ROW : 0))
  const offsets = heights.map((_, index) => heights.slice(0, index).reduce((sum, height) => sum + height + NODE_GAP, 0))

  const handleKey = (key: string) => (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect(key)
  }

  const production = graph.production.replace(/^origin\//, '')
  const base = describeBase(graph.base.subject)
  const frameLines = [
    { text: shortName(graph.branch, MAX_FRAME_TEXT_LENGTH), className: 'release-graph__release-name' },
    { text: `de ${production} · ${graph.base.sha}`, className: 'release-graph__release-base' },
    { text: shorten(base.source, MAX_FRAME_TEXT_LENGTH), className: 'release-graph__release-meta' },
    {
      text: [base.pullRequest && `PR #${base.pullRequest}`, formatShortDate(graph.base.date)].filter(Boolean).join(' · '),
      className: 'release-graph__release-meta',
    },
  ]

  const nodesHeight = nodes.length ? offsets[nodes.length - 1] + heights[nodes.length - 1] : 0
  const frameHeight = Math.max(FRAME.minHeight, nodesHeight * FRAME.spread)
  const contentHeight = Math.max(nodesHeight, frameHeight)
  const frameY = VIEW_PADDING + (contentHeight - frameHeight) / 2
  const nodesY = VIEW_PADDING + (contentHeight - nodesHeight) / 2
  const nodeY = (index: number) => nodesY + offsets[index]
  const targetY = (index: number) =>
    nodes.length === 1
      ? frameY + frameHeight / 2
      : frameY + EDGE_INSET + (index * (frameHeight - EDGE_INSET * 2)) / (nodes.length - 1)
  const textTop = frameHeight / 2 - ((frameLines.length - 1) * FRAME.lineHeight) / 2

  return (
    <figure ref={figureRef} className="release-graph">
      <svg
        className="release-graph__svg"
        viewBox={`0 0 ${layout.viewWidth} ${contentHeight + VIEW_PADDING * 2}`}
        role="group"
        aria-label={`Grafo de la release ${graph.branch}, cortada de ${production} en ${graph.base.sha}: ${nodes.length} ramas de las cards${mixed.length ? `, ${mixed.length} de otra base` : ''}.`}
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c084fc" stopOpacity="0.24" />
            <stop offset="1" stopColor="#c084fc" stopOpacity="0.05" />
          </linearGradient>
          {MARKER_TONES.map((tone) => (
            <marker
              key={tone}
              id={`${id}-${tone}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="9"
              markerHeight="9"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" className={`release-graph__arrow release-graph__arrow--${tone}`} />
            </marker>
          ))}
        </defs>

        {nodes.map((node, index) => {
          const stroke = edgeStroke(node)
          if (!stroke) return null
          const tone = node.branch ? markerTone(node.branch) : 'release'
          const fromY = nodeY(index) + heights[index] / 2
          const toY = targetY(index)
          return (
            <g key={node.id} className={classNames('release-graph__link', `release-graph__link--${tone}`)}>
              <path
                d={edgePath(layout, fromY, toY)}
                className={classNames('release-graph__edge', `release-graph__edge--${tone}`, `release-graph__edge--${stroke}`)}
                markerEnd={stroke === 'pending' ? undefined : `url(#${id}-${tone})`}
              />
              {stroke === 'cherry-pick' &&
                chevrons(layout, fromY, toY).map((mark, markIndex) => (
                  <path
                    key={markIndex}
                    d="M -2.5 -3 L 1.5 0 L -2.5 3"
                    transform={`translate(${mark.x} ${mark.y}) rotate(${mark.angle})`}
                    className="release-graph__chevron"
                    style={{ animationDelay: `${markIndex * 60}ms` }}
                  />
                ))}
            </g>
          )
        })}

        {nodes.map((node, index) => {
          const { id: nodeId, ticketKey, branch } = node
          const status = ticketKey ? statuses[ticketKey] : undefined
          const label = statusLabel(status)
          const width = badgeWidth(label)
          const closureUrl = ticketKey ? closures[ticketKey] : undefined
          return (
            <g
              key={nodeId}
              className={classNames(
                'release-graph__node',
                branch ? `release-graph__node--${branch.origin}` : node.direct ? 'release-graph__node--release' : 'release-graph__node--missing',
                (branch ? !branch.joined : !node.direct) && 'release-graph__node--pending',
                ticketKey && ticketKey === selected && 'release-graph__node--selected',
              )}
              transform={`translate(0 ${nodeY(index)})`}
            >
              <g
                className={classNames(ticketKey && 'release-graph__node--interactive')}
                {...(ticketKey && {
                  role: 'button',
                  tabIndex: 0,
                  'aria-haspopup': 'dialog' as const,
                  'aria-label': `Abrir la card de ${ticketKey}, ${label}${closureUrl ? ', dada por finalizada' : ''}. ${nodeRole(node)}`,
                  onClick: () => onSelect(ticketKey),
                  onKeyDown: handleKey(ticketKey),
                })}
              >
                <title>{nodeTitle(node, status)}</title>
                <rect width={layout.nodeWidth} height={heights[index]} rx="9" className="release-graph__box" />
                <circle cx="12" cy="13" r="3.5" className="release-graph__dot" />
                <text x="21" y="16" className="release-graph__role">
                  {nodeRole(node)}
                </text>
                <text x="10" y="31" className="release-graph__name">
                  {branch ? shortName(branch.name, layout.nameLength) : ticketKey}
                </text>
                {branch && !ticketKey && (
                  <text x={BADGE.x} y={BADGE.y + BADGE.height / 2} dominantBaseline="central" className="release-graph__commits">
                    {`sin card · ${commitsLabel(branch.commits)}`}
                  </text>
                )}
                {ticketKey && (
                  <>
                    <g className={`release-graph__status release-graph__status--${status ? statusTone(status.name, status.category) : 'unknown'}`}>
                      <rect x={BADGE.x} y={BADGE.y} width={width} height={BADGE.height} rx={BADGE.height / 2} />
                      <text x={BADGE.x + width / 2} y={BADGE.y + BADGE.height / 2} textAnchor="middle" dominantBaseline="central">
                        {badgeText(label)}
                      </text>
                    </g>
                    <text x={BADGE.x + width + 6} y={BADGE.y + BADGE.height / 2} dominantBaseline="central" className="release-graph__commits">
                      {commitsLabel(commitsByKey.get(ticketKey) ?? 0)}
                    </text>
                  </>
                )}
              </g>
              {ticketKey && showsClosure(node) && (
                <foreignObject x="8" y={NODE_HEIGHT - 2} width={layout.nodeWidth - 16} height={CLOSURE_ROW}>
                  <div className="release-graph__closure">
                    <Switch checked={Boolean(closureUrl)} onChange={(checked) => onClosureChange(ticketKey, checked)}>
                      {closureUrl ? 'Dada por finalizada' : 'Dar por finalizada'}
                    </Switch>
                    {closureUrl && (
                      <a href={closureUrl} target="_blank" rel="noreferrer" className="release-graph__closure-link">
                        Justificación
                      </a>
                    )}
                  </div>
                </foreignObject>
              )}
            </g>
          )
        })}

        {!nodes.length && (
          <text x={layout.releaseX - 12} y={frameY + frameHeight / 2 + 3} textAnchor="end" className="release-graph__hint">
            Sin ramas propias de las cards
          </text>
        )}

        <g className="release-graph__release" transform={`translate(${layout.releaseX} ${frameY})`}>
          <title>{`${graph.ref}: cortada de ${production} en ${graph.base.sha} ${graph.base.subject}`}</title>
          <rect
            width={FRAME.width}
            height={frameHeight}
            rx={FRAME.radius}
            fill={`url(#${id}-fill)`}
            className="release-graph__release-frame"
          />
          <path d={stripPath(frameHeight)} className="release-graph__release-strip" />
          <text
            x={FRAME.strip / 2}
            y={frameHeight / 2}
            transform={`rotate(-90 ${FRAME.strip / 2} ${frameHeight / 2})`}
            textAnchor="middle"
            dominantBaseline="central"
            className="release-graph__release-text"
          >
            Release
          </text>
          {frameLines.map((line, index) => (
            <text
              key={index}
              x={FRAME.strip + 9}
              y={textTop + index * FRAME.lineHeight}
              dominantBaseline="central"
              className={line.className}
            >
              {line.text}
            </text>
          ))}
        </g>
      </svg>
    </figure>
  )
}
