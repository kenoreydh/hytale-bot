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
        console.log('Checking for new tweets (RSS-Bridge)...');

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
                        continue; // Try next instance if empty (might be blocked)
                    }
                }

            if (!success) {
                    console.error(`Failed to fetch tweets for ${username} from ALL bridges.`);
                }
            }
        }
    }
