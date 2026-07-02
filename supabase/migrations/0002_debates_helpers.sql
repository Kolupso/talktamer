-- TalkTamer — Phase 4 helpers.
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to run once.

-- ---------------------------------------------------------------------------
-- Every debate gets exactly one timer_state row, created automatically.
-- ---------------------------------------------------------------------------
create or replace function create_timer_state_for_debate()
returns trigger
language plpgsql
as $$
begin
  insert into timer_state (debate_id) values (new.id);
  return new;
end;
$$;

create trigger debates_create_timer_state
  after insert on debates
  for each row
  execute function create_timer_state_for_debate();

-- ---------------------------------------------------------------------------
-- Atomically switch the active debate. Unsetting others first avoids tripping
-- the one_active_debate unique index.
-- ---------------------------------------------------------------------------
create or replace function set_active_debate(target bigint)
returns void
language plpgsql
as $$
begin
  update debates set is_active = false where is_active and id <> target;
  update debates set is_active = true where id = target;
end;
$$;

grant execute on function set_active_debate(bigint) to authenticated;
