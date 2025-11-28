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
    // 3. Restore state from Discord History (Persistence)
    console.log('Restoring state from Discord...');
    const lastTweets = await discordBot.getLastPublishedTweets();
    twitterMonitor.setLastTweets(lastTweets);
    // 4. Start Polling
    // Check every 10 minutes (600000 ms) to be polite to Nitter instances
    const POLL_INTERVAL = 10 * 60 * 1000;
    const checkForTweets = async () => {
        await twitterMonitor.checkNewTweets(async (text, author, url, imageUrl) => {
            console.log(`Processing tweet from ${author}...`);
            // Translate
            const translated = await translateText(text, 'es');
            // Send to Discord
            await discordBot.sendTweet(author, text, translated, url, imageUrl);
        });
    };
    // Run immediately on start
    await checkForTweets();
    // Schedule
    setInterval(checkForTweets, POLL_INTERVAL);
}
main().catch(console.error);
