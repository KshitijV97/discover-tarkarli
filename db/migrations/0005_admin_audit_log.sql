-- Audit trail for staff and admin actions: booking status changes, manual
-- payments, notes, settings saves, room and menu edits, notification resends.
-- tenant_id is here from day one (see docs/multi-tenancy.md); it becomes a
-- reference to tenants(id) when tenancy lands.
create table admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   text not null default 'default',
  actor_email text not null,
  action      text not null,        -- e.g. 'booking.check_in', 'payment.manual', 'settings.save'
  entity      text not null,        -- 'booking' | 'settings' | 'room' | 'menu_item' | 'notification'
  entity_id   text,
  detail      jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index admin_audit_log_entity_idx on admin_audit_log (entity, entity_id, created_at desc);
create index admin_audit_log_created_idx on admin_audit_log (created_at desc);
alter table admin_audit_log enable row level security;
