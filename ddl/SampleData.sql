\c flowers;

BEGIN;

-- Truncate tables in correct order (respecting foreign key constraints)
TRUNCATE TABLE alerts, records, users_monitors, monitors, users RESTART IDENTITY CASCADE;

-------------------------------------------------
-- USERS
-------------------------------------------------
INSERT INTO users (email, username, password, first_name, last_name, phone_number) VALUES
('grower1@farm.com', 'green_valley',
 '$2a$12$oYYHWhjYpM7HDEJEbXWeAu0dNKK1rixiofSKeLLBPAmL1REkJSvSO',
 'John', 'Valley', '5855551111'),

('grower2@farm.com', 'sunrise_farms',
 '$2a$12$PwkVHXfBQG74SH622qiIUeWDXC9BeTX2ZGtZZ0WX1zCZnERbdzOry',
 'Emma', 'Sunrise', '5855552222');

-------------------------------------------------
-- MONITORS
-------------------------------------------------
INSERT INTO monitors (name, api_key) VALUES
('healthy_device', 'APIKEY-DEV-001'),
('dehydrating_device', 'APIKEY-DEV-002'),
('warning_device', 'APIKEY-DEV-003');

-------------------------------------------------
-- USERS_MONITORS
-------------------------------------------------
INSERT INTO users_monitors (user_id, monitor_id) VALUES
(1, 1),
(1, 2),
(2, 3);

-------------------------------------------------
-- RECORDS
-------------------------------------------------
INSERT INTO records (monitor_id, time, dehydration_score, file_path) VALUES

-- healthy_device (monitor_id = 1) - consistently healthy (10-min intervals)
(1, NOW() - INTERVAL '180 minutes', 0.90, '/imgs/1/2026-01-15T07-00-00.000Z.jpg'),
(1, NOW() - INTERVAL '170 minutes', 0.89, '/imgs/1/2026-01-15T07-10-00.000Z.jpg'),
(1, NOW() - INTERVAL '160 minutes', 0.91, '/imgs/1/2026-01-15T07-20-00.000Z.jpg'),
(1, NOW() - INTERVAL '150 minutes', 0.88, '/imgs/1/2026-01-15T07-30-00.000Z.jpg'),
(1, NOW() - INTERVAL '140 minutes', 0.90, '/imgs/1/2026-01-15T07-40-00.000Z.jpg'),
(1, NOW() - INTERVAL '130 minutes', 0.92, '/imgs/1/2026-01-15T07-50-00.000Z.jpg'),
(1, NOW() - INTERVAL '120 minutes', 0.89, '/imgs/1/2026-01-15T08-00-00.000Z.jpg'),
(1, NOW() - INTERVAL '110 minutes', 0.91, '/imgs/1/2026-01-15T08-10-00.000Z.jpg'),
(1, NOW() - INTERVAL '100 minutes', 0.90, '/imgs/1/2026-01-15T08-20-00.000Z.jpg'),
(1, NOW() - INTERVAL  '90 minutes', 0.93, '/imgs/1/2026-01-15T08-30-00.000Z.jpg'),
(1, NOW() - INTERVAL  '80 minutes', 0.92, '/imgs/1/2026-01-15T08-40-00.000Z.jpg'),
(1, NOW() - INTERVAL  '70 minutes', 0.91, '/imgs/1/2026-01-15T08-50-00.000Z.jpg'),
(1, NOW() - INTERVAL  '60 minutes', 0.90, '/imgs/1/2026-01-15T09-00-00.000Z.jpg'),
(1, NOW() - INTERVAL  '50 minutes', 0.92, '/imgs/1/2026-01-15T09-10-00.000Z.jpg'),
(1, NOW() - INTERVAL  '40 minutes', 0.91, '/imgs/1/2026-01-15T09-20-00.000Z.jpg'),
(1, NOW() - INTERVAL  '30 minutes', 0.93, '/imgs/1/2026-01-15T09-30-00.000Z.jpg'),
(1, NOW() - INTERVAL  '20 minutes', 0.94, '/imgs/1/2026-01-15T09-40-00.000Z.jpg'),
(1, NOW() - INTERVAL  '10 minutes', 0.93, '/imgs/1/2026-01-15T09-50-00.000Z.jpg'),
(1, NOW(),                           0.94, '/imgs/1/2026-01-15T10-00-00.000Z.jpg'),

