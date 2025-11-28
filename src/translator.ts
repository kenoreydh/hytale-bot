import { translate } from 'google-translate-api-x';

export async function translateText(text: string, targetLang: string = 'es'): Promise<string> {
    try {
        const res = await translate(text, { to: targetLang });
        return res.text;
    } catch (error) {
        console.error('Error translating text:', error);
        return text; // Return original text if translation fails
    }
}
