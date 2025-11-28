import dotenv from 'dotenv';

dotenv.config();

export const config = {
    discord: {
        token: process.env.DISCORD_TOKEN || '',
        channelId: process.env.DISCORD_CHANNEL_ID || '',
    },
    twitter: {
        nitterUrl: process.env.NITTER_URL || 'https://nitter.net',
    },
    // List of Twitter usernames to monitor
    monitoredAccounts: [
        'Hytale',
        'Noxywoxy',
        'Simon_Hypixel'
    ]
};
