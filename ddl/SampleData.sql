INSERT INTO users (email, username, password) VALUES
('grower1@farm.com', 'green_valley', 'hashed_pw_1'),
('grower2@farm.com', 'sunrise_farms', 'hashed_pw_2');

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
(1, NOW() - INTERVAL '180 minutes', 0.65, '/data/monitors/1/180.jpg'),
(1, NOW() - INTERVAL '170 minutes', 0.68, '/data/monitors/1/170.jpg'),
(1, NOW() - INTERVAL '160 minutes', 0.72, '/data/monitors/1/160.jpg'),
(1, NOW() - INTERVAL '150 minutes', 0.76, '/data/monitors/1/150.jpg'),
(1, NOW() - INTERVAL '140 minutes', 0.80, '/data/monitors/1/140.jpg'),
(1, NOW() - INTERVAL '130 minutes', 0.83, '/data/monitors/1/130.jpg'),
(1, NOW() - INTERVAL '120 minutes', 0.86, '/data/monitors/1/120.jpg'),
(1, NOW() - INTERVAL '110 minutes', 0.89, '/data/monitors/1/110.jpg'),
(1, NOW() - INTERVAL '100 minutes', 0.91, '/data/monitors/1/100.jpg'),
(1, NOW() - INTERVAL '90 minutes',  0.93, '/data/monitors/1/090.jpg'),
(1, NOW() - INTERVAL '80 minutes',  0.95, '/data/monitors/1/080.jpg'),
(1, NOW() - INTERVAL '70 minutes',  0.96, '/data/monitors/1/070.jpg'),
------------------------------------------------------------------------------
-- healthy_device (monitor_id = 2)
-- stable & healthy
(2, NOW() - INTERVAL '180 minutes', 0.10, '/data/monitors/2/180.jpg'),
(2, NOW() - INTERVAL '160 minutes', 0.11, '/data/monitors/2/160.jpg'),
(2, NOW() - INTERVAL '140 minutes', 0.09, '/data/monitors/2/140.jpg'),
(2, NOW() - INTERVAL '120 minutes', 0.12, '/data/monitors/2/120.jpg'),
(2, NOW() - INTERVAL '100 minutes', 0.10, '/data/monitors/2/100.jpg'),
(2, NOW() - INTERVAL '80 minutes',  0.08, '/data/monitors/2/080.jpg'),
(2, NOW() - INTERVAL '60 minutes',  0.09, '/data/monitors/2/060.jpg'),
(2, NOW() - INTERVAL '40 minutes',  0.07, '/data/monitors/2/040.jpg'),
(2, NOW() - INTERVAL '20 minutes',  0.06, '/data/monitors/2/020.jpg'),
------------------------------------------------------------------------------
-- warning_device (monitor_id = 3)
-- slow increase, borderline risk
(3, NOW() - INTERVAL '180 minutes', 0.42, '/data/monitors/3/180.jpg'),
(3, NOW() - INTERVAL '160 minutes', 0.45, '/data/monitors/3/160.jpg'),
(3, NOW() - INTERVAL '140 minutes', 0.48, '/data/monitors/3/140.jpg'),
(3, NOW() - INTERVAL '120 minutes', 0.52, '/data/monitors/3/120.jpg'),
(3, NOW() - INTERVAL '100 minutes', 0.55, '/data/monitors/3/100.jpg'),
(3, NOW() - INTERVAL '80 minutes',  0.58, '/data/monitors/3/080.jpg'),
(3, NOW() - INTERVAL '60 minutes',  0.61, '/data/monitors/3/060.jpg'),
(3, NOW() - INTERVAL '40 minutes',  0.64, '/data/monitors/3/040.jpg'),
(3, NOW() - INTERVAL '20 minutes',  0.68, '/data/monitors/3/020.jpg');

