# HTTP Request/Response Cycle

Mermaid source for [dataflow-request-response.svg](dataflow-request-response.svg).

```mermaid
flowchart LR
  subgraph request[Request Flow]
    r1[Browser Client\n(React)] --> r2[Build HTTP Request\nmethod, path, headers, JSON body]
    r2 --> r3[Network Transmission]
    r3 --> r4[Express.js Server Receives]
    r4 --> r5[Parse Request\nbody, headers, query, params]
  end

  subgraph processing[Processing Flow]
    p1[Route Matching\nExpress Router] --> p2[Middleware\nCORS, auth, rate limit, validation]
    p2 --> p3[Controller Handler Logic]
    p3 --> p4[Database Query\nSELECT, INSERT, UPDATE, DELETE]
    p4 --> p5[Database Returns Result Set]
  end

  subgraph response[Response Flow]
    s1[Build Response\nstatus, headers, JSON body] --> s2[Error Check\n4xx / 5xx if needed]
    s2 --> s3[Serialize to JSON]
    s3 --> s4[Send HTTP Response]
    s4 --> s5[Network Transmission]
    s5 --> s6[Browser Receives Response]
    s6 --> s7[Update UI\nRe-render and display data]
  end

  r5 --> p1
  p5 --> s1
```
