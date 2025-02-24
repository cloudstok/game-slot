import redis from "redis";

class RedisClient {
    private connection: any;

    constructor() {
        this.initRedis();
    }

    async initRedis() {
        if (this.connection) return; // Prevent multiple reconnects

        try {
            this.connection = redis.createClient({
                url: process.env.REDIS_URL,
                password: process.env.REDIS_PASSWORD, // Fixed env variable
            });

            this.connection.on("error", (err: any) => {
                console.error("Redis Error:", err);
            });

            await this.connection.connect();
            console.log("✅ Redis connected successfully");
        } catch (error) {
            console.error("❌ Redis connection failed:", error);
            this.connection = null;
        }
    }

    private async ensureConnection() {
        if (!this.connection) await this.initRedis();
    }

    async getDataFromRedis(key: string | number) {
        await this.ensureConnection();

        try {
            const res = await this.connection.get(key);
            return res ? JSON.parse(res) : null;
        } catch (error) {
            console.error(`Error getting key "${key}" from Redis:`, error);
            return null;
        }
    }

    async setDataToRedis(key: string | number, data: any, ttl: number = 3600) {
        await this.ensureConnection();

        try {
            const res = await this.connection.set(key, JSON.stringify(data), { EX: ttl });
            return res;
        } catch (error) {
            console.error(`Error setting key "${key}" in Redis:`, error);
            return null;
        }
    }

    async delDataFromRedis(key: string | number) {
        await this.ensureConnection();

        try {
            return await this.connection.del(key);
        } catch (error) {
            console.error(`Error deleting key "${key}" from Redis:`, error);
            return null;
        }
    }

    async clearAllDataFromRedis() {
        await this.ensureConnection();

        try {
            return await this.connection.flushAll();
        } catch (error) {
            console.error("Error clearing Redis data:", error);
            return null;
        }
    }

    async pushToList(key: string | number, data: any) {
        await this.ensureConnection();

        try {
            return await this.connection.lPush(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Error pushing to list "${key}" in Redis:`, error);
            return null;
        }
    }

    async popFromList(key: string | number) {
        await this.ensureConnection();

        try {
            const res = await this.connection.rPop(key);
            return res ? JSON.parse(res) : null;
        } catch (error) {
            console.error(`Error popping from list "${key}" in Redis:`, error);
            return null;
        }
    }
}

export const redisClient = new RedisClient();
