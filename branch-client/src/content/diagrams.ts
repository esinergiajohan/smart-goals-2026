export const WORKFLOW_DIAGRAM = `flowchart TB
  subgraph antes[Antes del PR · revisión previa]
    direction LR
    A([Ticket en Jira]) --> B[Card]
    B --> C{{Generar plan<br/>Claude + pr-review}}
    C --> D[Implementación]
    D --> E[Rama -test]
    E --> F{{Revisar<br/>pr-review + Claude}}
    F -. pide ajustes .-> D
  end
  subgraph despues[Después del PR · resultado medido]
    direction LR
    G[PR a DEV y STG] --> H[Revisión del líder]
    H --> I([Aprobado sin devolución])
    I --> J[(Métrica e informe)]
  end
  antes -- aprobado y certificado --> despues
  classDef ia fill:#022c22,stroke:#34d399,color:#f4f4f5
  classDef meta fill:#451a03,stroke:#fbbf24,color:#fcd34d
  class C,F ia
  class I,J meta`

export const REVIEW_SEQUENCE = `sequenceDiagram
  autonumber
  actor Tu as Tú
  participant Card as Card
  participant API as Branch Manager
  participant Git as Repositorio local
  participant Jira as Jira
  participant Kit as Kit pr-review
  participant IA as Claude
  Tu->>Card: Pulsas «Revisar»
  Card->>API: Revisión de la rama -test
  API->>Git: ¿La rama existe y no está mezclada?
  API->>Jira: Lee el ticket
  API->>Kit: Recopila la evidencia (diff, ramas, riesgos)
  API->>IA: Aplica la política de pr-review en solo lectura
  IA-->>API: Veredicto, hallazgos y comentario
  API->>Kit: Certifica el resultado con el commit revisado
  API-->>Card: Nueva iteración en el historial`

export const PLAN_SEQUENCE = `sequenceDiagram
  autonumber
  actor Tu as Tú
  participant Card as Card
  participant API as Branch Manager
  participant Jira as Jira
  participant IA as Claude
  Tu->>Card: Pulsas «Generar plan»
  Card->>API: Plan de abordaje del ticket
  API->>Jira: Lee ticket, historia, épica y comentarios
  API->>IA: Aplica los criterios de pr-review y revisa el código
  IA-->>API: Criterios, preguntas, pasos, riesgos y pruebas
  API-->>Card: Plan en la card
  Tu->>Card: «Publicar en Jira»
  API->>Jira: Nota interna con tu cuenta`

export const ARCHITECTURE_DIAGRAM = `flowchart TB
  subgraph Navegador
    T[Tablero]
    R[Informe]
    D[Documentación]
  end
  CLI[CLI bm<br/>para agentes de IA]
  T & R & D & CLI --> API[API local<br/>127.0.0.1:8787]
  API --> DB[(SQLite<br/>cards, planes,<br/>revisiones, PR)]
  API --> J[Jira]
  API --> BB[Bitbucket]
  API --> GH[GitHub]
  API --> CC[Claude<br/>modo solo lectura]
  API --> KIT[Kit pr-review<br/>de esinergia]
  KIT --> REPO[Repositorios locales]
  CC --> REPO
  classDef ia fill:#022c22,stroke:#34d399,color:#f4f4f5
  class CC,KIT ia`
