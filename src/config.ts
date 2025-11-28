import dotenv from 'dotenv';

dotenv.config();

export const config = {
    discord: {
        token: process.env.DISCORD_TOKEN || '',
        channelId: process.env.DISCORD_CHANNEL_ID || '',
    },
    twitter: {
        // List of public Nitter instances to try (failover)
        nitterUrls: [
            'https://nitter.poast.org',
            'https://nitter.privacydev.net',
            'https://nitter.net',
            'https://nitter.unixfox.eu',
            'https://nitter.1d4.us',
            'https://nitter.kavin.rocks',
            'https://nitter.fdn.fr',
            'https://nitter.namazso.eu',
            'https://nitter.nixnet.services'
        ],
    },
    // List of Twitter usernames to monitor
    monitoredAccounts: [
        'Hytale',
        'Noxywoxy',
        'Simon_Hypixel'
    ]
};
