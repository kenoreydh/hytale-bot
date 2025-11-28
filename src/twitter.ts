import { TwitterApi } from 'twitter-api-v2';
import { config } from './config';
import * as fs from 'fs';
import * as path from 'path';

const LAST_TWEET_FILE = path.join(__dirname, '../last_tweets.json');

interface LastTweets {
    [username: string]: string; // username -> lastTweetId
}

// Map usernames to their Twitter User IDs
// You can find User IDs at: https://codeofaninja.com/tools/find-twitter-id/
const USER_IDS: { [username: string]: string } = {
    'Hytale': '718938043579637760',
    'Noxywoxy': '20222896',
    'Simon_Hypixel': '14362613'
};

export class TwitterMonitor {
    private client: TwitterApi;
    private lastTweets: LastTweets = {};

    constructor() {
        this.client = new TwitterApi(config.twitter.bearerToken);
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
        this.lastTweets = { ...this.lastTweets, ...tweets };
        this.saveLastTweets();
    }

    public async checkNewTweets(callback: (tweetText: string, author: string, url: string, imageUrl?: string) => Promise<void>) {
        console.log('Checking for new tweets (Twitter API v2)...');

        for (const username of config.monitoredAccounts) {
            try {
                const userId = USER_IDS[username];
                if (!userId) {
                    console.error(`No User ID found for ${username}`);
                    continue;
                }

                // Fetch user's timeline
                const timeline = await this.client.v2.userTimeline(userId, {
                    max_results: 10,
                    exclude: ['retweets', 'replies'],
                    'tweet.fields': ['created_at', 'entities'],
                    'media.fields': ['url', 'preview_image_url'],
                    expansions: ['attachments.media_keys']
                });

                const tweets = timeline.data.data || [];
                const includes = timeline.data.includes || {};

                if (tweets.length === 0) {
                    console.log(`No tweets found for ${username}`);
                    continue;
                }

                const lastSeenId = this.lastTweets[username];
                const lastSeenIndex = tweets.findIndex(tweet => tweet.id === lastSeenId);

                let newTweets = [];
                if (lastSeenIndex === -1) {
                    // First run or last seen tweet not in recent timeline
                    if (!lastSeenId) {
                        // First run: just post the latest one
                        newTweets = [tweets[0]];
                    } else {
                        // Missed tweets: post up to 5
                        console.log(`Last seen tweet ${lastSeenId} not found. Assuming missed tweets.`);
                        newTweets = tweets.slice(0, 5).reverse();
                    }
                } else {
                    // Found last seen tweet, post everything newer
                    newTweets = tweets.slice(0, lastSeenIndex).reverse();
                }

                if (newTweets.length > 0) {
                    console.log(`Found ${newTweets.length} new tweets for ${username}`);
                }

                for (const tweet of newTweets) {
                    const tweetUrl = `https://twitter.com/${username}/status/${tweet.id}`;
                    const tweetText = tweet.text;

                    // Extract image if present
                    let imageUrl: string | undefined;
                    if (tweet.attachments?.media_keys && includes.media) {
                        const media = includes.media.find((m: any) =>
                            tweet.attachments!.media_keys!.includes(m.media_key)
                        );
                        if (media && media.type === 'photo') {
                            imageUrl = media.url;
                        }
                    }

                    console.log(`New tweet from ${username}: ${tweetUrl}`);

                    await callback(tweetText, username, tweetUrl, imageUrl);

                    this.lastTweets[username] = tweet.id;
                    this.saveLastTweets();
                }

            } catch (error: any) {
                console.error(`Error fetching tweets for ${username}:`, error.message || error);
            }
        }
    }
}
