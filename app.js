const express = require("express");
const redis = require("redis");
const moment = require("moment");
const bluebird = require("bluebird");

bluebird.promisifyAll(redis);

const app = express();
const redisClient = redis.createClient({
	host: "127.0.0.1",
	port: 6379,
});

/**
 * Rate limit middleware
 * @param {Int} rateLimit in second
 * @return {Function} Closure
 */
const rateLimit = (rateLimit = 10, timeLimit = 60) => {
	return async (req, res, next) => {
		const timeMinute = moment().format("YYYY-MM-DD_HHMM");
		const redisKey = `${req.ip}:${req.route.path}:${timeMinute}`;

		const count = parseInt(await redisClient.getAsync(redisKey));

		if (count > rateLimit) {
			return res.status(429).json({
				code: 429,
				message: "API rate limit exceeded",
			});
		}

		// increase key limit on redis
		const trx = redisClient.multi();
		trx.incr(redisKey);
		trx.expire(redisKey, timeLimit);
		trx.execAsync();

		next();
	};
};

// Example on all request
app.get("*", rateLimit(10), async (req, res) => {
	return res.json({
		code: 200,
		message: "Hello world",
	});
});

app.listen(3000, () => {
	console.log("App run on port 3000");
});
