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
 * @returns {true|false} Whether the insert succeeded
 */
async function addRecord(monitorID, value, imgName) {
    let newRecord = await insertData(`records`, {
        monitor_id: monitorID,
        time: new Date(),
        value: value,
        file_path: `/imgs/${monitorID}/${imgName}`
    });
    if (!newRecord) {
        console.error(`Failed to insert new record into records table`);
        return false;
    }
    return true;
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

async function createUser(email, username, passwordHash) {
    return await insertData("users", {
        email: email,
        username: username,
        password: passwordHash
    });
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
 * @returns {Array} Array of available monitor_id
 */
async function getMonitors(userID) {
    const rows = await getData(`users_monitors`, "monitor_id", { user_id: userID });
    return rows;
}

module.exports = {
    addRecord,
    monitorExists,
    getUserByUsername,
    getUserByEmail,
    getUserById,
    createUser,
    getPastRecords,
    getRecordById,
    userCanAccessMonitor,
    getMonitors
};