-- dehydrating_device (monitor_id = 2) - showing progressive dehydration (10-min intervals)
(2, NOW() - INTERVAL '180 minutes', 0.45, '/imgs/2/2026-01-15T07-00-00.000Z.jpg'),
(2, NOW() - INTERVAL '170 minutes', 0.42, '/imgs/2/2026-01-15T07-10-00.000Z.jpg'),
(2, NOW() - INTERVAL '160 minutes', 0.39, '/imgs/2/2026-01-15T07-20-00.000Z.jpg'),
(2, NOW() - INTERVAL '150 minutes', 0.36, '/imgs/2/2026-01-15T07-30-00.000Z.jpg'),
(2, NOW() - INTERVAL '140 minutes', 0.33, '/imgs/2/2026-01-15T07-40-00.000Z.jpg'),
(2, NOW() - INTERVAL '130 minutes', 0.30, '/imgs/2/2026-01-15T07-50-00.000Z.jpg'),
(2, NOW() - INTERVAL '120 minutes', 0.27, '/imgs/2/2026-01-15T08-00-00.000Z.jpg'),
(2, NOW() - INTERVAL '110 minutes', 0.24, '/imgs/2/2026-01-15T08-10-00.000Z.jpg'),
(2, NOW() - INTERVAL '100 minutes', 0.21, '/imgs/2/2026-01-15T08-20-00.000Z.jpg'),
(2, NOW() - INTERVAL  '90 minutes', 0.18, '/imgs/2/2026-01-15T08-30-00.000Z.jpg'),
(2, NOW() - INTERVAL  '80 minutes', 0.15, '/imgs/2/2026-01-15T08-40-00.000Z.jpg'),
(2, NOW() - INTERVAL  '70 minutes', 0.12, '/imgs/2/2026-01-15T08-50-00.000Z.jpg'),
(2, NOW() - INTERVAL  '60 minutes', 0.10, '/imgs/2/2026-01-15T09-00-00.000Z.jpg'),
(2, NOW() - INTERVAL  '50 minutes', 0.08, '/imgs/2/2026-01-15T09-10-00.000Z.jpg'),
(2, NOW() - INTERVAL  '40 minutes', 0.07, '/imgs/2/2026-01-15T09-20-00.000Z.jpg'),
(2, NOW() - INTERVAL  '30 minutes', 0.06, '/imgs/2/2026-01-15T09-30-00.000Z.jpg'),
(2, NOW() - INTERVAL  '20 minutes', 0.05, '/imgs/2/2026-01-15T09-40-00.000Z.jpg'),
(2, NOW() - INTERVAL  '10 minutes', 0.04, '/imgs/2/2026-01-15T09-50-00.000Z.jpg'),
(2, NOW(),                           0.03, '/imgs/2/2026-01-15T10-00-00.000Z.jpg'),

-- warning_device (monitor_id = 3) - showing concerning decline (10-min intervals, less history)
(3, NOW() - INTERVAL '120 minutes', 0.65, '/imgs/3/2026-01-15T08-00-00.000Z.jpg'),
(3, NOW() - INTERVAL '110 minutes', 0.62, '/imgs/3/2026-01-15T08-10-00.000Z.jpg'),
(3, NOW() - INTERVAL '100 minutes', 0.59, '/imgs/3/2026-01-15T08-20-00.000Z.jpg'),
(3, NOW() - INTERVAL  '90 minutes', 0.56, '/imgs/3/2026-01-15T08-30-00.000Z.jpg'),
(3, NOW() - INTERVAL  '80 minutes', 0.53, '/imgs/3/2026-01-15T08-40-00.000Z.jpg'),
(3, NOW() - INTERVAL  '70 minutes', 0.50, '/imgs/3/2026-01-15T08-50-00.000Z.jpg'),
(3, NOW() - INTERVAL  '60 minutes', 0.47, '/imgs/3/2026-01-15T09-00-00.000Z.jpg'),
(3, NOW() - INTERVAL  '50 minutes', 0.44, '/imgs/3/2026-01-15T09-10-00.000Z.jpg'),
(3, NOW() - INTERVAL  '40 minutes', 0.41, '/imgs/3/2026-01-15T09-20-00.000Z.jpg'),
(3, NOW() - INTERVAL  '30 minutes', 0.38, '/imgs/3/2026-01-15T09-30-00.000Z.jpg'),
(3, NOW() - INTERVAL  '20 minutes', 0.35, '/imgs/3/2026-01-15T09-40-00.000Z.jpg'),
(3, NOW() - INTERVAL  '10 minutes', 0.32, '/imgs/3/2026-01-15T09-50-00.000Z.jpg'),
(3, NOW(),                           0.29, '/imgs/3/2026-01-15T10-00-00.000Z.jpg');

-------------------------------------------------
-- ALERTS (example alerts for declining monitors)
-------------------------------------------------
INSERT INTO alerts (record_id, alert_type, alert_method)
VALUES
(10, 'Critical Dehydration', 'sms'),
(25, 'Warning Dehydration', 'email');

COMMIT;
