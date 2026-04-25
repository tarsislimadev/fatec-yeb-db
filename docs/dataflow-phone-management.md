# Phone Management Data Flow

Mermaid source for [dataflow-phone-management.svg](dataflow-phone-management.svg).

```mermaid
flowchart LR
  subgraph list[GET /api/v1/phones - List All Phones]
    l1[Frontend Request List] --> l2[GET /phones with token]
    l2 --> l3[Auth Verify Token]
    l3 --> l4[listPhones Controller]
    l4 --> l5[SELECT * FROM phones\nWHERE deleted_at IS NULL]
  end

  subgraph create[POST /api/v1/phones - Create Phone]
    c1[Frontend Submit Form] --> c2[Parse Input\nphone_number / type]
    c2 --> c3[Validate Phone Format\nlibphonenumber]
    c3 --> c4[Check Duplicate E.164]
    c4 --> c5[createPhone Controller]
    c5 --> c6[INSERT INTO phones\n(values)]
  end

  subgraph detail[GET /api/v1/phones/:id - Get Phone Detail]
    d1[Frontend Click Detail] --> d2[GET /phones/{id}\n+ Auth Token]
    d2 --> d3[Validate Phone ID]
    d3 --> d4[getPhone Controller]
    d4 --> d5[SELECT phone by id\nAND deleted_at IS NULL]
    d5 -.-> d6[Optional JOIN\nphone_owner relations]
  end

  subgraph update[PATCH /api/v1/phones/:id - Update Phone]
    u1[Frontend Edit Form] --> u2[Parse Changes\nstatus / fields]
    u2 --> u3[PATCH /phones/{id}\n+ Auth Token]
    u3 --> u4[updatePhone Controller]
    u4 --> u5[UPDATE phones\nSET fields\nWHERE id = ?]
  end

  subgraph delete[DELETE /api/v1/phones/:id - Delete Phone]
    x1[Frontend Confirm Delete] --> x2[DELETE /phones/{id}]
    x2 --> x3[deletePhone Controller]
    x3 --> x4[Soft delete\nSET deleted_at = NOW()]
  end

  subgraph relations[Phone-Owner Relations]
    r1[POST /phones/{id}/owners\nAdd Owner] --> r2[INSERT INTO phone_owner relations]
    r3[DELETE /phones/{id}/owners/{relId}\nRemove Owner] --> r4[DELETE FROM phone_owner relations]
  end
```
