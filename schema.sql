-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Drop existing tables if they exist
drop table if exists employees;

-- Create employees table
create table employees (
  -- Core fields
  id text primary key,
  name text not null,
  email text not null unique,
  is_active boolean default true,
  employee_type text check (employee_type in ('intern', 'fulltime', 'consultant')),
  "group" text,

  -- Clockify integration
  clockify_id text unique,
  weekly_logs jsonb default '[]'::jsonb,
  active_workspace text,
  default_workspace text,
  status text,
  profile_picture text,

  -- Human Design fields
  birth_date text,
  birth_time text,
  birth_location jsonb,
  hd_type text,
  hd_authority text,
  hd_profile jsonb,
  hd_centers jsonb,
  hd_gates jsonb,
  hd_channels jsonb,
  hd_definition text,
  hd_incarnation_cross text,
  hd_variables jsonb,

  -- Metadata
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table employees enable row level security;

-- Create policies for secure access
create policy "Enable read access for authenticated users"
  on employees for select
  to authenticated
  using (true);

create policy "Enable insert for authenticated users"
  on employees for insert
  to authenticated
  with check (true);

create policy "Enable update for authenticated users"
  on employees for update
  to authenticated
  using (true);

-- Create function to automatically update the updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update the updated_at timestamp
create trigger update_employees_updated_at
    before update on employees
    for each row
    execute function update_updated_at_column();
