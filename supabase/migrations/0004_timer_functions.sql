-- TalkTamer — Phase 6: timer control functions.
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to run once.
--
-- The timer is stored as state in timer_state; these functions use the SERVER
-- clock (now()) so elapsed time banked on pause is consistent across windows.

-- Start (or resume) the countdown for the current speaker.
create or replace function timer_start(p_debate_id bigint)
returns void
language plpgsql
as $$
begin
  update timer_state
    set status = 'running', started_at = now()
    where debate_id = p_debate_id
      and current_speaker_id is not null
      and status <> 'running';
end;
$$;

-- Pause: bank the elapsed seconds of the current running segment.
create or replace function timer_pause(p_debate_id bigint)
returns void
language plpgsql
as $$
begin
  update timer_state
    set accumulated_seconds = accumulated_seconds
          + case when status = 'running' and started_at is not null
                 then extract(epoch from (now() - started_at))
                 else 0 end,
        status = 'paused',
        started_at = null
    where debate_id = p_debate_id
      and status = 'running';
end;
$$;

-- Reset the current speaker's timer back to full duration.
create or replace function timer_reset(p_debate_id bigint)
returns void
language plpgsql
as $$
begin
  update timer_state
    set status = 'idle', started_at = null, accumulated_seconds = 0
    where debate_id = p_debate_id;
end;
$$;

-- Finalise the current speaker (log + count) and load the next from the queue.
-- Does NOT auto-start the countdown (status is left 'idle').
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

  -- 2. Pick the next waiting speaker (top non-skipped, by entry order).
  select wl.id as wl_id, wl.speaker_id,
         coalesce(dp.speak_count, 0) as speak_count
    into nxt
    from waiting_list wl
    left join debate_participation dp
      on dp.debate_id = wl.debate_id and dp.speaker_id = wl.speaker_id
    where wl.debate_id = p_debate_id and wl.skipped = false
    order by wl.entered_at asc, wl.id asc
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

  -- 3b. Load the next speaker; remove them from the waiting list.
  delete from waiting_list where id = nxt.wl_id;

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

grant execute on function timer_start(bigint)     to authenticated;
grant execute on function timer_pause(bigint)     to authenticated;
grant execute on function timer_reset(bigint)     to authenticated;
grant execute on function advance_speaker(bigint) to authenticated;
