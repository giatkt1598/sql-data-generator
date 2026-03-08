-- CORE TABLES
CREATE TABLE roles (
    role_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    name NVARCHAR(50) NOT NULL
);

CREATE TABLE users (
    user_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    role_id UNIQUEIDENTIFIER,
    email NVARCHAR(255) UNIQUE,
    password_hash NVARCHAR(255),
    full_name NVARCHAR(255),
    phone NVARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),
    supervisor_id UNIQUEIDENTIFIER NULL,
    parent_id UNIQUEIDENTIFIER NULL,
    FOREIGN KEY (supervisor_id) REFERENCES users(user_id),
    FOREIGN KEY (parent_id) REFERENCES users(user_id),
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

CREATE TABLE user_addresses (
    address_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    user_id UNIQUEIDENTIFIER,
    address_line NVARCHAR(255),
    city NVARCHAR(100),
    state NVARCHAR(100),
    country NVARCHAR(100),
    postal_code NVARCHAR(20),
    is_default BIT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE brands (
    brand_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    name NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE categories (
    category_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    parent_id UNIQUEIDENTIFIER NULL,
    name NVARCHAR(255),
    slug NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (parent_id) REFERENCES categories(category_id)
);

CREATE TABLE products (
    product_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    brand_id UNIQUEIDENTIFIER,
    category_id UNIQUEIDENTIFIER,
    name NVARCHAR(255),
    slug NVARCHAR(255),
    description NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (brand_id) REFERENCES brands(brand_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

CREATE TABLE product_images (
    image_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    product_id UNIQUEIDENTIFIER,
    image_url NVARCHAR(500),
    sort_order INT,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE product_variants (
    variant_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    product_id UNIQUEIDENTIFIER,
    sku NVARCHAR(100),
    price DECIMAL(18, 2),
    cost DECIMAL(18, 2),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE warehouses (
    warehouse_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    name NVARCHAR(255),
    location NVARCHAR(255)
);

CREATE TABLE inventory (
    inventory_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    variant_id UNIQUEIDENTIFIER,
    warehouse_id UNIQUEIDENTIFIER,
    quantity INT,
    reserved_quantity INT DEFAULT 0,
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id)
);

CREATE TABLE carts (
    cart_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    user_id UNIQUEIDENTIFIER,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE cart_items (
    cart_item_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    cart_id UNIQUEIDENTIFIER,
    variant_id UNIQUEIDENTIFIER,
    quantity INT,
    FOREIGN KEY (cart_id) REFERENCES carts(cart_id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
);

CREATE TABLE orders (
    order_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    user_id UNIQUEIDENTIFIER,
    status NVARCHAR(50),
    total_amount DECIMAL(18, 2),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE order_items (
    order_item_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    order_id UNIQUEIDENTIFIER,
    variant_id UNIQUEIDENTIFIER,
    quantity INT,
    price DECIMAL(18, 2),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
);

CREATE TABLE payments (
    payment_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    order_id UNIQUEIDENTIFIER,
    payment_method NVARCHAR(50),
    amount DECIMAL(18, 2),
    paid_at DATETIME,
    status NVARCHAR(50),
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

CREATE TABLE shipments (
    shipment_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    order_id UNIQUEIDENTIFIER,
    carrier NVARCHAR(100),
    tracking_number NVARCHAR(100),
    shipped_at DATETIME,
    delivered_at DATETIME,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

CREATE TABLE shipment_items (
    shipment_item_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    shipment_id UNIQUEIDENTIFIER,
    order_item_id UNIQUEIDENTIFIER,
    FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id),
    FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id)
);