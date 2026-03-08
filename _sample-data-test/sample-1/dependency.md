## uan hệ chính trong schema

### Quan hệ chain quan trọng để test mock generator:

```


users
 └─ orders
     └─ order_items
         └─ product_variants
             └─ products
                 └─ categories

inventory chain:

warehouses
   └─ inventory
        └─ product_variants

cart chain:

users
 └─ carts
      └─ cart_items
```
