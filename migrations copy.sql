-- Create time_entries table
create table if not exists time_entries (
  id uuid default uuid_generate_v4() primary key,
  employee_id text not null,
  clockify_entry_id text not null unique,
  description text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  duration text,
  billable boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes for better query performance
create index if not exists idx_time_entries_employee_id on time_entries(employee_id);
create index if not exists idx_time_entries_start_time on time_entries(start_time);

-- Enable RLS
alter table time_entries enable row level security;

-- Create policies
create policy "Enable read access for authenticated users"
  on time_entries for select
  to authenticated
  using (true);

create policy "Enable insert for authenticated users"
  on time_entries for insert
  to authenticated
  with check (true);

create policy "Enable update for authenticated users"
  on time_entries for update
  to authenticated
  using (true);

-- Add trigger for updated_at
create trigger update_time_entries_updated_at
    before update on time_entries
    for each row
    execute function update_updated_at_column();
