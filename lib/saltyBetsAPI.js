"use strict";
const https = require("https");
const zlib = require("zlib");

module.exports = class saltyBetsAPI
{
	static getState()
	{
		return getSalty("/state.json");
	}

	static getZData()
	{
		return getSalty("/zdata.json");
	}
}

// Saltybet API direct access by specified path
function getSalty(path)
{
	return new Promise((resolve, reject) =>
	{
		https.get(
		{
			host: "www.saltybet.com",
			path,
			headers: {"Accept-Encoding": "br"} 
		}, res =>
		{
			var body = [];
			res.pipe(zlib.createBrotliDecompress())
			.on("error", reject)
			.on("data", chunk => body.push(chunk))
			.on("end", () => resolve(JSON.parse(Buffer.concat(body))));
		});
	});
}