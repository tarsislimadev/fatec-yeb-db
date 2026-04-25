# Backend API Endpoints

Mermaid source for [endpoints-backend-map.svg](endpoints-backend-map.svg).

```mermaid
flowchart TB
  subgraph auth[Authentication Endpoints /api/v1/auth]
    a1[POST /signup\nPublic\nemail, password, display_name] --> a2[201 Created\n{token, user_id}]
    a3[POST /signin\nPublic\nemail, password] --> a4[200 OK or 401 Unauthorized]
    a5[POST /signout\nProtected\nBearer token] --> a6[200 OK\n{message}]
    a7[POST /password/forgot\nPublic\nemail] --> a8[200 OK\nSends reset email]
    a9[POST /password/reset\nPublic\ntoken, password] --> a10[200 OK\nValidates reset token]
  end

  subgraph phones[Phone Endpoints /api/v1/phones]
    p1[GET /phones\nProtected\npagination, search, filters] --> p2[200 OK\n{data[], meta}]
    p3[POST /phones\nProtected\ne164_number, raw_number, type] --> p4[201 Created\n{phone}]
    p5[GET /phones/{id}\nProtected\nphone_id UUID] --> p6[200 OK or 404 Not Found]
    p7[PATCH /phones/{id}\nProtected\nstatus, type, is_primary] --> p8[200 OK\n{phone}]
    p9[DELETE /phones/{id}\nProtected\nsoft delete] --> p10[204 No Content or 404 Not Found]
  end

  subgraph owners[Phone-Owner Relations /api/v1/phones/:id/owners]
    o1[POST /owners\nProtected\nowner_id, owner_type, relationship] --> o2[201 Created\n{relation}]
    o3[DELETE /owners/{relId}\nProtected\nrelation_id UUID] --> o4[204 No Content or 404 Not Found]
  end
```
