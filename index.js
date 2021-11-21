"use strict";
const saltyBetsAPI = require("./lib/saltyBetsAPI.js");
const saltyChat = require("./lib/saltyChat.js");
const saltyBetsDB = require("./lib/saltyBetsDB.js")
const webServer = require("./lib/webServer.js");
Main().catch(console.error);

async function Main()
{
	////////////////////////////////////////////////////////////////
	// Set up database and local status variables
	const db = new saltyBetsDB("./salty.db");
	console.log("database connected...");


	var live =
	{
		state: "starting",
		remaining: -1,
		fighters:
		{
			Red: {},
			Blue: {}
		},
		music:
		{
			artist: "",
			song: ""
		},
		website: "https://www.saltybet.com/"
	};


	////////////////////////////////////////////////////////////////
	// Set up salty chat listener
	var sc = new saltyChat();
	sc.listen((msg, dat) =>
	{
		console.log(dat || msg);
		db.logMessage(msg);
		switch (dat?.type)
		{
			case "open": // { type: 'open', tier: 'A Tier', f1: 'Red Fighter Name', f2: 'Blue Fighter Name' }
				live.state = dat.type;
				db.upsertFighter(live.fighters.Red = Object.assign(db.getFighter(dat.f1), {name: dat.f1, tier: dat.tier}));
				db.upsertFighter(live.fighters.Blue = Object.assign(db.getFighter(dat.f2), {name: dat.f2, tier: dat.tier}));
				break;
			case "locked": // { type: 'locked', f1: 'Red Fighter Name', s1: -1, b1: 20986810, f2: 'Blue Fighter Name', s2: -6, b2: 11198873 }
				live.state = dat.type;
				// <<< log bets in live store somewhere
				db.upsertFighter(Object.assign(live.fighters.Red, {name: dat.f1, streak : dat.s1}));
				db.upsertFighter(Object.assign(live.fighters.Blue, {name: dat.f2, streak : dat.s2}));
				break;
			case "payout": // { type: 'payout', winner: 'Fighter Name', team: 'Red', remaining: 18 }
				live.state = dat.type;
				live.remaining = dat.remaining;

				if (!("name" in live.fighters.Red)) break;

				// <<< Log fight results here including odds and bets
				// <<< This will provide better analytics than just streaks/tiers

				switch (dat?.team)
				{
					case "Red":
						live.fighters.Red.streak = Math.max(live.fighters.Red.streak, 0) + 1;
						live.fighters.Blue.streak = Math.min(live.fighters.Blue.streak, 0) - 1;
						break;
					case "Blue":
						live.fighters.Blue.streak = Math.max(live.fighters.Blue.streak, 0) + 1;
						live.fighters.Red.streak = Math.min(live.fighters.Red.streak, 0) - 1;
						break;
				}
				
				db.upsertFighter(live.fighters.Red);
				db.upsertFighter(live.fighters.Blue);
				break;
			case "authors":
				db.upsertFighter(Object.assign(live.fighters.Red, {name: dat.f1, author : dat.a1}));
				db.upsertFighter(Object.assign(live.fighters.Blue, {name: dat.f2, author : dat.a2}));
				break;
			case "music":
				live.music.artist = dat.artist;
				live.music.song = dat.song;
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

	// Give a full list of fighters from database
	ws.app.get("/api/fighters.json", (req, res) =>
	{
		res.json(db.listFighters());
	});
	
	ws.start();

}
