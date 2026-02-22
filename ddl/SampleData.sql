\c flowers;

BEGIN;

-- Truncate tables in correct order (respecting foreign key constraints)
TRUNCATE TABLE records, users_monitors, monitors, users RESTART IDENTITY CASCADE;

-- Sequences are automatically reset by RESTART IDENTITY above

INSERT INTO users (email, username, password) VALUES
('grower1@farm.com', 'green_valley', '$2a$12$oYYHWhjYpM7HDEJEbXWeAu0dNKK1rixiofSKeLLBPAmL1REkJSvSO'), -- grower1pw
('grower2@farm.com', 'sunrise_farms', '$2a$12$PwkVHXfBQG74SH622qiIUeWDXC9BeTX2ZGtZZ0WX1zCZnERbdzOry'); -- grower2pw

INSERT INTO monitors (name) VALUES
('dehydrating_device'),
('healthy_device'),
('warning_device');

INSERT INTO users_monitors (user_id, monitor_id) VALUES
(1, 1),  -- green_valley owns dehydrating_device
(1, 2),  -- green_valley owns healthy_device
(2, 3);  -- sunrise_farms owns warning_device

INSERT INTO records (monitor_id, time, value, file_path) VALUES
------------------------------------------------------------------------------
-- dehydrating_device (monitor_id = 1)
-- rising dehydration trend
(1, NOW() - INTERVAL '180 minutes', 0.65, '/imgs/1/180.jpg'),
(1, NOW() - INTERVAL '170 minutes', 0.68, '/imgs/1/170.jpg'),
(1, NOW() - INTERVAL '160 minutes', 0.72, '/imgs/1/160.jpg'),
(1, NOW() - INTERVAL '150 minutes', 0.76, '/imgs/1/150.jpg'),
(1, NOW() - INTERVAL '140 minutes', 0.80, '/imgs/1/140.jpg'),
(1, NOW() - INTERVAL '130 minutes', 0.83, '/imgs/1/130.jpg'),
(1, NOW() - INTERVAL '120 minutes', 0.86, '/imgs/1/120.jpg'),
(1, NOW() - INTERVAL '110 minutes', 0.89, '/imgs/1/110.jpg'),
(1, NOW() - INTERVAL '100 minutes', 0.91, '/imgs/1/100.jpg'),
(1, NOW() - INTERVAL '90 minutes',  0.93, '/imgs/1/090.jpg'),
(1, NOW() - INTERVAL '80 minutes',  0.95, '/imgs/1/080.jpg'),
(1, NOW() - INTERVAL '70 minutes',  0.96, '/imgs/1/070.jpg'),
------------------------------------------------------------------------------
-- healthy_device (monitor_id = 2)
-- stable & healthy
(2, NOW() - INTERVAL '180 minutes', 0.10, '/imgs/2/180.jpg'),
(2, NOW() - INTERVAL '160 minutes', 0.11, '/imgs/2/160.jpg'),
(2, NOW() - INTERVAL '140 minutes', 0.09, '/imgs/2/140.jpg'),
(2, NOW() - INTERVAL '120 minutes', 0.12, '/imgs/2/120.jpg'),
(2, NOW() - INTERVAL '100 minutes', 0.10, '/imgs/2/100.jpg'),
(2, NOW() - INTERVAL '80 minutes',  0.08, '/imgs/2/080.jpg'),
(2, NOW() - INTERVAL '60 minutes',  0.09, '/imgs/2/060.jpg'),
(2, NOW() - INTERVAL '40 minutes',  0.07, '/imgs/2/040.jpg'),
(2, NOW() - INTERVAL '20 minutes',  0.06, '/imgs/2/020.jpg'),
------------------------------------------------------------------------------
-- warning_device (monitor_id = 3)
-- slow increase, borderline risk
(3, NOW() - INTERVAL '180 minutes', 0.42, '/imgs/3/180.jpg'),
(3, NOW() - INTERVAL '160 minutes', 0.45, '/imgs/3/160.jpg'),
(3, NOW() - INTERVAL '140 minutes', 0.48, '/imgs/3/140.jpg'),
(3, NOW() - INTERVAL '120 minutes', 0.52, '/imgs/3/120.jpg'),
(3, NOW() - INTERVAL '100 minutes', 0.55, '/imgs/3/100.jpg'),
(3, NOW() - INTERVAL '80 minutes',  0.58, '/imgs/3/080.jpg'),
(3, NOW() - INTERVAL '60 minutes',  0.61, '/imgs/3/060.jpg'),
(3, NOW() - INTERVAL '40 minutes',  0.64, '/imgs/3/040.jpg'),
(3, NOW() - INTERVAL '20 minutes',  0.68, '/imgs/3/020.jpg');

COMMIT;

