# System diagrams

Mermaid diagrams for the Learning Speaking App. They match the App Router structure under `src/app`, the pipeline in `src/lib/pipeline`, and auth in `src/features/auth`.

## End-to-end data flow (recording → dashboard)

```mermaid
flowchart TB
  subgraph Client["Browser (React 19)"]
    UI[Record / Dashboard UI]
  end
  subgraph Next["Next.js App Router"]
    API_S["POST /api/sessions"]
    API_I["POST /api/internal/process"]
    API_D["GET /api/dashboard"]
  end
  subgraph Storage["Cloudflare R2"]
    R2[(Temporary audio objects)]
  end
  subgraph Queue["Upstash QStash"]
    Q[Signed webhook delivery]
  end
  subgraph AI["External APIs"]
    W[OpenAI Whisper]
    C[Anthropic Claude]
  end
  subgraph Data["Neon Postgres via Prisma"]
    PG[(Sessions, metrics, drills)]
  end

  UI --> API_S
  API_S --> R2
  API_S --> Q
  Q --> API_I
  API_I --> R2
  API_I --> W
  W --> C
  API_I --> PG
  API_I -. delete audio .-> R2
  UI --> API_D
  API_D --> PG
```

## Authentication flow (OIDC + session cookie)

```mermaid
sequenceDiagram
  participant U as User
  participant B as Browser
  participant A as Next.js app
  participant I as Auth server (OIDC)

  U->>B: Sign in
  B->>A: Start Auth.js sign-in
  A->>I: OIDC authorize (PKCE)
  I->>B: Redirect with authorization code
  B->>A: Callback route exchanges code
  A->>B: Set session cookie (JWT)
  Note over B,A: Subsequent API calls send cookie; middleware validates access to /app routes

  U->>B: Federated sign-out
  B->>A: GET /api/auth/federated-signout
  A->>B: Clear Auth.js cookies, redirect to IdP logout
  I->>B: Logout complete → APP_URL
```

## Drill training flow

```mermaid
flowchart LR
  D[Dashboard metric card] --> S[User selects focus metric]
  S --> G[POST /api/drills — generateDrill + DrillAttempt row]
  G --> V[DrillView — prompt / record / submit]
  V --> P[POST /api/drills/id/complete — multipart audio]
  P --> T[Whisper transcript]
  T --> E[evaluateDrill — Claude feedback]
  E --> DB[(DrillAttempt updated)]
  DB --> H[History + stats in GET /api/drills]
```
