-- Staging/Production visibility for every user-facing content record.
-- `projects.state` already stores its lifecycle (concept/development/etc.), so
-- the new user-facing "State" property is stored as `environment`.

alter table app_settings
  add column if not exists active_environment text not null default 'staging';

do $$
declare t text;
begin
  foreach t in array array[
    'projects',
    'project_people',
    'person_columns',
    'env_vars',
    'todos',
    'features',
    'details',
    'requests',
    'pipelines',
    'project_screenshots',
    'project_assets',
    'pipeline_items',
    'plan_items',
    'project_templates',
    'clients',
    'client_companies',
    'email_groups',
    'email_accounts',
    'project_credentials',
    'project_supabase'
  ] loop
    execute format(
      'alter table %I add column if not exists environment text not null default ''staging''',
      t
    );
    execute format('update %I set environment = ''staging'' where environment is null', t);
    begin
      execute format(
        'alter table %I add constraint %I check (environment in (''staging'', ''production''))',
        t,
        t || '_environment_check'
      );
    exception when duplicate_object then null;
    end;
    execute format('create index if not exists %I on %I (environment)', t || '_environment_idx', t);
  end loop;
end $$;

update app_settings
set active_environment = 'staging'
where id = 'default' and active_environment not in ('staging', 'production');

alter table app_settings
  drop constraint if exists app_settings_active_environment_check;
alter table app_settings
  add constraint app_settings_active_environment_check
  check (active_environment in ('staging', 'production'));
