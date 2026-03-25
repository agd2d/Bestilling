-- Procurement module foundation for Kundedashboard
-- This schema is designed to plug into the existing `customers` table.

create extension if not exists pgcrypto;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  order_email text,
  confirmation_email text,
  delivery_email text,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists suppliers_name_key on public.suppliers (lower(name));

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  product_number text not null,
  name text not null,
  default_price numeric(12,2),
  unit text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_product_number_key unique (product_number)
);

create index if not exists products_supplier_id_idx on public.products (supplier_id);
create index if not exists products_name_idx on public.products (name);

create table if not exists public.customer_product_prices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_product_prices_customer_product_key unique (customer_id, product_id)
);

create index if not exists customer_product_prices_customer_id_idx on public.customer_product_prices (customer_id);
create index if not exists customer_product_prices_product_id_idx on public.customer_product_prices (product_id);

create table if not exists public.customer_import_aliases (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  source text not null,
  alias_value text not null,
  created_at timestamptz not null default now(),
  constraint customer_import_aliases_source_alias_key unique (source, alias_value)
);

create index if not exists customer_import_aliases_customer_id_idx on public.customer_import_aliases (customer_id);

create table if not exists public.customer_order_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  source text not null default 'jotform',
  source_submission_id text,
  status text not null default 'created',
  submitted_by_name text,
  submitted_by_email text,
  location_label text not null,
  delivery_address text,
  requested_delivery_date date,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz,
  cancelled_at timestamptz,
  constraint customer_order_requests_status_check check (
    status in (
      'created',
      'sent_to_supplier',
      'supplier_confirmed',
      'partially_delivered',
      'delivered',
      'cancelled'
    )
  )
);

create unique index if not exists customer_order_requests_source_key
  on public.customer_order_requests (source, source_submission_id)
  where source_submission_id is not null;

create index if not exists customer_order_requests_customer_id_idx on public.customer_order_requests (customer_id);
create index if not exists customer_order_requests_status_idx on public.customer_order_requests (status);
create index if not exists customer_order_requests_created_at_idx on public.customer_order_requests (created_at desc);

create table if not exists public.customer_order_request_lines (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.customer_order_requests(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  line_number integer not null,
  raw_product_number text,
  raw_product_name text,
  quantity numeric(12,2) not null,
  unit text,
  resolved_product_number text,
  resolved_product_name text,
  price_for_stats numeric(12,2),
  line_status text not null default 'created',
  needs_action boolean not null default false,
  action_reason text,
  draft_product_suggestion jsonb,
  customer_label_snapshot text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint customer_order_request_lines_status_check check (
    line_status in (
      'created',
      'draft_needed',
      'ready_for_purchase',
      'included_in_purchase_order',
      'supplier_confirmed',
      'partially_delivered',
      'delivered',
      'cancelled'
    )
  ),
  constraint customer_order_request_lines_request_line_key unique (request_id, line_number)
);

create index if not exists customer_order_request_lines_request_id_idx on public.customer_order_request_lines (request_id);
create index if not exists customer_order_request_lines_product_id_idx on public.customer_order_request_lines (product_id);
create index if not exists customer_order_request_lines_supplier_id_idx on public.customer_order_request_lines (supplier_id);
create index if not exists customer_order_request_lines_status_idx on public.customer_order_request_lines (line_status);
create index if not exists customer_order_request_lines_needs_action_idx on public.customer_order_request_lines (needs_action);

create table if not exists public.order_labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  created_at timestamptz not null default now(),
  constraint order_labels_name_key unique (name)
);

create table if not exists public.request_label_links (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.customer_order_requests(id) on delete cascade,
  label_id uuid not null references public.order_labels(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint request_label_links_request_label_key unique (request_id, label_id)
);

create index if not exists request_label_links_request_id_idx on public.request_label_links (request_id);
create index if not exists request_label_links_label_id_idx on public.request_label_links (label_id);

create table if not exists public.order_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.customer_order_requests(id) on delete cascade,
  author_user_id uuid,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists order_notes_request_id_idx on public.order_notes (request_id, created_at desc);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  created_by_user_id uuid,
  status text not null default 'draft',
  email_subject text,
  email_body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  supplier_reference text,
  constraint purchase_orders_status_check check (
    status in ('draft', 'ready_to_send', 'sent', 'partially_delivered', 'completed', 'cancelled')
  )
);

create index if not exists purchase_orders_supplier_id_idx on public.purchase_orders (supplier_id);
create index if not exists purchase_orders_status_idx on public.purchase_orders (status);
create index if not exists purchase_orders_created_at_idx on public.purchase_orders (created_at desc);

create table if not exists public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  request_line_id uuid not null references public.customer_order_request_lines(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  quantity numeric(12,2) not null,
  unit text,
  line_status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_order_lines_status_check check (
    line_status in ('draft', 'sent', 'confirmed', 'partially_delivered', 'delivered', 'cancelled')
  ),
  constraint purchase_order_lines_request_line_key unique (purchase_order_id, request_line_id)
);

