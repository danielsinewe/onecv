create index onecv_profile_revisions_profile_user_idx
  on public.onecv_profile_revisions (profile_id, user_id);

create index onecv_sync_runs_platform_account_user_idx
  on public.onecv_sync_runs (platform_account_id, user_id);
