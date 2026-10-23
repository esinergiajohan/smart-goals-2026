<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:064e3b,100:1e1b4b&height=220&section=header&text=Branch%20Manager&fontSize=60&fontColor=ffffff&fontAlignY=36&desc=Del%20ticket%20de%20Jira%20al%20PR%20aprobado%20a%20la%20primera&descSize=20&descAlignY=58&animation=fadeIn" width="100%" alt="Branch Manager"/>

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js_24-339933?style=for-the-badge&logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Claude](https://img.shields.io/badge/Claude-D97757?style=for-the-badge&logo=anthropic&logoColor=white)
![pr-review](https://img.shields.io/badge/pr--review-esinergia-10B981?style=for-the-badge)

</div>

<table>
<tr>
<td width="58%" valign="top">

### 🧭 Qué es

Un tablero para llevar cada ticket de Jira hasta producción.
La IA **planifica** el ticket, **revisa el PR antes que el líder** y el tablero **mide** cuántos PR se aprueban a la primera.

<br/>

### ✅ 2 de 3 objetivos cumplidos

| | Objetivo | Resultado |
|:-:|---|:-:|
| ✅ | **Capa 2** · PR aprobados sin retrabajo | **86,7 %** <sub>meta 80 %</sub> |
| ✅ | **Capa 3** · Revisión previa con pr-review e IA | **−80 %** <sub>meta −80 %</sub> |
| ⏳ | **Capa 1** · Biblioteca de Site Studio | <sub>se reporta aparte</sub> |

<br/>

[![Informe](https://img.shields.io/badge/📊_Ver_informe-10B981?style=for-the-badge)](#-informe)
[![Documentación](https://img.shields.io/badge/📘_Documentación-4F46E5?style=for-the-badge)](#-documentación)
[![Técnico](https://img.shields.io/badge/⚙️_Técnico-27272A?style=for-the-badge)](#-técnico)

<sub>Datos de Bitbucket y GitHub al 22 de octubre de 2026.</sub>

</td>
<td width="42%" align="center" valign="top">

<img src="branch-client/public/docs/card.png" alt="Card de un ticket" width="300"/>

<sub><b>La card de un ticket</b></sub>

</td>
</tr>
</table>

<br/>

<table>
<tr>
<td align="center" width="25%"><h1>86,7 %</h1><sub>PR aprobados a la primera</sub></td>
<td align="center" width="25%"><h1>−80 %</h1><sub>aclaraciones del líder</sub></td>
<td align="center" width="25%"><h1>26 / 30</h1><sub>PR de octubre sin devolución</sub></td>
<td align="center" width="25%"><h1>4</h1><sub>proyectos medidos</sub></td>
</tr>
</table>

<br/>

### 🔎 Cómo leer las cifras

<table>
<tr>
<td width="33%" valign="top"><b>86,7 % · Aprobados sin retrabajo</b><br/><sub>De cada 100 PR que llegaron al líder, cuántos aprobó sin pedir cambios ni comentar.</sub></td>
<td width="33%" valign="top"><b>0,33 → 0,07 · Aclaraciones por PR</b><br/><sub>Dudas o correcciones del líder por PR: una cada 3 PR antes, una cada 15 ahora.</sub></td>
<td width="33%" valign="top"><b>−80 % · Reducción</b><br/><sub>Cuánto bajaron las aclaraciones del líder frente a septiembre.</sub></td>
</tr>
<tr>
<td valign="top"><b>pp · Puntos porcentuales</b><br/><sub>Diferencia directa entre porcentajes: de 55,6 % a 86,7 % son +31,1 pp.</sub></td>
<td valign="top"><b>★ Septiembre · Línea base</b><br/><sub>El mes de referencia, trabajado sin pr-review.</sub></td>
<td valign="top"><b>Devuelto</b><br/><sub>El revisor pidió cambios, comentó, hizo commits en la rama o lo rechazó.</sub></td>
</tr>
</table>

<br/>

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:064e3b,100:1e1b4b&height=2" width="100%"/>

# 📊 Informe

<table>
<tr>
<td width="50%" valign="top">

### Capa 2 · Aprobados sin retrabajo

```mermaid
xychart-beta
  x-axis ["★ Sept", "Oct"]
  y-axis "%" 0 --> 100
  bar [55.6, 86.7]
  line [80, 80]
```

<sub>La línea es la meta del 80 %.</sub>

</td>
<td width="50%" valign="top">

### Capa 3 · Aclaraciones por PR

```mermaid
xychart-beta
  x-axis ["★ Sept", "Oct"]
  y-axis "Aclaraciones" 0 --> 0.4
  bar [0.33, 0.07]
```

<sub>De 0,33 a 0,07: −80 %.</sub>

</td>
</tr>
<tr>
<td valign="top">

#### Por proyecto

| Proyecto | ★ Sept | Oct |
|---|:-:|:-:|
| **redsalud** | 🟩 2/2 | 🟩 **20/20** |
| **unisabana** | 🟥 1/3 | 🟨 **4/6** |
| **unbosque-portal** | 🟥 1/3 | 🟨 **2/4** |
| **fogafin** | 🟩 1/1 | — |
| **Total** | **55,6 %** | **86,7 %** |

</td>
<td valign="top">

#### 3 entregas comparadas

| ★ Septiembre · sin pr-review | | Octubre · con pr-review | |
|---|:-:|---|:-:|
| unbosque #110 | 🟥 1 | redsalud #1994 | 🟩 0 |
| unbosque #120 | 🟥 1 | redsalud #1992 | 🟩 0 |
| unisabana #409 | 🟥 1 | redsalud #1981 | 🟩 0 |
| **Aclaraciones** | **3** | | **0** |

</td>
</tr>
</table>

### 🤖 Uso de la IA

<table>
<tr>
<td width="33%" valign="top" align="center"><h3>1 · Al iniciar</h3>Claude lee el ticket desde Jira y deja el <b>plan de abordaje</b>.<br/><br/><code>Capa 3</code></td>
<td width="33%" valign="top" align="center"><h3>2 · Antes del PR</h3>pr-review y Claude <b>revisan la rama -test</b> y certifican.<br/><br/><code>Capa 3</code></td>
<td width="33%" valign="top" align="center"><h3>3 · Después del PR</h3>Se mide si el líder lo <b>aprobó a la primera</b>.<br/><br/><code>Capa 2</code></td>
</tr>
</table>

<details>
<summary><b>Objetivos completos y observaciones</b></summary>
<br/>

**Capa 2.** Lograr que al menos el 80 % de los pull requests de Git entre octubre y el 30 de noviembre de 2026, realizados con apoyo de IA, se aprueben sin retrabajo, comparándolo contra la línea base de septiembre registrada en Branch Manager.

**Capa 3.** Integrar en Branch Manager el código de pr-review de esinergia con un modelo de IA, para revisar el PR antes de que llegue al líder, y demostrar con 3 entregas comparadas una reducción de al menos 80 % en las aclaraciones.

**Capa 1.** Biblioteca de conocimiento de Site Studio en video, con calificación ≥ 4/5 de mínimo 6 desarrolladores. Se reporta aparte.

- **La prueba:** la aprobación a la primera del líder, registrada en Bitbucket y GitHub.
- **No cuentan:** los PR que el propio autor cerró sin revisión.
- **Devoluciones de octubre:** unbosque-portal #125 y #129 (comentarios) y unisabana #419 y #421 (ajustes del revisor).

</details>

<br/>

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:064e3b,100:1e1b4b&height=2" width="100%"/>

# 📘 Documentación

### 🔁 Flujo

```mermaid
flowchart LR
  A([Ticket en Jira]) --> C{{Plan<br/>Claude + pr-review}} --> D[Implementación] --> F{{Revisar -test<br/>pr-review + Claude}}
  F -. ajustes .-> D
  F --> G[PR a DEV y STG] --> H[Líder] --> I([Aprobado a la primera]) --> J[(Informe)]
  classDef ia fill:#022c22,stroke:#34d399,color:#f4f4f5
  classDef meta fill:#451a03,stroke:#fbbf24,color:#fcd34d
  class C,F ia
  class I,J meta
```

### 🧩 Anatomía de la card

<table>
<tr>
<td width="50%" align="center" valign="top">
<img src="branch-client/public/docs/card-header.png" width="100%"/><br/>
<b>1 · Encabezado</b><br/><sub>Clave, título, fechas y estado en Jira.</sub>
</td>
<td width="50%" align="center" valign="top">
<img src="branch-client/public/docs/card-featured.png" width="100%"/><br/>
<b>2 · Comentario destacado</b><br/><sub>Un comentario de Jira fijado a la vista.</sub>
</td>
</tr>
<tr>
<td align="center" valign="top">
<img src="branch-client/public/docs/card-plan.png" width="100%"/><br/>
<b>3 · Plan de abordaje</b> <code>Capa 3</code><br/><sub>Claude lee el ticket y propone criterios, pasos, riesgos y pruebas. Se publica en Jira como nota interna.</sub>
</td>
<td align="center" valign="top">
<img src="branch-client/public/docs/card-branches.png" width="100%"/><br/>
<b>4 · Ramas</b><br/><sub>Trabajo, DEV y STG; con «Release», las ramas unidas.</sub>
</td>
</tr>
<tr>
<td align="center" valign="top">
<img src="branch-client/public/docs/card-pull-requests.png" width="100%"/><br/>
<b>5 · Pull requests</b> <code>Capa 2</code><br/><sub>Cada PR con «Aprobado sin devolución», «Devuelto» o «Abierto».</sub>
</td>
<td align="center" valign="top">
<img src="branch-client/public/docs/card-review-history.png" width="100%"/><br/>
<b>6 · Revisión local</b> <code>Capa 3</code><br/><sub>«Revisar» simula el PR con pr-review + Claude y certifica.</sub>
</td>
</tr>
</table>

### 🤖 Agentes y servicios

<table>
<tr>
<td width="33%" valign="top"><b>🧠 Claude · Plan</b><br/><sub>Lee el ticket y el código y propone cómo abordarlo.</sub><br/><code>Generar plan</code> <code>Capa 3</code></td>
<td width="33%" valign="top"><b>🧪 Kit pr-review</b><br/><sub>Reúne la evidencia de la rama -test: diferencias, ramas y bloqueos.</sub><br/><code>Revisar</code> <code>Capa 3</code></td>
<td width="33%" valign="top"><b>🔍 Claude · Revisión</b><br/><sub>Aplica la política de pr-review en solo lectura y da el veredicto.</sub><br/><code>Revisar</code> <code>Capa 3</code></td>
</tr>
<tr>
<td valign="top"><b>🔏 Certificación</b><br/><sub>Firma el resultado con el commit exacto revisado.</sub><br/><code>Automática</code> <code>Capa 3</code></td>
<td valign="top"><b>🔀 Bitbucket y GitHub</b><br/><sub>Aprobaciones, cambios pedidos, comentarios y commits del revisor.</sub><br/><code>Sincronizar</code> <code>Capa 2</code></td>
<td valign="top"><b>📋 Jira</b><br/><sub>Tickets, comentarios y notas internas.</sub><br/><code>Buscador</code> <code>Plan</code></td>
</tr>
</table>

<details>
<summary><b>Qué pasa al pulsar «Revisar» y «Generar plan»</b></summary>

```mermaid
sequenceDiagram
  autonumber
  actor Tu as Tú
  participant API as Branch Manager
  participant Jira as Jira
  participant Kit as Kit pr-review
  participant IA as Claude
  Tu->>API: «Revisar»
  API->>Jira: Lee el ticket
  API->>Kit: Recopila la evidencia de la rama -test
  API->>IA: Aplica la política de pr-review
  IA-->>API: Veredicto, hallazgos y comentario
  API->>Kit: Certifica el resultado
  API-->>Tu: Nueva iteración en la card
```

```mermaid
sequenceDiagram
  autonumber
  actor Tu as Tú
  participant API as Branch Manager
  participant Jira as Jira
  participant IA as Claude
  Tu->>API: «Generar plan»
  API->>Jira: Lee ticket, historia, épica y comentarios
  API->>IA: Criterios de pr-review y código
  IA-->>API: Criterios, preguntas, pasos, riesgos y pruebas
  API-->>Tu: Plan en la card
  Tu->>API: «Publicar en Jira»
  API->>Jira: Nota interna con tu cuenta
```

</details>

### 🖥️ Tablero e informe

<table>
<tr>
<td width="50%" align="center" valign="top">
<img src="branch-client/public/docs/dashboard.png" width="100%"/><br/>
<b>Tablero</b><br/><sub>Buscador de Jira, cards, métrica del mes y tickets asignados.</sub>
</td>
<td width="50%" align="center" valign="top">
<img src="branch-client/public/docs/report.png" width="100%"/><br/>
<b>Informe</b> · <code>/informe</code><br/><sub>Los 3 objetivos, meses comparados y descarga en PDF y CSV.</sub>
</td>
</tr>
</table>

### ⌨️ CLI para agentes de IA

<table>
<tr>
<td width="50%" valign="top">

| Comando | Qué hace |
|---|---|
| `bm plan CLAVE --wait` | Plan de abordaje |
| `bm plan-publish CLAVE` | Publica el plan en Jira |
| `bm review CLAVE --wait` | Revisa la rama `-test` |

</td>
<td width="50%" valign="top">

| Comando | Qué hace |
|---|---|
| `bm prs CLAVE --sync` | PR del ticket y su resultado |
| `bm metrics --sync --detail` | Métrica con cada PR |
| `bm card add CLAVE` | Crea la card |

</td>
</tr>
</table>

<br/>

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:064e3b,100:1e1b4b&height=2" width="100%"/>

# 🔧 Técnico

<table>
<tr>
<td width="50%" valign="top">

### 🏗️ Arquitectura

```mermaid
flowchart TB
  UI[Tablero · Informe · Docs] --> API[API local]
  CLI[CLI bm] --> API
  API --> DB[(SQLite)]
  API --> J[Jira]
  API --> G[Bitbucket · GitHub]
  API --> IA[Claude<br/>solo lectura]
  API --> KIT[Kit pr-review]
  classDef ia fill:#022c22,stroke:#34d399,color:#f4f4f5
  class IA,KIT ia
```

</td>
<td width="50%" valign="top">

### 🚀 Instalación

```bash
cd branch-client
npm install
npm run dev
```

<sub>Tablero en <code>localhost:5173</code> · API en <code>127.0.0.1:8787</code></sub>

| Variable (`.env` raíz) | Para qué |
|---|---|
| `JIRA_BASE_URL` `JIRA_EMAIL` `JIRA_API_TOKEN` | Jira |
| `BRANCH_CLAUDE_CONFIG_DIR` | Cuenta de Claude |
| `BITBUCKET_ENV_FILE` | Bitbucket |
| `PR_REVIEW_KIT_HOME` | Kit pr-review |

<sub>GitHub usa la sesión de <code>gh</code>.</sub>

</td>
</tr>
<tr>
<td valign="top">

### 📁 Estructura

```
branch-client/
├── bin/bm.ts          CLI
├── server/            API local
│   ├── providers/     Bitbucket y GitHub
│   ├── review-runner  pr-review + Claude
│   └── plan-runner    Plan de abordaje
├── src/               React (atomic design)
└── public/docs/       Capturas
```

</td>
<td valign="top">

### 🔒 Seguridad

- 🏠 Todo corre **en local** (`127.0.0.1`).
- 👁️ La IA trabaja en **solo lectura**.
- 🔑 Las **credenciales** nunca llegan a la IA ni al navegador.
- 📝 Jira solo recibe **notas internas**, con confirmación.

</td>
</tr>
</table>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:1e1b4b,100:064e3b&height=120&section=footer&text=esinergia%20S.A.S.%20·%202026&fontSize=18&fontColor=ffffff&fontAlignY=72" width="100%"/>
