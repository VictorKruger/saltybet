"use strict";
const betterSqlite3 = require('better-sqlite3');

module.exports = class saltyBetsDB
{
	constructor(path)
	{
		// Bring database online, make new one if one is not present
		this.db = betterSqlite3(path);
		this.db.exec(`
			----------------------------------------------------------------
			CREATE TABLE IF NOT EXISTS messages
			(
				time	TEXT,
				message	TEXT
			);

			CREATE INDEX IF NOT EXISTS idx_messages_time ON messages (time);
			----------------------------------------------------------------
			CREATE TABLE IF NOT EXISTS fighters
			(
				name	TEXT NOT NULL UNIQUE,
				author	TEXT,
				tier	TEXT,
				streak	INTEGER,
				PRIMARY KEY(name)
			);
			----------------------------------------------------------------
			CREATE VIEW IF NOT EXISTS ranking AS
			SELECT
				name,
				tier,
				streak
			FROM
				fighters
			WHERE
				tier IS NOT NULL
				AND streak IS NOT NULL
			ORDER BY
				CASE tier
					WHEN 'X Tier' THEN 1
					WHEN 'S Tier' THEN 2
					WHEN 'A Tier' THEN 3
					WHEN 'B Tier' THEN 4
					WHEN 'P Tier' THEN 5
				END,
				streak DESC;
			----------------------------------------------------------------
		`);
	}

	// Write a message log, this should be depricated once parsing for all message types are known
	logMessage(message)
	{
		var p = this.db.prepare(`INSERT INTO messages (time, message) VALUES (@time, @message);`);
		return p.run({time: escapeSQL(new Date()), message});

	}

	/*
	logFight(fight)
	{
		var p = this.db.prepare(`INSERT INTO fight (time, message) VALUES (@time, @message);`);
		return p.run(Object.assign({time: escapeSQL(new Date())}, fight));
	}
	*/

	// Return results of query of fighters table
	listFighters()
	{
		return this.db
		.prepare(`SELECT name, author, tier, streak FROM fighters ORDER BY name`)
		.all();
	}

	// Get a specific fighter by name
	getFighter(f)
	{
		return this.db
		.prepare(`SELECT name, author, tier, streak FROM fighters WHERE name = ?`)
		.get(f) || {};
	}

	// Dynamically insert/update fighter data by name
	upsertFighter(row)
	{
		var p = this.db.prepare(`
			INSERT INTO fighters
				(${Object.keys(row).join(',')})
			VALUES
				(${escapeSQL(Object.values(row))})
			ON CONFLICT(name) DO UPDATE SET
				${Object.entries(row).map(([k, v]) => k + "=" + escapeSQL(v)).join(",")}
			WHERE
				name = @name;
		`);
		return p.run(row);
	}

	// Close database down
	close()
	{
		this.db.close();
	}
	
}

// General purpose SQL escaper
function escapeSQL(t)
{
	if (t == null) return 'null';
	else if (t instanceof Array) return t.map(escapeSQL).join(",");
	else if (t instanceof Date) return JSON.stringify(t).replace(/"/g, "");
	else if (typeof t == "number") return String(t);
	else return "'" + String(t).replace(/'/g, "''") + "'";
}