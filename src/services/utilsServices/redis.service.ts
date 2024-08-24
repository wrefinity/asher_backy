import Redis from 'ioredis';

class RedisService {
    // Redis client setup and methods
    private client: Redis

    constructor() {
        // this.client = new Redis({
        //     host: '127.0.0.1',
        //     port: 6379,
        // })
        // this.setupListeners();
    }

    private setupListeners() {
        this.client.on('connect',() => {
            console.log("Connected to Redis");
        })

        this.client.on('error', (err) => {
            console.error("Error connecting to Redis:", err);

        })
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: string, expires: number): Promise<void> {
        await this.client.set(key, value, 'EX', expires);
    }
}

export default RedisService;