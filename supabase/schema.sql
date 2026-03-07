-- ============================================================
-- HAVEN-RVS CLEAN DATABASE SCHEMA (REDO VERSION)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── 1. BUILDINGS ───────────────────────────────────────────
create table if not exists buildings (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  unique_code      text unique not null,
  address          text,
  municipality     text,
  province         text,
  latitude         double precision,
  longitude        double precision,
  building_type    text,
  building_use     text,
  year_built       integer,
  number_of_floors integer,
  photo_urls       text[],        
  created_by       uuid not null references auth.users(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── 2. HAZARD INDICATORS ───────────────────────────────────
create table if not exists hazard_indicators (
  id                      uuid primary key default uuid_generate_v4(),
  building_id             uuid not null references buildings(id) on delete cascade,
  earthquake_intensity    text,
  fault_distance_km       double precision,
  fault_name              text,
  seismic_source_type     double precision,
  potential_liquefaction  text,
  basic_wind_speed_kph    double precision,
  terrain                 text,
  slope_degrees           text,
  elevation_m             double precision,
  distance_to_water_m     double precision,
  water_body_name         text,
  surface_runoff          text,
  base_height             text,
  drainage_system         text,
  created_at              timestamptz default now()
);

-- ── 3. VULNERABILITY INDICATORS ────────────────────────────
create table if not exists vulnerability_indicators (
  id                         uuid primary key default uuid_generate_v4(),
  building_id                uuid not null references buildings(id) on delete cascade,
  building_code              text,
  plan_irregularity          text,
  vertical_irregularity      text,
  building_proximity         text,
  number_of_stories          integer,
  structural_material        text,
  number_of_bays             integer,
  column_spacing_m           double precision,
  building_enclosure         text,
  wall_material              text,
  structural_framing_type    text,
  flooring_material          text,
  maximum_crack              text,
  uneven_settlement          boolean default false,
  beam_column_deformations   boolean default false,
  finishing_condition        boolean default false,
  decay_of_structural_member boolean default false,
  additional_loads           boolean default false,
  roof_design                text,
  roof_slope                 text,
  roofing_material           text,
  roof_fastener              text,
  roof_fastener_distance_mm  double precision,
  created_at                 timestamptz default now()
);

-- ── 4. EXPOSURE INDICATORS (HERITAGE VALUE) ───────────────
create table if not exists exposure_indicators (
  id                      uuid primary key default uuid_generate_v4(),
  building_id             uuid not null references buildings(id) on delete cascade,
  -- B1 Architectural
  b11                     integer default 2,
  b12                     integer default 2,
  b13                     integer default 2,
  b14                     integer default 2,
  -- B2 Historical
  b21                     integer default 2,
  b22                     integer default 2,
  b23                     integer default 2,
  b24                     integer default 2,
  b25                     integer default 2,
  -- B3 Social
  b31                     integer default 2,
  b32                     integer default 2,
  b33                     integer default 2,
  b34                     integer default 2,
  -- B4 Socio-Econ
  b41                     integer default 2,
  b42                     integer default 2,
  b43                     integer default 2,
  b44                     integer default 2,
  created_at              timestamptz default now()
);

-- ── 5. RISK RESULTS (ML PRIMARY) ──────────────────────────
create table if not exists risk_results (
  id                   uuid primary key default uuid_generate_v4(),
  building_id          uuid not null references buildings(id) on delete cascade,
  risk_index           double precision not null,
  risk_description     text not null check (risk_description in ('LOW RISK','MODERATE RISK','HIGH RISK')),
  hazard_rating        double precision,
  vulnerability_rating double precision,
  exposure_rating      double precision,
  risk_rating          double precision,
  ml_prediction        double precision,
  manual_index         double precision,
  narrative            text,
  ai_course_of_action  text,
  assessed_at          timestamptz default now(),
  assessed_by          uuid not null references auth.users(id)
);

-- ── 6. AUDIT TRAIL ─────────────────────────────────────────
create table if not exists questionnaire_responses (
  id          uuid primary key default uuid_generate_v4(),
  building_id uuid not null references buildings(id) on delete cascade,
  step        text,
  response    jsonb,
  created_at  timestamptz default now()
);

-- ── 7. SECURITY (RLS) ──────────────────────────────────────
alter table buildings enable row level security;
alter table hazard_indicators enable row level security;
alter table vulnerability_indicators enable row level security;
alter table exposure_indicators enable row level security;
alter table risk_results enable row level security;
alter table questionnaire_responses enable row level security;

-- Policies
create policy "Users can manage their own buildings" on buildings for all to authenticated using (auth.uid() = created_by);

create policy "Users can manage hazard" on hazard_indicators for all to authenticated 
using (exists (select 1 from buildings where id = building_id and created_by = auth.uid()));

create policy "Users can manage vulnerability" on vulnerability_indicators for all to authenticated 
using (exists (select 1 from buildings where id = building_id and created_by = auth.uid()));

create policy "Users can manage exposure" on exposure_indicators for all to authenticated 
using (exists (select 1 from buildings where id = building_id and created_by = auth.uid()));

create policy "Users can manage results" on risk_results for all to authenticated 
using (exists (select 1 from buildings where id = building_id and created_by = auth.uid()));

create policy "Users can manage responses" on questionnaire_responses for all to authenticated 
using (exists (select 1 from buildings where id = building_id and created_by = auth.uid()));

-- ── 8. TRIGGERS ────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger buildings_updated_at
  before update on buildings
  for each row execute function update_updated_at();
