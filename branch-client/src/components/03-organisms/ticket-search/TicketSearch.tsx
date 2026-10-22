import { useId, useState, type KeyboardEvent } from 'react'
import { useTicketSearch } from '../../../hooks/useTicketSearch.ts'
import type { JiraTicket } from '../../../types/jira.ts'
import { classNames } from '../../../utils/classNames.ts'
import { SearchField } from '../../02-molecules/search-field/SearchField.tsx'
import { SearchResult } from '../../02-molecules/search-result/SearchResult.tsx'
import './ticket-search.scss'

interface TicketSearchProps {
  onSelect: (ticket: JiraTicket) => void
}

export function TicketSearch({ onSelect }: TicketSearchProps) {
  const id = useId()
  const listboxId = `${id}-listbox`
  const optionId = (index: number) => `${id}-option-${index}`

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const { status, results, error } = useTicketSearch(query)

  const expanded = open && status !== 'idle'
  const hasActive = expanded && activeIndex >= 0 && activeIndex < results.length

  const message =
    status === 'error'
      ? error
      : status === 'loading' && !results.length
        ? 'Buscando en Jira…'
        : status === 'success' && !results.length
          ? 'Sin tickets que coincidan.'
          : ''

  const announcement =
    status === 'success' && results.length
      ? `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`
      : message

  const select = (ticket: JiraTicket) => {
    onSelect(ticket)
    setQuery('')
    setActiveIndex(-1)
    setOpen(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setOpen(true)
        setActiveIndex((index) => Math.min(index + 1, results.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => Math.max(index - 1, 0))
        break
      case 'Enter':
        if (hasActive) {
          event.preventDefault()
          select(results[activeIndex])
        }
        break
      case 'Escape':
        if (expanded) {
          event.preventDefault()
          setOpen(false)
        } else {
          setQuery('')
        }
        break
    }
  }

  return (
    <div className="ticket-search">
      <SearchField
        label="Buscar ticket de Jira"
        placeholder="Buscar por clave o título"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-activedescendant={hasActive ? optionId(activeIndex) : undefined}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(-1)
          setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />

      <div className="ticket-search__popup" hidden={!expanded}>
        {message && (
          <p className={classNames('ticket-search__message', status === 'error' && 'ticket-search__message--error')}>
            {message}
          </p>
        )}
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Tickets encontrados"
          className="ticket-search__listbox"
          hidden={!results.length}
        >
          {results.map((ticket, index) => (
            <SearchResult
              key={ticket.key}
              id={optionId(index)}
              ticket={ticket}
              active={hasActive && index === activeIndex}
              onSelect={select}
            />
          ))}
        </ul>
      </div>

      <p className="visually-hidden" role="status">
        {expanded ? announcement : ''}
      </p>
    </div>
  )
}
