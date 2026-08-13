const getMenuPages = (name, link) => [
  `> Hola *${name}*, yo soy *Tamaki* ₍ᐢ..ᐢ₎
> ¡Bienvenido/a a la Página 1! Menú Principal.

: ̗̀❖ *ᴜʀʟ ::* ${link}
📄 *Página 1 de 3*
> Responde a este mensaje con un número (2 o 3) para cambiar de página.`,

  `> 📥 *Sección de Descargas* (Página 2)
> Aquí puedes ver los comandos para descargar contenido.

• .play <audio>
• .video <video>
• .tiktok <url>

📄 *Página 2 de 3*
> Responde con *1* para volver al inicio o *3* para ver anime.`,

  `> 🌸 *Sección de Anime y Diversión* (Página 3)
> Explora los comandos interactivos.

• .waifu
• .neko
• .shiba

📄 *Página 3 de 3*
> Responde con *1* para ir al inicio o *2* para retroceder.`
];

module.exports = { getMenuPages };
