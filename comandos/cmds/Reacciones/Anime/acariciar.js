const axios = require('axios');

module.exports = {
  name: 'pat',
  alias: ['caricia', 'mimar'],
  description: 'Envía una reacción animada o imagen con detalles del anime.',
  run: async (sock, m) => {
    const from = m.key.remoteJid;

    try {
      const { data } = await axios.get('https://api.nekosapi.com/v3/images/random?limit=1');
      const item = data.items[0];

      if (!item) {
        return sock.sendMessage(from, { text: '❌ No se pudo obtener la imagen.' });
      }

      const imageUrl = item.image_url;
      const animeTitle = item.anime?.title_english || item.anime?.title_japanese || 'Anime desconocido';
      const episode = item.anime?.episode || 'N/A';

      const mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const targetUser = mentionedJid ? `@${mentionedJid.split('@')[0]}` : 'alguien';

      const captionText = `✨ *@${m.sender.split('@')[0]}* acarició a ${targetUser}\n\n` +
                          `📺 *Anime:* ${animeTitle}\n` +
                          `🎬 *Episodio:* ${episode}`;

      await sock.sendMessage(from, {
        image: { url: imageUrl },
        caption: captionText,
        mentions: [m.sender, ...(mentionedJid ? [mentionedJid] : [])]
      }, { quoted: m });

    } catch (error) {
      console.error(error);
      await sock.sendMessage(from, { text: '❌ Ocurrió un error al conectar con la API de Nekos.' });
    }
  }
};
