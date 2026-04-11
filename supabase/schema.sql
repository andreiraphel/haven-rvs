-- ============================================================
-- HAVEN-RVS CLEAN DATABASE SCHEMA (REDO VERSION)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── 1. PROFILES (AUTH) ─────────────────────────────────────
-- This table is required for the auth trigger to work and store user metadata.
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  first_name text,
  last_name text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile" 
  on profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on profiles for update 
  using (auth.uid() = id);

-- Trigger for new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (new.id, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid duplication errors
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. RISK WEIGHTS (CONFIGURATION) ────────────────────────
create table if not exists risk_weights (
  id uuid primary key default uuid_generate_v4(),
  weights jsonb not null,
  active boolean default true,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id) on delete cascade
);

alter table risk_weights enable row level security;

-- Anyone can read weights (needed for ML backend anon pulls)
create policy "Anyone can read weights" 
  on risk_weights for select 
  using (true);

-- Only authenticated users can insert
create policy "Authenticated users can insert weights" 
  on risk_weights for insert 
  to authenticated 
  with check (true);

-- Seed default weights if table is empty
do $$
begin
  if not exists (select 1 from risk_weights) then
    insert into risk_weights (weights, active)
    values (
      '{
        "hazard": {
          "earthquake_intensity": 0.0578, "fault_distance": 0.4020, "seismic_source": 0.1455, "liquefaction": 0.3947,
          "wind_speed": 0.6586, "terrain": 0.3414,
          "flood": 0.3576, "storm_surge": 0.2332, "slope": 0.0508, "elevation": 0.0681, "water_distance": 0.0762, "runoff": 0.0920, "base_height": 0.0478, "drainage": 0.0742
        },
        "exposure": {
          "b11": 0.159, "b12": 0.168, "b13": 0.344, "b14": 0.329,
          "b21": 0.401, "b22": 0.125, "b23": 0.093, "b24": 0.158, "b25": 0.223,
          "b31": 0.378, "b32": 0.217, "b33": 0.133, "b34": 0.272,
          "b41": 0.244, "b42": 0.361, "b43": 0.115, "b44": 0.280
        },
        "vulnerability": {
          "building_code": 0.092, "plan_irregularity": 0.053, "vertical_irregularity": 0.057, "building_proximity": 0.063,
          "stories": 0.031, "material": 0.098, "bays": 0.051, "column_spacing": 0.082,
          "enclosure": 0.146, "wall_material": 0.113, "framing": 0.102, "flooring": 0.069,
          "crack": 0.158, "settlement": 0.147, "deformations": 0.213, "finishing": 0.124, "decay": 0.133, "loads": 0.225,
          "roof_design": 0.344, "roof_slope": 0.424, "roof_material": 0.232,
          "roof_fastener_type": 0.632, "roof_fastener_dist": 0.368
        }
      }'::jsonb,
      true
    );
  end if;
end $$;

-- ── 3. BUILDINGS ───────────────────────────────────────────
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
  created_by       uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── 4. HAZARD INDICATORS ───────────────────────────────────
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
  flood_susceptibility    text,
  storm_surge_height      text,
  slope_degrees           text,
  elevation_m             double precision,
  distance_to_water_m     double precision,
  water_body_name         text,
  surface_runoff          text,
  base_height             text,
  drainage_system         text,
  created_at              timestamptz default now()
);

-- ── 5. VULNERABILITY INDICATORS ────────────────────────────
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

-- ── 6. EXPOSURE INDICATORS (HERITAGE VALUE) ───────────────
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

-- ── 7. RISK RESULTS (ML PRIMARY) ──────────────────────────
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
  assessed_by          uuid not null references auth.users(id) on delete cascade
);

-- ── 8. AUDIT TRAIL ─────────────────────────────────────────
create table if not exists questionnaire_responses (
  id          uuid primary key default uuid_generate_v4(),
  building_id uuid not null references buildings(id) on delete cascade,
  step        text,
  response    jsonb,
  created_at  timestamptz default now()
);

-- ── 9. SECURITY (RLS) ──────────────────────────────────────
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

-- ── 10. TRIGGERS ────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger buildings_updated_at
  before update on buildings
  for each row execute function update_updated_at();
