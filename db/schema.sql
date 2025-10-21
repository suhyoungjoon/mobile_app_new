
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
  phone TEXT,
  user_type TEXT DEFAULT 'resident' CHECK (user_type IN ('resident','company','admin'))
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
  type TEXT CHECK (type IN ('하자접수','추가접수','장비점검','종합점검')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE defect (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES case_header(id),
  location TEXT,
  trade TEXT,
  content TEXT,
  memo TEXT,
  photo_near TEXT,
  photo_far TEXT,
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

-- Admin tables
CREATE TABLE admin_user (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  last_login TIMESTAMP
);

CREATE TABLE defect_resolution (
  id SERIAL PRIMARY KEY,
  defect_id TEXT REFERENCES defect(id),
  admin_user_id INTEGER REFERENCES admin_user(id),
  memo TEXT,
  contractor TEXT,
  worker TEXT,
  cost INTEGER,
  resolution_photos TEXT[], -- Array of photo filenames
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Useful indexes
CREATE INDEX idx_household_complex ON household(complex_id);
CREATE INDEX idx_case_household ON case_header(household_id);
CREATE INDEX idx_defect_case ON defect(case_id);
CREATE INDEX idx_resolution_defect ON defect_resolution(defect_id);
CREATE INDEX idx_admin_email ON admin_user(email);

-- Equipment inspection tables (Phase 1)
CREATE TABLE inspection_item (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES case_header(id),
  type TEXT CHECK (type IN ('thermal','air','radon','level')),
  location TEXT NOT NULL,
  trade TEXT,
  note TEXT,
  result TEXT CHECK (result IN ('normal','check','na')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE air_measure (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  tvoc DECIMAL(5,2),
  hcho DECIMAL(5,2),
  co2 DECIMAL(5,2),
  unit_tvoc TEXT DEFAULT 'mg/m³',
  unit_hcho TEXT DEFAULT 'mg/m³',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE radon_measure (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  radon DECIMAL(8,2),
  unit_radon TEXT CHECK (unit_radon IN ('Bq/m³','pCi/L')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE level_measure (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  left_mm DECIMAL(5,1),
  right_mm DECIMAL(5,1),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE thermal_photo (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  file_url TEXT NOT NULL,
  caption TEXT,
  shot_at TIMESTAMP DEFAULT now()
);

-- Additional indexes for equipment inspection
CREATE INDEX idx_inspection_case ON inspection_item(case_id);
CREATE INDEX idx_inspection_type ON inspection_item(type);
CREATE INDEX idx_air_measure_item ON air_measure(item_id);
CREATE INDEX idx_radon_measure_item ON radon_measure(item_id);
CREATE INDEX idx_level_measure_item ON level_measure(item_id);
CREATE INDEX idx_thermal_photo_item ON thermal_photo(item_id);
