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
    title: string;
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
        console.log(`Checking for new tweets (RSS-Bridge)... Loaded ${config.twitter.rssBridgeUrls.length} bridges.`);

        for (const username of config.monitoredAccounts) {
            let success = false;

            // Try instances until one works
            for (const bridgeUrl of config.twitter.rssBridgeUrls) {
                if (success) break;

                try {
                    // Construct RSS-Bridge URL for Twitter
                    // Format: /?action=display&bridge=Twitter&context=By+username&u=USERNAME&format=Atom
                    const rssUrl = `${bridgeUrl}/?action=display&bridge=Twitter&context=By+username&u=${username}&format=Atom`;
                    console.log(`Fetching RSS from ${bridgeUrl}...`);

                    const feed = await this.parser.parseURL(rssUrl);

                    if (!feed.items || feed.items.length === 0) {
                        console.log(`No items found for ${username} on ${bridgeUrl}`);
                    }

                    // RSS feeds usually have the newest item first
                    const items = feed.items as unknown as CustomItem[];

                    // VALIDATION: Check if the feed returned an error disguised as an item
                    if (items.length > 0) {
                        const firstItem = items[0];
                        if (firstItem.title === 'Error' ||
                            (firstItem.content && firstItem.content.includes('Exception')) ||
                            (firstItem.content && firstItem.content.includes('404 Not Found')) ||
                            (firstItem.content && firstItem.content.includes('403 Forbidden'))) {
                            console.log(`Bridge ${bridgeUrl} returned an error item. Skipping.`);
                            continue; // Try next bridge
                        }
                    }

                    success = true; // Mark as successful ONLY after passing validation

                    const lastSeenId = this.lastTweets[username];

                    // Helper to extract Tweet ID from any URL
                    const getTweetId = (url: string): string | null => {
                        if (!url) return null;
                        const match = url.match(/\/status\/(\d+)/);
                        return match ? match[1] : null;
                    };

                    const lastSeenTweetId = getTweetId(lastSeenId);

                    // Find the index of the last seen tweet by matching IDs
                    const lastSeenIndex = items.findIndex(item => {
                        const itemId = getTweetId(item.link || item.guid);
                        return itemId && lastSeenTweetId && itemId === lastSeenTweetId;
                    });

                    let newItems: CustomItem[] = [];

                    if (lastSeenIndex === -1) {
                        if (!lastSeenId) {
                            // First run: Post the latest one to start the chain
                            if (items.length > 0) newItems = [items[0]];
                        } else {
                            // Last seen tweet not found. Assume missed tweets.
                            console.log(`Last seen tweet ${lastSeenTweetId} not found in feed. Assuming all ${items.length} items are new.`);
                            newItems = items.slice(0, 5).reverse();
                        }
                    } else {
                        // We found the last seen tweet.
                        newItems = items.slice(0, lastSeenIndex).reverse();
                    }

                    if (newItems.length > 0) {
                        console.log(`Found ${newItems.length} new tweets for ${username}`);
                    }

                    for (const newestItem of newItems) {
                        const currentId = newestItem.guid || newestItem.link;

                        // Double check individual item for error
                        if (newestItem.title === 'Error' || (newestItem.content && newestItem.content.includes('Exception'))) continue;

                        // Force conversion to twitter.com for the embed link
                        let finalUrl = newestItem.link;
                        try {
                            // Check if it's a valid tweet URL (must contain /status/)
                            if (!finalUrl.includes('/status/')) {
                                console.log(`Invalid tweet URL: ${finalUrl}. Skipping.`);
                                continue;
                            }
                            finalUrl = finalUrl.replace(/^https?:\/\/[^\/]+/, 'https://twitter.com');
                        } catch (e) {
                            console.error('Error parsing URL', e);
                        }

                        console.log(`New tweet from ${username}: ${finalUrl}`);

                        const cleanText = newestItem.contentSnippet || newestItem.content || '';

                        let imageUrl: string | undefined;
                        if (newestItem.content) {
                            const imgMatch = newestItem.content.match(/<img[^>]+src="([^">]+)"/);
                            if (imgMatch && imgMatch[1]) {
                                imageUrl = imgMatch[1];
                            }
                        }

                        await callback(cleanText, username, finalUrl, imageUrl);

                        this.lastTweets[username] = finalUrl; // Save the twitter.com URL as the ID
                        this.saveLastTweets();
                    }

                } catch (error: any) {
                    console.error(`Error with bridge ${bridgeUrl}:`, error.message || error);
                    // Continue to next bridge
                }
            }

            if (!success) {
                console.error(`Failed to fetch tweets for ${username} from ALL bridges.`);
            }
        }
    }
}
