import { DiscordBot } from './discord';
import { TwitterMonitor } from './twitter';
import { translateText } from './translator';
import { config } from './config';
import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Hytale Bot is running!');
});

app.listen(port, () => {
    console.log(`Web server listening on port ${port}`);
});

async function main() {
    console.log('Starting Hytale News Bot (RSS Mode)...');

    // 1. Initialize Discord
    const discordBot = new DiscordBot();
    await discordBot.login();

    // 2. Initialize Twitter Monitor
    const twitterMonitor = new TwitterMonitor();
    setInterval(checkForTweets, POLL_INTERVAL);
}

main().catch(console.error);
