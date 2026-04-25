# Overall System Architecture - Data Flow

Mermaid source for [dataflow-overall-architecture.svg](dataflow-overall-architecture.svg).

```mermaid
flowchart LR
  frontend["React Frontend\nVite\nPort 5173"]
  api["Express.js API Server\nPort 3000"]
  middleware["Middleware\nAuth, CORS, Error Handling"]
  postgres["PostgreSQL Database\nPort 5432"]
  redis["Redis Cache\nOptional\nPort 6379"]
  authRoutes["Auth Routes\n/signup\n/signin\n/password/*"]
  phoneRoutes["Phone Routes\nGET /phones\nPOST /phones\nDELETE /phones"]
  controllers["Controllers\nauthController\nphoneController\nownerController"]
  tables["Tables\nusers\nphones\npeople\nbusinesses\nrelations"]

  frontend -->|HTTP/REST| api
  api -->|Process| middleware
  middleware -->|Route| authRoutes
  middleware -->|Route| phoneRoutes
  authRoutes -->|Dispatch| controllers
  phoneRoutes -->|Dispatch| controllers
  controllers -->|SQL Query| postgres
  postgres -->|Result Set| api
  api -->|JSON Response| frontend
  api -.->|Cache (Optional)| redis
  controllers --- tables
```
