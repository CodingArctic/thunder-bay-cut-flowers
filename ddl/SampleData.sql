INSERT INTO users (email, username, password) VALUES
('emma@mail.com', 'emma', 'emma123'),
('liam@mail.com', 'liam', 'liam123'),
('noah@mail.com', 'noah', 'noah123'),
('olivia@mail.com', 'olivia', 'olivia123');

INSERT INTO monitors (name) VALUES
('Soil Moisture Sensor'),
('Air Quality Sensor'),
('Water Level Sensor');

INSERT INTO users_monitors (user_id, monitor_id) VALUES
(1, 1),
(1, 2),
(2, 1),
(3, 3),
(4, 2),
(4, 3);

INSERT INTO records (monitor_id, time, value, file_path) VALUES
(1, NOW() - INTERVAL '3 hours', 0.32, '/data/soil_01.csv'),
(1, NOW() - INTERVAL '2 hours', 0.45, '/data/soil_02.csv'),
(2, NOW() - INTERVAL '90 minutes', 0.78, NULL),
(2, NOW() - INTERVAL '45 minutes', 0.66, NULL),
(3, NOW() - INTERVAL '30 minutes', 0.21, '/data/water_01.csv'),
(3, NOW() - INTERVAL '10 minutes', 0.09, '/data/water_02.csv');


SELECT * FROM users;
SELECT * FROM monitors;
SELECT * FROM users_monitors;
SELECT * FROM records ORDER BY time DESC;
