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
			},
			{
				rxp: /^Bets are locked\. (.+?) \((.+?)\) - \$(.+?), (.+?) \((.+?)\) - \$(.+?)$/,
				fnc: ([f1,s1,b1,f2,s2,b2]) => ({type: "locked", f1, s1: Number(s1), b1: Number(b1.replace(/\D+/g, "")), f2, s2: Number(s2), b2: Number(b2.replace(/\D+/g, ""))})
			},
			{
				rxp: /^(.+?) wins! Payouts to Team (.+?)\. (.+?) more matches until the next tournament!$/,
				fnc: ([winner, team, remaining]) => ({type: "payout", winner, team, remaining: Number(remaining)})
			},
			{
				rxp: /^(.+?) wins! Payouts to Team (.+?)\. Tournament mode will be activated after the next match!$/,
				fnc: ([winner, team]) => ({type: "payout", winner, team, remaining: 0})
			},
			{
				rxp: /^(.+?) wins! Payouts to Team (.+?)\. (.+?) characters are left in the bracket!$/,
				fnc: ([winner, team, remaining]) => ({type: "payout", winner, team, remaining: Number(remaining)})
			},
			{
				rxp: /^(.+?) wins! Payouts to Team (.+?)\. FINAL ROUND! Stay tuned for exhibitions after the tournament!$/,
				fnc: ([winner, team]) => ({type: "payout", winner, team, remaining: 0})
			},
			{
				rxp: /^(.+?) wins! Payouts to Team (.+?)\. (.+?) (.+?) exhibition matches left!$/,
				fnc: ([winner, team, remaining]) => ({type: "payout", winner, team, remaining: Number(remaining)})
			},
			{
				rxp: /^wtfSalt  ♫  (.*?) - (.*?)$/,
				fnc: ([artist, song]) => ({type: "music", artist, song})
			},
			{
				rxp: /^(.*?) by (.*?), (.*?) by (.*?)$/,
				fnc: ([f1, a1, f2, a2]) => ({type: "authors", f1, a1, f2, a2})
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