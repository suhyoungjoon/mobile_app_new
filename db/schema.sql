
-- Core tables (PostgreSQL dialect)
CREATE TABLE complex (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT
);

CREATE TABLE household (
  id SERIAL PRIMARY KEY,
  complex_id INTEGER REFERENCES complex(id),
  dong TEXT NOT NULL,
  ho TEXT NOT NULL,
  resident_name TEXT,
  phone TEXT
);

CREATE TABLE access_token (
  id SERIAL PRIMARY KEY,
  household_id INTEGER REFERENCES household(id),
  purpose TEXT CHECK (purpose IN ('precheck','postcheck')),
  token TEXT UNIQUE NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'active'
);

CREATE TABLE case_header (
  id TEXT PRIMARY KEY,
  household_id INTEGER REFERENCES household(id),
  type TEXT CHECK (type IN ('하자접수','추가접수')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE defect (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES case_header(id),
  location TEXT,
  trade TEXT,
  content TEXT,
  memo TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE photo (
  id TEXT PRIMARY KEY,
  defect_id TEXT REFERENCES defect(id),
  kind TEXT CHECK (kind IN ('near','far')),
  url TEXT,
  thumb_url TEXT,
  taken_at TIMESTAMP
);

CREATE TABLE report (
  id SERIAL PRIMARY KEY,
  household_id INTEGER REFERENCES household(id),
  case_id TEXT REFERENCES case_header(id),
  pdf_url TEXT,
  status TEXT CHECK (status IN ('created','sent','failed')),
  sent_to TEXT,
  sent_at TIMESTAMP
);

-- Useful indexes
CREATE INDEX idx_household_complex ON household(complex_id);
CREATE INDEX idx_case_household ON case_header(household_id);
CREATE INDEX idx_defect_case ON defect(case_id);
