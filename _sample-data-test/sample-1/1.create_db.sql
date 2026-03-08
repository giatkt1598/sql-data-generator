-- Active: 1772938602167@@localhost@1433@HanaShop
-- CORE TABLES
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
    phone NVARCHAR(50),
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
    is_default BIT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE brands (
    brand_id INT IDENTITY PRIMARY KEY,
    name NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE categories (
    category_id INT IDENTITY PRIMARY KEY,
    parent_id INT NULL,
    name NVARCHAR(255),
    slug NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (parent_id) REFERENCES categories(category_id)
);

CREATE TABLE products (
    product_id INT IDENTITY PRIMARY KEY,
    brand_id INT,
    category_id INT,
    name NVARCHAR(255),
    slug NVARCHAR(255),
    description NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (brand_id) REFERENCES brands(brand_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

CREATE TABLE product_images (
    image_id INT IDENTITY PRIMARY KEY,
    product_id INT,
    image_url NVARCHAR(500),
    sort_order INT,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE product_variants (
    variant_id INT IDENTITY PRIMARY KEY,
    product_id INT,
    sku NVARCHAR(100),
    price DECIMAL(18, 2),
    cost DECIMAL(18, 2),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
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
    reserved_quantity INT DEFAULT 0,
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
    status NVARCHAR(50),
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

CREATE TABLE shipments (
    shipment_id INT IDENTITY PRIMARY KEY,
    order_id INT,
    carrier NVARCHAR(100),
    tracking_number NVARCHAR(100),
    shipped_at DATETIME,
    delivered_at DATETIME,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

CREATE TABLE shipment_items (
    shipment_item_id INT IDENTITY PRIMARY KEY,
    shipment_id INT,
    order_item_id INT,
    FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id),
    FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id)
);