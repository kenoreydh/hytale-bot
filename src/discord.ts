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
}
