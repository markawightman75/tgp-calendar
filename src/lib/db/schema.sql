-- Create tables for TGP Calendar app

-- Members table
create table if not exists members (
  id bigint primary key generated always as identity,
  name text not null,
  instrument text,
  email text unique,
  created_at timestamp with time zone default now()
);

-- Events table
create table if not exists events (
  id serial primary key,
  date date not null unique,
  event_type text not null default 'rehearsal' check (event_type in ('rehearsal', 'gig-confirmed', 'gig-unconfirmed', 'gig-available')),
  notes text,
  created_at timestamp with time zone default now()
);

-- Availability table
create table if not exists availability (
  id bigint primary key generated always as identity,
  member_id bigint not null references members(id) on delete cascade,
  event_id bigint not null references events(id) on delete cascade,
  status text not null default 'unknown' check (status in ('unknown', 'available', 'unavailable')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (member_id, event_id)
);

-- RLS Policies
-- Enable RLS on all tables
alter table members enable row level security;
alter table events enable row level security;
alter table availability enable row level security;

-- Allow public read access to all tables
create policy "Allow public read access to members"
  on members for select
  to anon, authenticated
  using (true);

create policy "Allow public read access to events"
  on events for select
  to anon, authenticated
  using (true);

create policy "Allow public read access to availability"
  on availability for select
  to anon, authenticated
  using (true);

-- Allow anonymous inserts and updates
create policy "Allow anonymous inserts to members" on members for insert with check (true);
create policy "Allow anonymous inserts to events" on events for insert with check (true);
create policy "Allow anonymous inserts to availability" on availability for insert with check (true);

create policy "Allow anonymous updates to members" on members for update using (true);
create policy "Allow anonymous updates to events" on events for update using (true);
create policy "Allow anonymous updates to availability" on availability for update using (true);

-- Insert 1 sample band member
insert into members (name, instrument) values
  ('John', 'Guitar');

-- Generate dates (Wednesdays, Fridays, and Saturdays until the end of 2025)
-- This would be done with a function in a real implementation
-- For now, we'll add a few sample dates
insert into events (date, event_type) values
  ('2025-06-25', 'rehearsal'),
  ('2025-06-27', 'rehearsal'),
  ('2025-06-28', 'gig'),
  ('2025-07-02', 'rehearsal'),
  ('2025-07-04', 'rehearsal'),
  ('2025-07-05', 'gig'),
  ('2025-07-09', 'rehearsal'),
  ('2025-07-11', 'rehearsal'),
  ('2025-07-12', 'gig');

-- Generate initial availability entries (all 'unknown')
-- In a real implementation, we would use a function to generate these
-- For now, we'll add a few sample entries
do $$
declare
  m_id bigint;
  e_id bigint;
begin
  for m_id in select id from members loop
    for e_id in select id from events loop
      insert into availability (member_id, event_id, status)
      values (m_id, e_id, 'unknown');
    end loop;
  end loop;
end $$;
