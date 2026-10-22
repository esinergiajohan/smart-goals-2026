import { useState } from 'react'
import { DashboardTemplate } from './components/04-templates/dashboard/DashboardTemplate.tsx'
import { TicketColumn } from './components/03-organisms/ticket-column/TicketColumn.tsx'
import { TicketSearch } from './components/03-organisms/ticket-search/TicketSearch.tsx'
import { useTicketCards } from './hooks/useTicketCards.ts'

function App() {
  const { pendingCards, deployedCards, addCard, removeCard, setDeployed } = useTicketCards()
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
        emptyMessage="Busca un ticket arriba para crear su card."
        focusKey={movedKey}
        onRemove={removeCard}
        onDeployChange={handleDeployChange}
      />
      <TicketColumn
        title="En producción"
        tone="deployed"
        tickets={deployedCards}
        emptyMessage="Aún no hay tickets desplegados en producción."
        focusKey={movedKey}
        onRemove={removeCard}
        onDeployChange={handleDeployChange}
      />
    </DashboardTemplate>
  )
}

export default App
