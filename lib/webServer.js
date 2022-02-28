"use strict";
const os = require("os");
const express = require("express");
const compression = require("compression");

module.exports = class webServer
{
	constructor()
	{
		// Set up Web server, add plugins as needed
		this.app = express();
		this.app.use(compression());
		this.app.use(ServerSideEvents);

		// Set up file server to serve UI compontnets from public folder
		this.app.use("/", express.static("public",
		{
			extensions: ["htm", "html"],
			index: "index.html"
		}));
	
		// Add a status endpoint for testing and performance monitoring
		this.app.get("/api/status.json", (req, res) =>
		{
			res.json(
			{
				querystring: req.query,
				cpus: os.cpus(),
				freemem: os.freemem(),
				hostname: os.hostname(),
				totalmem: os.totalmem(),
				loadavg: os.loadavg(),
				platform: os.platform(),
				temppath: os.tmpdir(),
				uptime: os.uptime()
			});
		});
	}

	// Bring the server online on port specified in envirionment variable or 80 by default
	start()
	{
		this.server = this.app.listen(process.env.PORT || 3142, () => console.log(`Worker ${process.pid} listening on port ${process.env.PORT || 80}`));
	}

	// Bring the server down on command
	stop()
	{
		return (this.server) ? new Promise((r) => this.server.close(r)): null;
	}
}

// Server Side Event plugin for providing live updates
function ServerSideEvents(req, res, nxt)
{
	res.sendEvent = (d) =>
	{
		if (res.getHeader("Content-Type") != "text/event-stream")
		{
			res.setTimeout(0);
			res.writeHead(200,
			{
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				"Connection": "keep-alive"
			});
		}
		if (d != undefined)
		{
			res.write(`data: ${JSON.stringify(d)}\n\n`);
			res.flush();
		}
	};
	nxt();
}