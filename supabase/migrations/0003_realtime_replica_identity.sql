-- TalkTamer — Phase 5 fix.
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to run once.
--
-- Filtered Realtime subscriptions (e.g. debate_id=eq.X) drop DELETE events,
-- because by default a delete only reports the row's primary key — so the
-- filter column (debate_id) is absent and the event can't match.
-- REPLICA IDENTITY FULL makes deletes report the whole old row, so filtered
-- DELETE events are delivered. Needed for the waiting list to disappear live.

alter table waiting_list         replica identity full;
alter table debate_participation replica identity full;
alter table timer_state          replica identity full;
alter table debates              replica identity full;
