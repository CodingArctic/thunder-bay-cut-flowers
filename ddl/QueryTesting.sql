-- Confirm that tables contain data after seeding
SELECT COUNT(*) AS total_users FROM users;
SELECT COUNT(*) AS total_monitors FROM monitors;
SELECT COUNT(*) AS total_user_monitor_links FROM users_monitors;
SELECT COUNT(*) AS total_records FROM records;

-- =====================================================
-- Verify which user owns which monitoring device

SELECT
    u.username,
    m.name AS monitor_name
FROM users u
         JOIN users_monitors um ON u.user_id = um.user_id
         JOIN monitors m ON m.monitor_id = um.monitor_id
ORDER BY u.username;

-- =====================================================
-- Retrieve the most recent record for each monitor
-- Used by dashboard to show current dehydration status

SELECT DISTINCT ON (monitor_id)
    monitor_id,
    time,
    value,
    file_path
FROM records
ORDER BY monitor_id, time DESC;

-- =====================================================
-- LAST 3 HOURS OF DATA FOR A SINGLE MONITOR

SELECT
    time,
    value
FROM records
WHERE monitor_id = 1
  AND time >= NOW() - INTERVAL '3 hours'
ORDER BY time;

-- =====================================================
-- Find records where dehydration exceeds threshold (>= 0.85)
-- Simulates backend trigger for email/SMS notification

SELECT
    m.name AS monitor_name,
    r.time,
    r.value
FROM records r
         JOIN monitors m ON m.monitor_id = r.monitor_id
WHERE r.value >= 0.85
ORDER BY r.time DESC;

-- =====================================================
-- Shows latest timestamp and dehydration value per device

SELECT
    m.name AS monitor_name,
    MAX(r.time) AS last_recorded_time,
    (
        SELECT r2.value
        FROM records r2
        WHERE r2.monitor_id = m.monitor_id
        ORDER BY r2.time DESC
        LIMIT 1
    ) AS latest_value
FROM monitors m
         JOIN records r ON r.monitor_id = m.monitor_id
GROUP BY m.name, m.monitor_id;



-- =====================================================
-- Average dehydration per monitor in the last 3 hours

SELECT
    monitor_id,
    AVG(value) AS avg_dehydration_last_3h
FROM records
WHERE time >= NOW() - INTERVAL '3 hours'
GROUP BY monitor_id;

-- =====================================================
-- Aggregates dehydration score per hour for charting

SELECT
    date_trunc('hour', time) AS hour_bucket,
    AVG(value) AS avg_value
FROM records
WHERE monitor_id = 1
GROUP BY hour_bucket
ORDER BY hour_bucket;

-- =====================================================
-- Ensure database constraints are respected
-- Check for duplicate timestamps per monitor
-- Should return ZERO rows if UNIQUE constraint works

SELECT
    monitor_id,
    time,
    COUNT(*) AS duplicate_count
FROM records
GROUP BY monitor_id, time
HAVING COUNT(*) > 1;

-- =====================================================
-- Check for invalid dehydration values outside range 0–1
-- Should return ZERO rows if CHECK constraint exists
SELECT *
FROM records
WHERE value < 0 OR value > 1;

-- =====================================================
-- Examples of what the web application will execute
-- to power frontend and backend features
-- Latest image path for a monitor (frontend display)
SELECT file_path
FROM records
WHERE monitor_id = 1
ORDER BY time DESC
LIMIT 1;

-- =====================================================
-- All monitors belonging to a logged-in user
SELECT
    m.monitor_id,
    m.name
FROM monitors m
         JOIN users_monitors um ON m.monitor_id = um.monitor_id
WHERE um.user_id = 1;
