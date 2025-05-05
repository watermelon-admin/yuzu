-- Drop database if it exists
DROP DATABASE IF EXISTS yuzu;

-- Create database
CREATE DATABASE yuzu WITH ENCODING 'UTF8';

-- Connect to the new database
\c yuzu

-- Create background_images table
CREATE TABLE background_images (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    title TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    full_image_path TEXT NOT NULL,
    thumbnail_url TEXT DEFAULT '',
    full_image_url TEXT DEFAULT '',
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for background_images
CREATE INDEX idx_background_images_user_id ON background_images(user_id);
CREATE INDEX idx_background_images_file_name ON background_images(file_name);

-- Create break_types table
CREATE TABLE break_types (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    default_duration_minutes INTEGER NOT NULL,
    countdown_message VARCHAR(200) NOT NULL,
    countdown_end_message VARCHAR(200) NOT NULL,
    end_time_title VARCHAR(100) NOT NULL,
    break_time_step_minutes INTEGER NOT NULL,
    background_image_choices TEXT,
    image_title TEXT,
    usage_count BIGINT NOT NULL DEFAULT 0,
    icon_name TEXT,
    components TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for break_types
CREATE INDEX idx_break_types_user_id ON break_types(user_id);

-- Create user_data table
CREATE TABLE user_data (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    data_key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for user_data
CREATE INDEX idx_user_data_user_id ON user_data(user_id);
CREATE UNIQUE INDEX idx_user_data_user_id_data_key ON user_data(user_id, data_key);

-- Create breaks table
CREATE TABLE breaks (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    break_type_id INTEGER NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT fk_breaks_break_type FOREIGN KEY (break_type_id) 
        REFERENCES break_types(id) ON DELETE CASCADE
);

-- Create indexes for breaks
CREATE INDEX idx_breaks_user_id ON breaks(user_id);
CREATE INDEX idx_breaks_break_type_id ON breaks(break_type_id);