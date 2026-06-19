begin;

alter table public.products
  add column if not exists retailer_product_id text,
  add column if not exists image_url text,
  add column if not exists sheet_width_mm numeric,
  add column if not exists sheet_length_mm numeric,
  add column if not exists sheet_area_m2 numeric,
  add column if not exists total_area_m2 numeric,
  add column if not exists total_sheets_source text,
  add column if not exists data_confidence text,
  add column if not exists include_status text,
  add column if not exists updated_at timestamptz default now();

alter table public.products
  alter column ply drop default;

alter table public.price_checks
  alter column delivery_fee drop default,
  alter column small_order_charge drop default,
  alter column delivery_available drop default;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t
      on t.oid = c.conrelid
    join pg_namespace n
      on n.oid = t.relnamespace
    where c.conname =
      'products_retailer_product_id_key'
      and n.nspname = 'public'
      and t.relname = 'products'
  ) then
    alter table public.products
      add constraint
        products_retailer_product_id_key
      unique (
        retailer_id,
        retailer_product_id
      );
  end if;
end
$$;

create or replace view
  public.latest_price_checks
with (security_invoker = true) as
select distinct on (pc.product_id)
  pc.id,
  pc.product_id,
  pc.price,
  pc.delivery_fee,
  pc.small_order_charge,
  pc.in_stock,
  pc.delivery_available,
  pc.checked_at
from public.price_checks pc
where pc.product_id is not null
order by
  pc.product_id,
  pc.checked_at desc,
  pc.id desc;

grant select
on public.latest_price_checks
to anon, authenticated;

commit;