-- Create base tables for EF Core schema

-- Create BreakTypes table
CREATE TABLE break_types (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(450) NOT NULL,
    name VARCHAR(255) NOT NULL,
    default_duration_minutes INT NOT NULL DEFAULT 15,
    countdown_message VARCHAR(255) NOT NULL DEFAULT '',
    countdown_end_message VARCHAR(255) NOT NULL DEFAULT '',
    end_time_title VARCHAR(255) NOT NULL DEFAULT '',
    break_time_step_minutes INT NOT NULL DEFAULT 5,
    background_image_choices VARCHAR(1000) NULL,
    image_title VARCHAR(255) NULL,
    usage_count BIGINT NOT NULL DEFAULT 0,
    icon_name VARCHAR(100) NULL,
    components TEXT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
);

-- Add index for faster user lookup
CREATE INDEX idx_break_types_user_id ON break_types(user_id);

-- Create Breaks table
CREATE TABLE breaks (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(450) NOT NULL,
    break_type_id INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_breaks_break_types FOREIGN KEY (break_type_id) REFERENCES break_types(id) ON DELETE RESTRICT
);

-- Add indexes for faster lookup
CREATE INDEX idx_breaks_user_id ON breaks(user_id);
CREATE INDEX idx_breaks_break_type_id ON breaks(break_type_id);

-- Create UserData table
CREATE TABLE user_data (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(450) NOT NULL,
    data_key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL,
    CONSTRAINT uk_user_data_user_key UNIQUE (user_id, data_key)
);

-- Add index for faster user lookup
CREATE INDEX idx_user_data_user_id ON user_data(user_id);

-- Create BackgroundImages table
CREATE TABLE background_images (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(450) NULL,
    file_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    thumbnail_path VARCHAR(1000) NOT NULL,
    full_image_path VARCHAR(1000) NOT NULL,
    thumbnail_url VARCHAR(1000) NULL,
    full_image_url VARCHAR(1000) NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
);

-- Add indexes for faster lookup
CREATE INDEX idx_background_images_user_id ON background_images(user_id);
CREATE INDEX idx_background_images_file_name ON background_images(file_name);

-- Create EFMigrationsHistory table for EF Core migrations
CREATE TABLE "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

-- Insert initial migration record
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20250406000000_InitialCreateEfCore', '7.0.15');