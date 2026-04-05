const { Pool } = require(`pg`);
const { loadEnvFile } = require('node:process');
loadEnvFile();

// establish database connection pool
const pool = new Pool({
    host: `localhost`,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: 5432,
    max: 20, // maximum number of clients in the pool
    idleTimeoutMillis: 30000, // close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection could not be established
});

/**
 * Get data from a table
 * @param {string} table - The table name
 * @param {string|Array} columns - Columns to select
 * @param {Object} criteria - WHERE clause criteria as key-value pairs
 * @param {int} limit - Number of rows to return
 * @param {Object} orderBy - Order by options including `property` and `order`
 * @returns {Array|null} Array of rows or null on error
 */
async function getData(table, columns = "*", criteria = {}, limit = 0, orderBy = {}) {
    const colList = Array.isArray(columns) ? columns.join(", ") : columns;

    const keys = Object.keys(criteria);
    const values = Object.values(criteria);

    const whereClause =
        keys.length > 0
            ? "WHERE " + keys.map((k, i) => `${k} = $${i + 1}`).join(" AND ")
            : "";

    const orderClause =
        Object.keys(orderBy).length > 1
            ? `ORDER BY ${orderBy.property} ${orderBy.order}`
            : "";

    const limitClause =
        limit !== 0
            ? "LIMIT " + limit
            : "";

    const text = `SELECT ${colList} FROM ${table} ${whereClause} ${orderClause} ${limitClause};`;

    try {
        const { rows } = await pool.query(text, values);
        return rows || null;
    } catch (err) {
        console.error("getData error:", err);
        return null;
    }
}

/**
 * Insert data into a table
 * @param {string} table - The table name
 * @param {Object} data - Data to be inserted in key-value pairs
 * @returns {Object|null} Data inserted or null
 */
async function insertData(table, data = {}) {
    const columns = Object.keys(data);
    const values = Object.values(data);

    let colText = "(";
    let valueText = "(";
    for (let i = 0; i < columns.length; i++) {
        colText += columns[i];
        valueText += `$${i + 1}`;
        if (i + 1 < columns.length) {
            colText += ", ";
            valueText += ", ";
        }
    }
    colText += ")";
    valueText += ")";

    const text = `INSERT INTO ${table} ${colText} VALUES ${valueText} RETURNING *;`;

    try {
        const result = await pool.query(text, values);
        return result.rows[0] || null;
    } catch (err) {
        console.error("insertData error:", err);
        return null;
    }
}

/**
 * Inserts a new record into the database
 * @param {int} monitorID - The ID of the monitor associated with the record
 * @param {float} value - The decimal value derived from AI model
 * @param {string} imgName - The name of the associated image on disk
 * @returns {Object|null} Inserted record row or null on failure
 */
async function addRecord(monitorID, value, imgName) {
    let newRecord = await insertData(`records`, {
        monitor_id: monitorID,
        time: new Date(),
        dehydration_score: value,
        file_path: `/imgs/${monitorID}/${imgName}`
    });
    if (!newRecord) {
        console.error(`Failed to insert new record into records table`);
        return null;
    }
    return newRecord;
}

/**
 * Insert an alert tied to a record
 * @param {int} recordID - Record ID
 * @param {string} alertType - Alert type label
 * @param {string} alertMethod - Alert method enum value (email or sms)
 * @returns {Object|null} Inserted alert row or null on failure
 */
async function addAlert(recordID, alertType = "dehydration", alertMethod = "email") {
    return await insertData("alerts", {
        record_id: recordID,
        alert_type: alertType,
        alert_method: alertMethod,
    });
}

/**
 * Check whether a recent alert exists for a monitor within the cooldown window
 * @param {int} monitorID - Monitor ID
 * @param {string} alertType - Alert type label
 * @param {string} alertMethod - Alert method enum value (email or sms)
 * @param {number} cooldownHours - Cooldown length in hours
 * @returns {boolean} True if a recent alert exists
 */
async function hasRecentAlert(monitorID, alertType = "dehydration", alertMethod = "email", cooldownHours = 24) {
    const text = `
        SELECT 1
        FROM alerts a
        INNER JOIN records r ON r.record_id = a.record_id
        WHERE r.monitor_id = $1
          AND a.alert_type = $2
          AND a.alert_method = $3
          AND a.triggered_at >= NOW() - ($4 * INTERVAL '1 hour')
        LIMIT 1;
    `;

    try {
        const { rows } = await pool.query(text, [monitorID, alertType, alertMethod, cooldownHours]);
        return rows.length > 0;
    } catch (err) {
        console.error("hasRecentAlert error:", err);
        return false;
    }
}

