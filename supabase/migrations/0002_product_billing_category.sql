alter table public.products
add column if not exists billing_category text not null default 'resale_consumable';

alter table public.products
drop constraint if exists products_billing_category_check;

alter table public.products
add constraint products_billing_category_check
check (billing_category in ('material_cost', 'resale_consumable'));

create index if not exists products_billing_category_idx
  on public.products (billing_category);