create index if not exists purchase_order_lines_purchase_order_id_idx on public.purchase_order_lines (purchase_order_id);
create index if not exists purchase_order_lines_request_line_id_idx on public.purchase_order_lines (request_line_id);
create index if not exists purchase_order_lines_customer_id_idx on public.purchase_order_lines (customer_id);

create table if not exists public.supplier_mail_inbox (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  message_id text not null,
  thread_id text,
  from_email text,
  from_name text,
  subject text,
  received_at timestamptz not null,
  mail_type text not null default 'unknown',
  match_status text not null default 'unmatched',
  review_status text not null default 'pending',
  raw_payload jsonb,
  parsed_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid,
  constraint supplier_mail_inbox_message_id_key unique (message_id),
  constraint supplier_mail_inbox_mail_type_check check (
    mail_type in ('order_confirmation', 'delivery_confirmation', 'photo_delivery', 'unknown')
  ),
  constraint supplier_mail_inbox_match_status_check check (
    match_status in ('unmatched', 'suggested_match', 'matched')
  ),
  constraint supplier_mail_inbox_review_status_check check (
    review_status in ('pending', 'approved', 'rejected')
  )
);

create index if not exists supplier_mail_inbox_supplier_id_idx on public.supplier_mail_inbox (supplier_id);
create index if not exists supplier_mail_inbox_received_at_idx on public.supplier_mail_inbox (received_at desc);
create index if not exists supplier_mail_inbox_review_status_idx on public.supplier_mail_inbox (review_status);

create table if not exists public.supplier_mail_matches (
  id uuid primary key default gen_random_uuid(),
  inbox_id uuid not null references public.supplier_mail_inbox(id) on delete cascade,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  request_id uuid references public.customer_order_requests(id) on delete set null,
  confidence numeric(4,3),
  created_at timestamptz not null default now()
);

create index if not exists supplier_mail_matches_inbox_id_idx on public.supplier_mail_matches (inbox_id);

create table if not exists public.delivery_artifacts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.customer_order_requests(id) on delete set null,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  inbox_id uuid references public.supplier_mail_inbox(id) on delete set null,
  file_url text not null,
  file_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists delivery_artifacts_request_id_idx on public.delivery_artifacts (request_id);
create index if not exists delivery_artifacts_purchase_order_id_idx on public.delivery_artifacts (purchase_order_id);
create index if not exists delivery_artifacts_inbox_id_idx on public.delivery_artifacts (inbox_id);

create table if not exists public.product_import_batches (
  id uuid primary key default gen_random_uuid(),
  imported_by_user_id uuid,
  file_name text,
  row_count integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_import_errors (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.product_import_batches(id) on delete cascade,
  row_number integer,
  product_number text,
  error_message text not null,
  created_at timestamptz not null default now()
);

create index if not exists product_import_errors_batch_id_idx on public.product_import_errors (batch_id);

create table if not exists public.order_import_errors (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_submission_id text,
  error_type text not null,
  error_message text not null,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_import_errors_source_idx on public.order_import_errors (source, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at
before update on public.suppliers
for each row
execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists customer_product_prices_set_updated_at on public.customer_product_prices;
create trigger customer_product_prices_set_updated_at
before update on public.customer_product_prices
for each row
execute function public.set_updated_at();

drop trigger if exists customer_order_requests_set_updated_at on public.customer_order_requests;
create trigger customer_order_requests_set_updated_at
before update on public.customer_order_requests
for each row
execute function public.set_updated_at();

drop trigger if exists customer_order_request_lines_set_updated_at on public.customer_order_request_lines;
create trigger customer_order_request_lines_set_updated_at
before update on public.customer_order_request_lines
for each row
execute function public.set_updated_at();

drop trigger if exists purchase_orders_set_updated_at on public.purchase_orders;
create trigger purchase_orders_set_updated_at
before update on public.purchase_orders
for each row
execute function public.set_updated_at();

drop trigger if exists purchase_order_lines_set_updated_at on public.purchase_order_lines;
create trigger purchase_order_lines_set_updated_at
before update on public.purchase_order_lines
for each row
execute function public.set_updated_at();

drop trigger if exists supplier_mail_inbox_set_updated_at on public.supplier_mail_inbox;
create trigger supplier_mail_inbox_set_updated_at
before update on public.supplier_mail_inbox
for each row
execute function public.set_updated_at();

insert into public.order_labels (name, color)
values
  ('haste', 'red'),
  ('restordre', 'amber'),
  ('afventer afklaring', 'slate'),
  ('kunde kontaktet', 'blue'),
  ('klar til bestilling', 'green')
on conflict (name) do nothing;
