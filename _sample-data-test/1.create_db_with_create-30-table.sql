-- Ecommerce Database Schema for SQL Server
CREATE TABLE roles (
    role_id INT IDENTITY PRIMARY KEY,
    name NVARCHAR(50) NOT NULL
);

CREATE TABLE users (
    user_id INT IDENTITY PRIMARY KEY,
    role_id INT,
    email NVARCHAR(255) UNIQUE,
    password_hash NVARCHAR(255),
    full_name NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

CREATE TABLE user_addresses (
    address_id INT IDENTITY PRIMARY KEY,
    user_id INT,
    address_line NVARCHAR(255),
    city NVARCHAR(100),
    state NVARCHAR(100),
    country NVARCHAR(100),
    postal_code NVARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE categories (
    category_id INT IDENTITY PRIMARY KEY,
    parent_id INT NULL,
    name NVARCHAR(255),
    FOREIGN KEY (parent_id) REFERENCES categories(category_id)
);

CREATE TABLE brands (
    brand_id INT IDENTITY PRIMARY KEY,
    name NVARCHAR(255)
);

CREATE TABLE products (
    product_id INT IDENTITY PRIMARY KEY,
    category_id INT,
    brand_id INT,
    name NVARCHAR(255),
    description NVARCHAR(MAX),
    price DECIMAL(18, 2),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (brand_id) REFERENCES brands(brand_id)
);

CREATE TABLE product_images (
    image_id INT IDENTITY PRIMARY KEY,
    product_id INT,
    image_url NVARCHAR(500),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE product_attributes (
    attribute_id INT IDENTITY PRIMARY KEY,
    name NVARCHAR(100)
);

CREATE TABLE product_attribute_values (
    value_id INT IDENTITY PRIMARY KEY,
    attribute_id INT,
    value NVARCHAR(100),
    FOREIGN KEY (attribute_id) REFERENCES product_attributes(attribute_id)
);

CREATE TABLE product_variants (
    variant_id INT IDENTITY PRIMARY KEY,
    product_id INT,
    sku NVARCHAR(100),
    price DECIMAL(18, 2),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE variant_attribute_values (
    id INT IDENTITY PRIMARY KEY,
    variant_id INT,
    value_id INT,
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id),
    FOREIGN KEY (value_id) REFERENCES product_attribute_values(value_id)
);

CREATE TABLE warehouses (
    warehouse_id INT IDENTITY PRIMARY KEY,
    name NVARCHAR(255),
    location NVARCHAR(255)
);

CREATE TABLE inventory (
    inventory_id INT IDENTITY PRIMARY KEY,
    variant_id INT,
    warehouse_id INT,
    quantity INT,
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id)
);

CREATE TABLE carts (
    cart_id INT IDENTITY PRIMARY KEY,
    user_id INT,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE cart_items (
    cart_item_id INT IDENTITY PRIMARY KEY,
    cart_id INT,
    variant_id INT,
    quantity INT,
    FOREIGN KEY (cart_id) REFERENCES carts(cart_id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
);

CREATE TABLE orders (
    order_id INT IDENTITY PRIMARY KEY,
    user_id INT,
    status NVARCHAR(50),
    total_amount DECIMAL(18, 2),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE order_items (
    order_item_id INT IDENTITY PRIMARY KEY,
    order_id INT,
    variant_id INT,
    quantity INT,
    price DECIMAL(18, 2),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
);

CREATE TABLE payments (
    payment_id INT IDENTITY PRIMARY KEY,
    order_id INT,
    payment_method NVARCHAR(50),
    amount DECIMAL(18, 2),
    paid_at DATETIME,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

CREATE TABLE shipments (
    shipment_id INT IDENTITY PRIMARY KEY,
    order_id INT,
    carrier NVARCHAR(100),
    tracking_number NVARCHAR(100),
    shipped_at DATETIME,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

CREATE TABLE shipment_items (
    shipment_item_id INT IDENTITY PRIMARY KEY,
    shipment_id INT,
    order_item_id INT,
    FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id),
    FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id)
);

CREATE TABLE reviews (
    review_id INT IDENTITY PRIMARY KEY,
    product_id INT,
    user_id INT,
    rating INT,
    comment NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE wishlists (
    wishlist_id INT IDENTITY PRIMARY KEY,
    user_id INT,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE wishlist_items (
    wishlist_item_id INT IDENTITY PRIMARY KEY,
    wishlist_id INT,
    product_id INT,
    FOREIGN KEY (wishlist_id) REFERENCES wishlists(wishlist_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE coupons (
    coupon_id INT IDENTITY PRIMARY KEY,
    code NVARCHAR(50),
    discount_percent INT,
    expires_at DATETIME
);

CREATE TABLE order_coupons (
    id INT IDENTITY PRIMARY KEY,
    order_id INT,
    coupon_id INT,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(coupon_id)
);

CREATE TABLE notifications (
    notification_id INT IDENTITY PRIMARY KEY,
    user_id INT,
    message NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE audit_logs (
    log_id INT IDENTITY PRIMARY KEY,
    user_id INT,
    action NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE sessions (
    session_id INT IDENTITY PRIMARY KEY,
    user_id INT,
    token NVARCHAR(255),
    expires_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);