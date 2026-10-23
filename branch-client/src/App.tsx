import { useState } from 'react'
import { DashboardTemplate } from './components/04-templates/dashboard/DashboardTemplate.tsx'
import { DeliveryMetrics } from './components/03-organisms/delivery-metrics/DeliveryMetrics.tsx'
import { ActiveTicketColumn } from './components/03-organisms/active-ticket-column/ActiveTicketColumn.tsx'
import { TicketColumn } from './components/03-organisms/ticket-column/TicketColumn.tsx'
import { TicketSearch } from './components/03-organisms/ticket-search/TicketSearch.tsx'
import { useActiveTickets } from './hooks/useActiveTickets.ts'
import { useRepositories } from './hooks/useRepositories.ts'
import { useTicketStatuses } from './hooks/useTicketStatuses.ts'
import { useTicketCards } from './hooks/useTicketCards.ts'

function App() {
  const {
    pendingCards,
    deployedCards,
    error,
    addCard,
    removeCard,
    setDeployed,
    setBranches,
    setFeaturedComment,
    setRepository,
  } = useTicketCards()
  const { repositories, addRepository } = useRepositories()
  const active = useActiveTickets()
  const statuses = useTicketStatuses([...pendingCards, ...deployedCards].map((card) => card.key))
  const [movedKey, setMovedKey] = useState<string>()

  const handleDeployChange = (key: string, deployed: boolean) => {
    setDeployed(key, deployed)
    setMovedKey(key)
  }

  return (
    <DashboardTemplate
      title="Jira Smart Project"
      search={<TicketSearch onSelect={addCard} />}
      summary={<DeliveryMetrics />}
    >
      <TicketColumn
        title="Pendientes de despliegue"
        tone="pending"
        tickets={pendingCards}
        statuses={statuses}
        repositories={repositories}
        emptyMessage="Busca un ticket arriba para crear su card."
        error={error}
        focusKey={movedKey}
        onRemove={removeCard}
        onDeployChange={handleDeployChange}
        onBranchesChange={setBranches}
        onFeaturedCommentChange={setFeaturedComment}
        onRepositoryChange={setRepository}
        onAddRepository={addRepository}
      />
      <TicketColumn
        title="En producción"
        tone="deployed"
        tickets={deployedCards}
        statuses={statuses}
        repositories={repositories}
        emptyMessage="Aún no hay tickets desplegados en producción."
        focusKey={movedKey}
        onRemove={removeCard}
        onDeployChange={handleDeployChange}
        onBranchesChange={setBranches}
        onFeaturedCommentChange={setFeaturedComment}
        onRepositoryChange={setRepository}
        onAddRepository={addRepository}
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
