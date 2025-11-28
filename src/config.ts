import dotenv from 'dotenv';
dotenv.config();
export const config = {
    discord: {
        token: process.env.DISCORD_TOKEN || '',
        channelId: process.env.DISCORD_CHANNEL_ID || '',
    },
    twitter: {
        // List of public RSS-Bridge instances to try (Round Robin)
        rssBridgeUrls: [
            'https://bridge01.rss-bridge.org',
            'https://rss-bridge.flossboxin.org.in',
            'https://rss-bridge.cheredeprince.net',
            'https://rss-bridge.sans-nuage.fr',
            'https://rss-bridge.lewd.tech',
            'https://wtf.roflcopter.fr/rss-bridge',
            'https://rss.nixnet.services',
            'https://rss-bridge.ggc-project.de',
            'https://rssbridge.bus-hit.me',
            'https://feeds.proxeuse.com'
        ],
    },
    // List of Twitter usernames to monitor
    monitoredAccounts: [
        'Hytale',
        'Noxywoxy',
        'Simon_Hypixel'
    ]
};