/**
 * Checks whether a monitor ID exists
 * @param {int} monitorID - The ID of the monitor to check
 * @returns {true|false} Whether the monitor exists
 */
async function monitorExists(monitorID) {
    let monitor = await getData(`monitors`, "*", { monitor_id: monitorID });
    if (!monitor || monitor.length === 0) {
        return false;
    }
    return true;
}

/**
 * Get monitor metadata by device API key
 * @param {string} apiKey - Device API key
 * @returns {Object|null} Monitor row or null if no match
 */
async function getMonitorByApiKey(apiKey) {
    if (!apiKey) {
        return null;
    }

    const rows = await getData(
        `monitors`,
        [`monitor_id`, `name`, `api_key`],
        { api_key: apiKey }
    );

    if (!rows || rows.length === 0) {
        return null;
    }

    return rows[0];
}

/**
 * Create a monitor with a provided API key
 * @param {string} name - Human-readable monitor/device name
 * @param {string} apiKey - Device API key
 * @returns {Object|null} Monitor row or null on failure
 */
async function createMonitor(name, apiKey) {
    return await insertData(`monitors`, {
        name,
        api_key: apiKey,
    });
}

/**
 * Get a user by username
 * Used during login authentication
 * @param {string} username
 * @returns {Object|null}
 */
async function getUserByUsername(username) {
    const users = await getData("users", "*", { username });

    if (!users || users.length === 0) {
        return null;
    }

    return users[0];
}

/**
 * Get a user by email
 * @param {string} email
 * @returns {Object|null}
 */
async function getUserByEmail(email) {
    const users = await getData("users", "*", { email });

    if (!users || users.length === 0) {
        return null;
    }

    return users[0];
}

/**
 * Get a user by user ID
 * Returns all user fields except password for security
 * @param {int} userId
 * @returns {Object|null}
 */
async function getUserById(userId) {
    const users = await getData("users", 
        ["user_id", "email", "username", "first_name", "last_name", "phone_number"], 
        { user_id: userId }
    );

    if (!users || users.length === 0) {
        return null;
    }

    return users[0];
}


/**
 * Insert a new user into the database
 * Used during registration
 * @param {string} email
 * @param {string} username
 * @param {string} passwordHash
 * @returns {Object|null}
 */

async function createUser(email, username, passwordHash, firstName, lastName, phoneNumber) {
    const data = {
        email: email,
        username: username,
        password: passwordHash,
        first_name: firstName,
        last_name: lastName,
    };
    if (phoneNumber) {
        data.phone_number = phoneNumber;
    }
    return await insertData("users", data);
}

async function getPastRecords(monitorID, limit) {
    const records = await getData(
        `records`,
        [`record_id`, `monitor_id`, `time`, `dehydration_score`],
        { monitor_id: monitorID },
        limit,
        { property: `time`, order: `DESC` }
    );

    if (!records || records.length === 0) {
        return null;
    }

    // Reverse to get chronological order (oldest to newest) for chart display
    return records.reverse();
}

/**
 * Get a count of records for a monitor within a time range
 * @param {int} monitorID - The monitor ID
 * @param {Date|string} startTime - Inclusive range start
 * @param {Date|string} endTime - Inclusive range end
 * @returns {number} Number of matching records
 */
async function countRecordsInRange(monitorID, startTime, endTime) {
    const text = `
        SELECT COUNT(*)::int AS count
        FROM records
        WHERE monitor_id = $1
          AND time >= $2
          AND time <= $3;
    `;

    try {
        const { rows } = await pool.query(text, [monitorID, startTime, endTime]);
        return rows[0]?.count || 0;
    } catch (err) {
        console.error("countRecordsInRange error:", err);
        return 0;
    }
}

/**
 * Get raw records for a monitor within a time range ordered chronologically
 * @param {int} monitorID - The monitor ID
 * @param {Date|string} startTime - Inclusive range start
 * @param {Date|string} endTime - Inclusive range end
 * @returns {Array|null} Matching record rows or null on query error
 */
async function getRecordsInRange(monitorID, startTime, endTime) {
    const text = `
        SELECT record_id, monitor_id, time, dehydration_score
        FROM records
        WHERE monitor_id = $1
          AND time >= $2
          AND time <= $3
        ORDER BY time ASC;
    `;

    try {
        const { rows } = await pool.query(text, [monitorID, startTime, endTime]);
        return rows;
    } catch (err) {
        console.error("getRecordsInRange error:", err);
        return null;
    }
}

