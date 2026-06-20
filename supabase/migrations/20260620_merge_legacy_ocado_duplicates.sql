begin;

-- merge the legacy Ocado Luxury Quilted price history into
-- the scraper-managed product
update price_checks
set product_id = '750ceca9-ecba-4015-b85b-1dd8dc80efad'
where product_id = '309ecb79-92da-4346-94c8-c3269d7235c2'
  and exists (
    select 1
    from products
    where id = '750ceca9-ecba-4015-b85b-1dd8dc80efad'
  );

delete from products
where id = '309ecb79-92da-4346-94c8-c3269d7235c2'
  and exists (
    select 1
    from products
    where id = '750ceca9-ecba-4015-b85b-1dd8dc80efad'
  );

-- merge the legacy Velvet price history into
-- the scraper-managed product
update price_checks
set product_id = '77f7ac4f-7ce0-4e6f-8a82-e09da1011d2c'
where product_id = 'a222f6d1-8cae-4948-a336-d310ad99dbd4'
  and exists (
    select 1
    from products
    where id = '77f7ac4f-7ce0-4e6f-8a82-e09da1011d2c'
  );

delete from products
where id = 'a222f6d1-8cae-4948-a336-d310ad99dbd4'
  and exists (
    select 1
    from products
    where id = '77f7ac4f-7ce0-4e6f-8a82-e09da1011d2c'
  );

commit;