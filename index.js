"use strict";
let mysql = require('mysql2');
let DBConfig = require("./lib/DBConfig.js")
let con = mysql.createConnection(DBConfig.databaseOptions);
const saltyBetsAPI = require("./lib/saltyBetsAPI.js");
const saltyChat = require("./lib/saltyChat.js");
const webServer = require("./lib/webServer.js");
const fs = require('fs');
const FighterInfo = {
	select: fs.readFileSync('./Queries/FighterStats.sql','utf8')
};
Main().catch(console.error);

async function Main()
{
	////////////////////////////////////////////////////////////////
	// Connect to established MySQL server and Print in console
	//the last time the database was updated.

	con.connect(function(err) {
		if (err) throw err;
		con.query("select max(created_at) as last_updated from FightResults;", function (err, result) {
		if (err) throw err;
		console.log(result);
		console.log("database connected...");
		});
  	});

	var live =
	{
		state: "starting",
		remaining: -1,
		fighters:
		{
			Red: {},
			Blue: {}
		},

		website: "https://www.saltybet.com/"
	};


	////////////////////////////////////////////////////////////////
	// Set up salty chat listener
	var sc = new saltyChat();
	
	sc.listen((msg, dat) =>
	{
		console.log(dat || msg);
		//db.logMessage(msg);
		switch (dat?.type)
		{
			case "open":
				
				live.state = dat.type;

				con.query(FighterInfo.select,[live.fighters.Red,live.fighters.Blue],function (err, result) {
					if (err) throw err;
					console.log(result);
				});

				break;
				
		}
	});
	await sc.connect();
	console.log("listening to chat...");

	////////////////////////////////////////////////////////////////
	// Set up web server and endpoints
	const ws = new webServer();

	// Endpoint to get live status, eventually make this a server-side event listener when a UI is constructed
	ws.app.get("/api/live.json", (req, res) =>
	{
		res.json(live);
	});

	ws.start();

}
