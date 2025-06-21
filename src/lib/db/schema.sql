-- Create tables for TGP Calendar app

-- Members table
create table if not exists members (
  id bigint primary key generated always as identity,
  name text not null,
  instrument text,
  email text unique,
  created_at timestamp with time zone default now()
);

-- Dates table
create table if not exists dates (
  id bigint primary key generated always as identity,
  date date not null unique,
  day_type text not null check (day_type in ('wednesday', 'friday', 'saturday')),
  event_type text not null default 'rehearsal' check (event_type in ('rehearsal', 'gig')),
  notes text,
  created_at timestamp with time zone default now()
);

-- Availability table
create table if not exists availability (
  id bigint primary key generated always as identity,
  member_id bigint not null references members(id) on delete cascade,
  date_id bigint not null references dates(id) on delete cascade,
  status text not null default 'unknown' check (status in ('unknown', 'available', 'unavailable')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (member_id, date_id)
);

-- RLS Policies
-- Enable RLS on all tables
alter table members enable row level security;
alter table dates enable row level security;
alter table availability enable row level security;

-- Allow public read access to all tables
create policy "Allow public read access to members"
  on members for select
  to anon, authenticated
  using (true);

create policy "Allow public read access to dates"
  on dates for select
  to anon, authenticated
  using (true);

create policy "Allow public read access to availability"
  on availability for select
  to anon, authenticated
  using (true);

-- Allow public insert and update access to availability
create policy "Allow public insert access to availability"
  on availability for insert
  to anon, authenticated
  with check (true);

create policy "Allow public update access to availability"
  on availability for update
  to anon, authenticated
  using (true);

-- Sample data for testing
-- Insert 10 band members
insert into members (name, instrument) values
  ('John', 'Guitar'),
  ('Mary', 'Vocals'),
  ('Mike', 'Drums'),
  ('Sarah', 'Bass'),
  ('Tom', 'Keyboard'),
  ('Lisa', 'Saxophone'),
  ('David', 'Trumpet'),
  ('Emma', 'Violin'),
  ('Alex', 'Percussion'),
  ('Olivia', 'Flute');

-- Generate dates (Wednesdays, Fridays, and Saturdays until the end of 2025)
-- This would be done with a function in a real implementation
-- For now, we'll add a few sample dates
insert into dates (date, day_type, event_type) values
  ('2025-06-25', 'wednesday', 'rehearsal'),
  ('2025-06-27', 'friday', 'rehearsal'),
  ('2025-06-28', 'saturday', 'gig'),
  ('2025-07-02', 'wednesday', 'rehearsal'),
  ('2025-07-04', 'friday', 'rehearsal'),
  ('2025-07-05', 'saturday', 'gig'),
  ('2025-07-09', 'wednesday', 'rehearsal'),
  ('2025-07-11', 'friday', 'rehearsal'),
  ('2025-07-12', 'saturday', 'gig');

-- Generate initial availability entries (all 'unknown')
-- In a real implementation, we would use a function to generate these
-- For now, we'll add a few sample entries
do $$
declare
  m_id bigint;
  d_id bigint;
begin
  for m_id in select id from members loop
    for d_id in select id from dates loop
      insert into availability (member_id, date_id, status)
      values (m_id, d_id, 'unknown');
    end loop;
  end loop;
end $$;
