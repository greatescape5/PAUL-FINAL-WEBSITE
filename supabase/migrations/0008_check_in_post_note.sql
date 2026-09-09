-- ============================================================================
-- Flow Motion PT — CRM
-- 0008: separate post-meeting note on check-ins
-- ============================================================================
--
-- A scheduled check-in has two moments: what you jot down when scheduling it
-- (prep / pre-meeting) and what you record when completing it (outcome /
-- post-meeting). They used to be appended into one note field and ran
-- together. Give completion its own column so the two stay organized.
-- ============================================================================

alter table check_ins add column if not exists post_note text;
