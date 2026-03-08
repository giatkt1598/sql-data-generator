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