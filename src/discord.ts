import { Client, GatewayIntentBits, TextChannel, EmbedBuilder } from 'discord.js';
import { config } from './config';

export class DiscordBot {
    private client: Client;

    constructor() {
        this.client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
        });

        this.client.once('ready', () => {
            console.log(`Discord bot logged in as ${this.client.user?.tag}`);
        });
    }

    public async login(): Promise<void> {
        await this.client.login(config.discord.token);
    }

    public async sendTweet(author: string, originalText: string, translatedText: string, url: string, imageUrl?: string, profileImage?: string): Promise<void> {
        const channel = await this.client.channels.fetch(config.discord.channelId) as TextChannel;
        if (!channel) {
            console.error('Discord channel not found');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Nuevo Tweet de @${author}`)
            .setURL(url)
            .setAuthor({ name: author, iconURL: profileImage })
            .setDescription(translatedText)
            .setTimestamp()
            .setFooter({ text: 'Hytale News Bot' });

        // Add image if available
        if (imageUrl) {
            embed.setImage(imageUrl);
        }

        await channel.send({ embeds: [embed] });
    }

    public async getLastPublishedTweets(): Promise<Record<string, string>> {
        const lastTweets: Record<string, string> = {};
        try {
            const channel = await this.client.channels.fetch(config.discord.channelId) as TextChannel;
            if (!channel) return lastTweets;

            // Fetch last 50 messages
            const messages = await channel.messages.fetch({ limit: 50 });

            for (const msg of messages.values()) {
                // Check if message is from this bot
                if (msg.author.id !== this.client.user?.id) continue;
                if (msg.embeds.length === 0) continue;

                const embed = msg.embeds[0];

                // Extract username from Title "Nuevo Tweet de @Username"
                if (embed.title && embed.title.includes('Nuevo Tweet de @')) {
                    const username = embed.title.split('@')[1];

                    // If we haven't found a tweet for this user yet (since we iterate new->old, first one is newest)
                    if (username && !lastTweets[username]) {
                        // The URL is in the embed url field
                        if (embed.url) {
                            lastTweets[username] = embed.url;
                        }
                    }
                }
            }
            console.log('Restored last tweets from Discord history:', lastTweets);
        } catch (error) {
            console.error('Error fetching history from Discord:', error);
        }
        return lastTweets;
    }
}