/**
 * Get hourly aggregates for a monitor within a time range
 * @param {int} monitorID - The monitor ID
 * @param {Date|string} startTime - Inclusive range start
 * @param {Date|string} endTime - Inclusive range end
 * @returns {Array|null} Hourly aggregate rows or null on query error
 */
async function getHourlyAverageRecordsInRange(monitorID, startTime, endTime) {
    const text = `
        SELECT
            DATE_TRUNC('hour', time) AS time,
            AVG(dehydration_score)::double precision AS dehydration_score,
            MIN(dehydration_score)::double precision AS min_dehydration_score,
            MAX(dehydration_score)::double precision AS max_dehydration_score,
            COUNT(*)::int AS sample_count
        FROM records
        WHERE monitor_id = $1
          AND time >= $2
          AND time <= $3
        GROUP BY DATE_TRUNC('hour', time)
        ORDER BY time ASC;
    `;

    try {
        const { rows } = await pool.query(text, [monitorID, startTime, endTime]);
        return rows;
    } catch (err) {
        console.error("getHourlyAverageRecordsInRange error:", err);
        return null;
    }
}

/**
 * Get a single record by its ID
 * @param {int} recordID - The primary key of the record
 * @returns {Object|null} The record row or null
 */
async function getRecordById(recordID) {
    const records = await getData(`records`, "*", { record_id: recordID });
    if (!records || records.length === 0) {
        return null;
    }
    return records[0];
}

/**
 * Check whether a user is associated with a monitor via the users_monitors junction table
 * @param {int} userID - The user's ID
 * @param {int} monitorID - The monitor's ID
 * @returns {boolean} True if the association exists
 */
async function userCanAccessMonitor(userID, monitorID) {
    const rows = await getData(`users_monitors`, "*", { user_id: userID, monitor_id: monitorID });
    return rows !== null && rows.length > 0;
}

/**
 * Get all monitors associated with the specified user
 * @param {int} userID - The user's ID
 * @returns {Array} Array of monitor objects with monitor_id and name
 */
async function getMonitors(userID) {
    const text = `
        SELECT m.monitor_id, m.name
        FROM users_monitors um
        INNER JOIN monitors m ON m.monitor_id = um.monitor_id
        WHERE um.user_id = $1
        ORDER BY m.monitor_id ASC;
    `;

    try {
        const { rows } = await pool.query(text, [userID]);
        return rows;
    } catch (err) {
        console.error("getMonitors error:", err);
        return [];
    }
}

/**
 * Associate a user with a monitor if not already linked
 * @param {int} userID - The user's ID
 * @param {int} monitorID - The monitor's ID
 * @returns {{ created: boolean } | null} Result object or null on error
 */
async function associateUserToMonitor(userID, monitorID) {
    const text = `
        INSERT INTO users_monitors (user_id, monitor_id)
        VALUES ($1, $2)
        ON CONFLICT (monitor_id, user_id) DO NOTHING
        RETURNING monitor_id;
    `;

    try {
        const result = await pool.query(text, [userID, monitorID]);
        return {
            created: result.rowCount > 0,
        };
    } catch (err) {
        console.error("associateUserToMonitor error:", err);
        return null;
    }
}

/**
 * Get distinct user email addresses associated with a monitor
 * @param {int} monitorID - The monitor ID
 * @returns {Array<string>} Array of email addresses
 */
async function getMonitorUserEmails(monitorID) {
    const text = `
        SELECT DISTINCT u.email
        FROM users u
        INNER JOIN users_monitors um ON um.user_id = u.user_id
        WHERE um.monitor_id = $1
        ORDER BY u.email ASC;
    `;

    try {
        const { rows } = await pool.query(text, [monitorID]);
        return rows.map(r => r.email);
    } catch (err) {
        console.error("getMonitorUserEmails error:", err);
        return [];
    }
}

module.exports = {
    addRecord,
    monitorExists,
    getMonitorByApiKey,
    createMonitor,
    getUserByUsername,
    getUserByEmail,
    getUserById,
    createUser,
    getPastRecords,
    countRecordsInRange,
    getRecordsInRange,
    getHourlyAverageRecordsInRange,
    getRecordById,
    userCanAccessMonitor,
    getMonitors,
    associateUserToMonitor,
    getMonitorUserEmails,
    addAlert,
    hasRecentAlert
};
