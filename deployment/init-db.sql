-- Logogear Portal Database Initialization
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS logogear_portal;

-- Use the database
\c logogear_portal;

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    department VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    event_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create file processing jobs table
CREATE TABLE IF NOT EXISTS file_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    job_type VARCHAR(50) NOT NULL, -- 'BLUEDART' or 'DC'
    filename VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
    result_path VARCHAR(500),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create file generation logs table for audit trail
CREATE TABLE IF NOT EXISTS file_generation_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100), -- Can be 'anonymous' for non-authenticated users
    file_type VARCHAR(50) NOT NULL, -- 'BLUEDART' or 'DC'
    filename VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL,
    record_count INTEGER,
    file_count INTEGER,
    file_size BIGINT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert authorized users
INSERT INTO users (email, name, department, status) VALUES
('junaid@logogear.co.in', 'Junaid', 'Operations', 'ACTIVE'),
('javed@logogear.co.in', 'Javed', 'Operations', 'ACTIVE'),
('info@logogear.co.in', 'Info', 'General', 'ACTIVE'),
('support@techdrsti.com', 'Support', 'Support', 'ACTIVE'),
('sidhanraj@techdrsti.com', 'Sidhanraj', 'Technical', 'ACTIVE'),
('mahadesh@techdrsti.com', 'Mahadesh', 'Technical', 'ACTIVE'),
('harshithak82@gmail.com', 'Harshitha', 'Development', 'ACTIVE'),
('admin', 'Administrator', 'Admin', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_file_jobs_user_id ON file_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_jobs_status ON file_jobs(status);
CREATE INDEX IF NOT EXISTS idx_file_generation_logs_created_at ON file_generation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_file_generation_logs_file_type ON file_generation_logs(file_type);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;