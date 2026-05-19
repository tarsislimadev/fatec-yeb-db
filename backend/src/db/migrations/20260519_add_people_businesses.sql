-- Add people_businesses join table
-- Links people to businesses with optional role/title metadata

CREATE TABLE IF NOT EXISTS people_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role_title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_people_businesses_person_id ON people_businesses(person_id);
CREATE INDEX IF NOT EXISTS idx_people_businesses_business_id ON people_businesses(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_people_businesses_unique_active
  ON people_businesses(person_id, business_id)
  WHERE deleted_at IS NULL;
