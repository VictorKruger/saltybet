"use strict";
const { ChatClient } = require("dank-twitch-irc");
module.exports = class saltyChat
{
	constructor(def)
	{
		// Regular expression and post-match processing function definitions
		this.eventDefs = def ||
		[
			{
				rxp: /^Bets are OPEN for (.+?) vs (.+?)! \((.+?)\)  \(matchmaking\) www\.saltybet\.com$/,
				fnc: ([f1, f2, tier]) => ({type: "open", tier, f1, f2})
			},
			{
				rxp: /^Bets are OPEN for (.+?) vs (.+?)! \((.+?)\)  tournament bracket: http:\/\/www\.saltybet\.com\/shaker\?bracket=1$/,
				fnc: ([f1, f2, tier]) => ({type: "open", tier, f1, f2})
			}
		];

		// Create new chat client and subscribe to chat message events
		this.client = new ChatClient();
		this.client.on("PRIVMSG", (msg) =>
		{
			// Ignore anything that's not the channel's bot account
			if (msg.displayName != 'WAIFU4u') return;

			// Try to parse results from regexp definitions
			var row;
			for (let def of this.eventDefs)
			{
				if (def.rxp.test(msg.messageText))
				{
					row = def.fnc(msg.messageText.match(def.rxp).slice(1));
				}
			}

			// If a listener was specified send the results to it
			if (this.listener) this.listener(msg.messageText, row);
		});
	
	}

	// Allow client to set a listener function to send messages to
	listen(l)
	{
		this.listener = l;
	}

	// Connect and join chat channel, watch events for errors/success
	connect()
	{
		return new Promise((resolve, reject) =>
		{
			this.client.on("ready", resolve);
			this.client.on("close", err => err ? reject(err) : resolve());
			this.client.connect();
			this.client.join("saltybet");
		});
	}

	// Disconnect, watch event for completed state and possible errors
	disconnect()
	{
		return new Promise((resolve, reject) =>
		{
			this.client.on("close", err => err ? reject(err) : resolve());
			this.client.close();
		});
	}
}