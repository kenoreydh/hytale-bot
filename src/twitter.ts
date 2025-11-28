import Parser from 'rss-parser';
import { config } from './config';
import * as fs from 'fs';
import * as path from 'path';
const LAST_TWEET_FILE = path.join(__dirname, '../last_tweets.json');
interface LastTweets {
    [username: string]: string; // username -> lastTweetGuid (or URL)
}
// Define the shape of the RSS item we expect
interface CustomItem {
    link: string;
    pubDate: string;
    author: string;
    content: string;
    contentSnippet: string;
    guid: string;
    isoDate: string;
}
export class TwitterMonitor {
    private parser: Parser<CustomItem>;
    private lastTweets: LastTweets = {};
    constructor() {
        this.parser = new Parser({
            customFields: {
                item: ['author'],
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            requestOptions: {
                timeout: 3000
            }
        });
        this.loadLastTweets();
    }
    private loadLastTweets() {
        if (fs.existsSync(LAST_TWEET_FILE)) {
            this.lastTweets = JSON.parse(fs.readFileSync(LAST_TWEET_FILE, 'utf-8'));
        }
    }
    private saveLastTweets() {
        fs.writeFileSync(LAST_TWEET_FILE, JSON.stringify(this.lastTweets, null, 2));
    }
    public setLastTweets(tweets: LastTweets) {
        // Merge with existing (file might have some, Discord might have others)
        // Discord history takes precedence as it is the "public truth"
        this.lastTweets = { ...this.lastTweets, ...tweets };
        this.saveLastTweets();
    }
    public async checkNewTweets(callback: (tweetText: string, author: string, url: string, imageUrl?: string) => Promise<void>) {
        console.log('Checking for new tweets (RSS)...');
        for (const username of config.monitoredAccounts) {
            try {
                // Construct RSS URL
                const rssUrl = `${config.twitter.nitterUrl}/${username}/rss`;
                console.log(`Fetching RSS: ${rssUrl}`);
                const feed = await this.parser.parseURL(rssUrl);
                if (!feed.items || feed.items.length === 0) {
                    console.log(`No items found for ${username}`);
                    continue;
                }
                // RSS feeds usually have the newest item first
                const items = feed.items as unknown as CustomItem[];
                const lastSeenId = this.lastTweets[username];
                // Find the index of the last seen tweet
                const lastSeenIndex = items.findIndex(item => (item.guid || item.link) === lastSeenId);
                let newItems: CustomItem[] = [];
                if (lastSeenIndex === -1) {
                    // Last seen tweet not found in current feed.
                    // Either it's the first run, or the last seen tweet is too old.
                    if (!lastSeenId) {
                        // First run (or restart): Just take the newest one to avoid spam
                        if (items.length > 0) newItems = [items[0]];
                    } else {
                        // We have a lastSeenId but it's not in the feed.
                        // This means we missed A LOT of tweets. To be safe, just take the newest one.
                        if (items.length > 0) newItems = [items[0]];
                    }
                } else {
                    // We found the last seen tweet.
                    // All items before it (indices 0 to lastSeenIndex - 1) are new.
                    // We want them in chronological order (Oldest New -> Newest New)
                    newItems = items.slice(0, lastSeenIndex).reverse();
                }
                for (const newestItem of newItems) {
                    const currentId = newestItem.guid || newestItem.link;
                    console.log(`New tweet from ${username}: ${currentId}`);
                    // Force conversion to twitter.com for the embed link
                    let finalUrl = newestItem.link;
                    try {
                        // If it's a full URL, replace the domain
                        finalUrl = finalUrl.replace(/^https?:\/\/[^\/]+/, 'https://twitter.com');
                    } catch (e) {
                        console.error('Error parsing URL', e);
                    }
                    // Clean up content? RSS content often has HTML.
                    const cleanText = newestItem.contentSnippet || newestItem.content || '';
                    // Try to extract image URLs from the content
                    let imageUrl: string | undefined;
                    if (newestItem.content) {
                        const imgMatch = newestItem.content.match(/<img[^>]+src="([^">]+)"/);
                        if (imgMatch && imgMatch[1]) {
                            imageUrl = imgMatch[1];
                        }
                    }
                    await callback(cleanText, username, finalUrl, imageUrl);
                    // Update last seen
                    this.lastTweets[username] = currentId;
                    this.saveLastTweets();
                }
            } catch (error) {
                console.error(`Error checking tweets for ${username} via RSS:`, error);
            }
        }
    }
}
