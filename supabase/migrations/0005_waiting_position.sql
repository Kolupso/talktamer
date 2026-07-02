-- TalkTamer — Phase 7: persisted waiting-list order.
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to run once.
-- (Supabase may warn about "destructive operations" because the function bodies
--  contain update/delete — that is expected; running this only defines them.)

-- ---------------------------------------------------------------------------
-- position: the authoritative display order (1..N). Positions 1 & 2 are the
-- "locked" slots. The client computes the order (see src/lib/ordering.ts) and
-- persists it via reorder_waiting(); displays and advance_speaker just read it.
-- ---------------------------------------------------------------------------
alter table waiting_list add column if not exists position int not null default 0;

-- Initialise any existing rows by their entry order.
with ordered as (
  select id,
         row_number() over (partition by debate_id order by entered_at, id) as rn
  from waiting_list
)
update waiting_list w set position = o.rn from ordered o where w.id = o.id;

-- ---------------------------------------------------------------------------
-- Persist a computed order: p_ids is the waiting_list ids in the desired order.
-- ---------------------------------------------------------------------------
create or replace function reorder_waiting(p_debate_id bigint, p_ids bigint[])
returns void
language plpgsql
as $$
begin
  update waiting_list w
    set position = u.ord
    from unnest(p_ids) with ordinality as u(id, ord)
    where w.id = u.id and w.debate_id = p_debate_id;
end;
$$;

grant execute on function reorder_waiting(bigint, bigint[]) to authenticated;

-- ---------------------------------------------------------------------------
-- advance_speaker: now selects the next speaker by position (top non-skipped)
-- and renumbers the remaining rows so positions stay contiguous.
-- ---------------------------------------------------------------------------
create or replace function advance_speaker(p_debate_id bigint)
returns void
language plpgsql
as $$
declare
  ts       timer_state%rowtype;
  elapsed  numeric;
  cur_name text;
  cur_gen  gender;
  nxt      record;
begin
  select * into ts from timer_state where debate_id = p_debate_id for update;
  if not found then
    raise exception 'No timer_state for debate %', p_debate_id;
  end if;

  -- 1. Finalise the outgoing speaker, if any.
  if ts.current_speaker_id is not null then
    elapsed := ts.accumulated_seconds
             + case when ts.status = 'running' and ts.started_at is not null
                    then extract(epoch from (now() - ts.started_at))
                    else 0 end;

    select name, gender into cur_name, cur_gen
      from speakers where id = ts.current_speaker_id;

    insert into speech_log (
      debate_id, speaker_id, speaker_name, speaker_gender,
      was_first_time, allotted_seconds, spoke_seconds, removed
    ) values (
      p_debate_id, ts.current_speaker_id,
      coalesce(cur_name, '(deleted speaker)'), coalesce(cur_gen, 'man'),
      coalesce(ts.current_is_first_time, false),
      ts.duration_seconds, round(elapsed), false
    );

    update debate_participation
      set speak_count = speak_count + 1
      where debate_id = p_debate_id and speaker_id = ts.current_speaker_id;
  end if;

  -- 2. Pick the next waiting speaker: top non-skipped by position.
  select wl.id as wl_id, wl.speaker_id, wl.position,
         coalesce(dp.speak_count, 0) as speak_count
    into nxt
    from waiting_list wl
    left join debate_participation dp
      on dp.debate_id = wl.debate_id and dp.speaker_id = wl.speaker_id
    where wl.debate_id = p_debate_id and wl.skipped = false
    order by wl.position asc
    limit 1;

  -- 3a. No one waiting → clear the current speaker.
  if nxt.wl_id is null then
    update timer_state
      set current_speaker_id = null, current_is_first_time = null,
          duration_seconds = 0, status = 'idle',
          started_at = null, accumulated_seconds = 0
      where debate_id = p_debate_id;
    return;
  end if;

  -- 3b. Load the next speaker; remove them and close the position gap.
  delete from waiting_list where id = nxt.wl_id;
  update waiting_list
    set position = position - 1
    where debate_id = p_debate_id and position > nxt.position;

  update timer_state
    set current_speaker_id = nxt.speaker_id,
        current_is_first_time = (nxt.speak_count = 0),
        duration_seconds = case when nxt.speak_count = 0
                                then d.first_time_seconds
                                else d.multi_time_seconds end,
        status = 'idle', started_at = null, accumulated_seconds = 0
    from debates d
    where timer_state.debate_id = p_debate_id and d.id = p_debate_id;
end;
$$;
