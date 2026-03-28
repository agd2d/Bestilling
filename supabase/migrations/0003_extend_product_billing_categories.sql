alter table public.products
drop constraint if exists products_billing_category_check;

alter table public.products
add constraint products_billing_category_check
check (
  billing_category in (
    'material_cost',
    'resale_consumable',
    'equipment_purchase',
    'subcontractor_purchase'
  )
);
