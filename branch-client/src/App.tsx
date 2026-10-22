import { useState } from 'react'
import { DashboardTemplate } from './components/04-templates/dashboard/DashboardTemplate.tsx'
import { ActiveTicketColumn } from './components/03-organisms/active-ticket-column/ActiveTicketColumn.tsx'
import { TicketColumn } from './components/03-organisms/ticket-column/TicketColumn.tsx'
import { TicketSearch } from './components/03-organisms/ticket-search/TicketSearch.tsx'
import { useActiveTickets } from './hooks/useActiveTickets.ts'
import { useTicketStatuses } from './hooks/useTicketStatuses.ts'
import { useTicketCards } from './hooks/useTicketCards.ts'

function App() {
  const { pendingCards, deployedCards, error, addCard, removeCard, setDeployed, setBranches, setFeaturedComment } = useTicketCards()
  const active = useActiveTickets()
  const statuses = useTicketStatuses([...pendingCards, ...deployedCards].map((card) => card.key))
  const [movedKey, setMovedKey] = useState<string>()

  const handleDeployChange = (key: string, deployed: boolean) => {
    setDeployed(key, deployed)
    setMovedKey(key)
  }

  return (
    <DashboardTemplate title="Jira Smart Project" search={<TicketSearch onSelect={addCard} />}>
      <TicketColumn
        title="Pendientes de despliegue"
        tone="pending"
        tickets={pendingCards}
        statuses={statuses}
        emptyMessage="Busca un ticket arriba para crear su card."
        error={error}
        focusKey={movedKey}
        onRemove={removeCard}
        onDeployChange={handleDeployChange}
        onBranchesChange={setBranches}
        onFeaturedCommentChange={setFeaturedComment}
      />
      <TicketColumn
        title="En producción"
        tone="deployed"
        tickets={deployedCards}
        statuses={statuses}
        emptyMessage="Aún no hay tickets desplegados en producción."
        focusKey={movedKey}
        onRemove={removeCard}
        onDeployChange={handleDeployChange}
        onBranchesChange={setBranches}
        onFeaturedCommentChange={setFeaturedComment}
      />
      <ActiveTicketColumn
        title="Abiertos, en curso y bloqueados"
        tickets={active.tickets}
        loading={active.loading}
        error={active.error}
        emptyMessage="No tienes tickets abiertos, en curso ni bloqueados."
      />
    </DashboardTemplate>
  )
}

export default App
