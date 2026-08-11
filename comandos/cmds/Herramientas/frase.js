const sharp = require('sharp');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const QcConfig = require('../../sistema/Modelos/qc/QcConfiguracion');

module.exports = {
  name: 'quote',
  alias: ['q', 'cita', 'qc'],
  description: 'Genera citas personalizadas e integra ajustes de grupo con Mongoose.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const rawText = Array.isArray(texto) ? texto.join(' ') : (texto || '');
    const textArgs = rawText.trim();

    // ==========================================
    // GALERÍA DE TEMAS CON ELEMENTOS SVG (Luna, Estrellas, Objetos, etc.)
    // ==========================================
    const themeSvgElements = {
      luna: {
        bg: '#0f172a',
        svg: `<circle cx="1050" cy="150" r="100" fill="#fef08a" opacity="0.8"/>
              <circle cx="1010" cy="130" r="85" fill="#0f172a"/>
              <circle cx="920" cy="220" r="4" fill="#ffffff" opacity="0.9"/>
              <circle cx="1120" cy="280" r="3" fill="#ffffff" opacity="0.7"/>`
      },
      estrellas: {
        bg: '#050515',
        svg: `<circle cx="800" cy="100" r="3" fill="#ffffff"/>
              <circle cx="950" cy="180" r="5" fill="#fef08a" opacity="0.9"/>
              <circle cx="1100" cy="80" r="4" fill="#ffffff"/>
              <circle cx="880" cy="300" r="3" fill="#ffffff"/>
              <circle cx="1020" cy="420" r="4" fill="#60a5fa"/>
              <path d="M 1050 150 L 1055 165 L 1070 170 L 1055 175 L 1050 190 L 1045 175 L 1030 170 L 1045 165 Z" fill="#ffffff" opacity="0.8"/>`
      },
      geometria: {
        bg: '#181825',
        svg: `<polygon points="900,100 1150,200 1000,500" fill="none" stroke="#a855f7" stroke-width="3" opacity="0.4"/>
              <polygon points="800,300 1050,400 900,600" fill="none" stroke="#ec4899" stroke-width="2" opacity="0.3"/>
              <circle cx="1000" cy="300" r="120" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="8 8" opacity="0.5"/>`
      },
      cyberpunk: {
        bg: '#09090b',
        svg: `<line x1="600" y1="500" x2="1200" y2="500" stroke="#f43f5e" stroke-width="4" opacity="0.8"/>
              <line x1="600" y1="530" x2="1200" y2="530" stroke="#06b6d4" stroke-width="2" opacity="0.6"/>
              <rect x="900" y="100" width="180" height="180" fill="none" stroke="#facc15" stroke-width="3" opacity="0.5"/>
              <circle cx="990" cy="190" r="60" fill="#f43f5e" opacity="0.3"/>`
      },
      neon: {
        bg: '#030712',
        svg: `<circle cx="950" cy="315" r="180" fill="none" stroke="#22d3ee" stroke-width="6" opacity="0.6"/>
              <circle cx="950" cy="315" r="140" fill="none" stroke="#f43f5e" stroke-width="4" opacity="0.5"/>`
      },
      miku: {
        bg: '#042f2e',
        svg: `<path d="M 850 0 Q 950 300 1200 100" stroke="#39C5BB" stroke-width="12" fill="none" opacity="0.6"/>
              <path d="M 800 100 Q 980 400 1200 200" stroke="#06b6d4" stroke-width="6" fill="none" opacity="0.4"/>
              <circle cx="1050" cy="200" r="8" fill="#39C5BB"/>`
      },
      atardecer: {
        bg: '#2e1065',
        svg: `<circle cx="950" cy="380" r="140" fill="#fb923c" opacity="0.8"/>
              <line x1="700" y1="380" x2="1200" y2="380" stroke="#2e1065" stroke-width="6"/>
              <line x1="720" y1="410" x2="1180" y2="410" stroke="#2e1065" stroke-width="8"/>
              <line x1="750" y1="440" x2="1150" y2="440" stroke="#2e1065" stroke-width="10"/>`
      },
      espacio: {
        bg: '#020617',
        svg: `<ellipse cx="980" cy="250" rx="160" ry="40" fill="none" stroke="#38bdf8" stroke-width="6" transform="rotate(-20 980 250)" opacity="0.7"/>
              <circle cx="980" cy="250" r="70" fill="#e0f2fe" opacity="0.9"/>
              <circle cx="750" cy="120" r="3" fill="#ffffff"/>
              <circle cx="1150" cy="450" r="4" fill="#ffffff"/>`
      },
      noche: {
        bg: '#090d16',
        svg: `<path d="M 750 630 L 850 400 L 950 630 Z" fill="#1e293b" opacity="0.8"/>
              <path d="M 900 630 L 1020 350 L 1140 630 Z" fill="#0f172a" opacity="0.9"/>
              <circle cx="1000" cy="180" r="50" fill="#f8fafc" opacity="0.8"/>`
      },
      minimal: {
        bg: '#18181b',
        svg: `<rect x="850" y="150" width="200" height="300" fill="none" stroke="#52525b" stroke-width="2"/>
              <line x1="800" y1="480" x2="1100" y2="480" stroke="#a1a1aa" stroke-width="2"/>`
      }
    };

    function parseColor(colorInput) {
      if (!colorInput) return null;
      const c = colorInput.toLowerCase().trim();
      const colorMap = {
        amarillo: '#facc15',
        rojo: '#ef4444',
        azul: '#3b82f6',
        verde: '#22c55e',
        blanco: '#ffffff',
        negro: '#000000',
        rosa: '#ec4899',
        morado: '#a855f7',
        naranja: '#f97316',
        gris: '#9ca3af',
        cyan: '#06b6d4',
        turquesa: '#39C5BB'
      };
      return colorMap[c] || (colorInput.startsWith('#') ? colorInput : null);
    }

    const escapeXml = (str) =>
      str.replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;')
         .replace(/'/g, '&apos;');

    // Cargar o crear configuración en MongoDB
    let groupConfig;
    try {
      groupConfig = await QcConfig.findOne({ groupId: from });
      if (!groupConfig) {
        groupConfig = new QcConfig({ groupId: from });
      }
    } catch (e) {
      console.error('Error al conectar con Mongoose en QC:', e);
      groupConfig = { color: '#ffffff', theme: null, customBgBase64: null };
    }

    const args = textArgs.split(' ');
    const subCommand = args[0]?.toLowerCase();
    const valueParam = args[1]?.toLowerCase();

    // ==========================================
    // 1. REINICIAR TODO A PREDETERMINADO (/qc reset)
    // ==========================================
    if (subCommand === 'reset' || subCommand === 'resetall') {
      if (groupConfig.save) {
        groupConfig.color = '#ffffff';
        groupConfig.theme = null;
        groupConfig.customBgBase64 = null;
        await groupConfig.save();
      }
      return sock.sendMessage(from, { text: '🩵 _Se han restablecido todas las configuraciones de citas del grupo a sus valores predeterminados._' }, { quoted: m });
    }

    // ==========================================
    // 2. GESTIÓN DE CONFIGURACIÓN VIA /qc
    // ==========================================

    // A) COLOR DE TEXTO (/qc setcolor amarillo)
    if (subCommand === 'setcolor') {
      if (valueParam === 'del') {
        if (groupConfig.save) {
          groupConfig.color = '#ffffff';
          await groupConfig.save();
        }
        return sock.sendMessage(from, { text: '🩵 _Se restableció el color de texto a blanco._' }, { quoted: m });
      }

      const newColor = parseColor(valueParam);
      if (!newColor) {
        return sock.sendMessage(from, { text: '🩵 _Escribe un color válido. Ejemplo: `/qc setcolor amarillo`_' }, { quoted: m });
      }

      if (groupConfig.save) {
        groupConfig.color = newColor;
        await groupConfig.save();
      }
      return sock.sendMessage(from, { text: `🩵 _Color de texto predeterminado guardado:_ *${valueParam}*` }, { quoted: m });
    }

    // B) COLOR DE FONDO (/qc setfondo amarillo)
    if (subCommand === 'setfondo' || subCommand === 'setbgcolor') {
      if (valueParam === 'del') {
        if (groupConfig.save) {
          groupConfig.theme = null;
          await groupConfig.save();
        }
        return sock.sendMessage(from, { text: '🩵 _Se restableció el color de fondo a negro._' }, { quoted: m });
      }

      const newBgColor = parseColor(valueParam);
      if (!newBgColor) {
        return sock.sendMessage(from, { text: '🩵 _Escribe un color de fondo válido. Ejemplo: `/qc setfondo amarillo`_' }, { quoted: m });
      }

      if (groupConfig.save) {
        groupConfig.theme = newBgColor;
        groupConfig.customBgBase64 = null;
        await groupConfig.save();
      }
      return sock.sendMessage(from, { text: `🩵 _Color de fondo guardado para este grupo:_ *${valueParam}*` }, { quoted: m });
    }

    // C) TEMA ILUSTRADO O FOTO DE FONDO (/qc settema luna)
    if (subCommand === 'settema') {
      if (valueParam === 'del') {
        if (groupConfig.save) {
          groupConfig.theme = null;
          groupConfig.customBgBase64 = null;
          await groupConfig.save();
        }
        return sock.sendMessage(from, { text: '🩵 _Se eliminó el tema y la imagen de fondo guardada._' }, { quoted: m });
      }

      // Si responde o adjunta una imagen
      const isImage = m.message?.imageMessage || m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      if (isImage) {
        try {
          const targetMsg = m.message?.imageMessage ? m : { message: m.message.extendedTextMessage.contextInfo.quotedMessage };
          const buffer = await downloadMediaMessage(targetMsg, 'buffer', {});
          if (groupConfig.save) {
            groupConfig.customBgBase64 = buffer.toString('base64');
            groupConfig.theme = null;
            await groupConfig.save();
          }
          return sock.sendMessage(from, { text: '🩵 _¡Imagen guardada como fondo de citas para este grupo!_' }, { quoted: m });
        } catch (err) {
          console.error('Error al guardar la imagen:', err);
          return sock.sendMessage(from, { text: '🩵 _Error al descargar la imagen._' }, { quoted: m });
        }
      }

      if (valueParam && (themeSvgElements[valueParam] || parseColor(valueParam))) {
        if (groupConfig.save) {
          groupConfig.theme = valueParam;
          groupConfig.customBgBase64 = null;
          await groupConfig.save();
        }
        return sock.sendMessage(from, { text: `🩵 _Tema guardado para este grupo:_ *${valueParam}*` }, { quoted: m });
      }

      return sock.sendMessage(from, { 
        text: `🩵 _Temas disponibles: ${Object.keys(themeSvgElements).join(', ')}.\nO responde a una imagen usando \`/qc settema\`._` 
      }, { quoted: m });
      }// ==========================================
    // 3. DETECTAR IMAGEN EN EL MENSAJE O CITADO DIRECTO
    // ==========================================
    const isDirectImage = m.message?.imageMessage;
    const quotedMsgObj = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isQuotedImage = quotedMsgObj?.imageMessage;

    let localImageBuffer = null;

    if (isDirectImage) {
      try {
        localImageBuffer = await downloadMediaMessage(m, 'buffer', {});
      } catch (e) {
        console.error('Error descargando imagen directa:', e);
      }
    } else if (isQuotedImage) {
      try {
        const targetMsg = { message: quotedMsgObj };
        localImageBuffer = await downloadMediaMessage(targetMsg, 'buffer', {});
      } catch (e) {
        console.error('Error descargando imagen citada:', e);
      }
    }

    // ==========================================
    // 4. EXTRAER TEXTO Y PARAMETROS DE COLORES Y TEMAS
    // ==========================================
    const quoted = quotedMsgObj;
    const quotedParticipant = m.message?.extendedTextMessage?.contextInfo?.participant || m.key.participant || from;

    let quoteText = '';
    let authorJid = quotedParticipant;
    let inlineTextColor = null;
    let inlineBgColor = null;

    let inputString = textArgs;

    // Procesar flags directos: "fondo <color>" y "tema <tema>"
    if (inputString) {
      if (inputString.includes('fondo ')) {
        const parts = inputString.split('fondo ');
        const possibleColor = parts[1].trim().split(' ')[0];
        if (parseColor(possibleColor)) {
          inlineBgColor = parseColor(possibleColor);
          inputString = (parts[0] + parts[1].replace(possibleColor, '')).trim();
        }
      }

      if (inputString.includes('tema ')) {
        const parts = inputString.split('tema ');
        const possibleTheme = parts[1].trim().split(' ')[0].toLowerCase();
        if (themeSvgElements[possibleTheme] || parseColor(possibleTheme)) {
          inlineBgColor = possibleTheme;
          inputString = (parts[0] + parts[1].replace(possibleTheme, '')).trim();
        }
      }
    }

    if (quoted) {
      quoteText = quoted.conversation || 
                  quoted.extendedTextMessage?.text || 
                  quoted.imageMessage?.caption || '';
      
      if (inputString) {
        const words = inputString.split(' ');
        if (words[0]) inlineTextColor = parseColor(words[0]);
        if (words[1] && !inlineBgColor) inlineBgColor = parseColor(words[1]) || words[1].toLowerCase();
      }
    } else if (inputString) {
      const words = inputString.split(' ');
      
      // Probar si las últimas 2 palabras son colores
      if (words.length >= 3 && !inlineBgColor) {
        const potentialColor1 = parseColor(words[words.length - 2]);
        const potentialColor2 = parseColor(words[words.length - 1]) || words[words.length - 1].toLowerCase();

        if (potentialColor1 && (potentialColor2 || themeSvgElements[potentialColor2])) {
          inlineTextColor = potentialColor1;
          inlineBgColor = potentialColor2;
          quoteText = words.slice(0, -2).join(' ');
        }
      }
      
      // Probar si la última palabra es un color
      if (!quoteText && words.length >= 2) {
        const potentialColor1 = parseColor(words[words.length - 1]);
        if (potentialColor1) {
          inlineTextColor = potentialColor1;
          quoteText = words.slice(0, -1).join(' ');
        }
      }

      if (!quoteText) {
        quoteText = inputString;
      }
      authorJid = m.key.participant || from;
    } else if (isDirectImage && m.message?.imageMessage?.caption) {
      quoteText = m.message.imageMessage.caption.replace(/\/qc|\/q|\/cita/gi, '').trim();
      authorJid = m.key.participant || from;
    } else {
      return sock.sendMessage(from, { text: '🩵 _Escribe un texto, responde a un mensaje o adjunta una imagen para crear la cita._' }, { quoted: m });
    }

    // Determinación final de Colores y Temas
    const finalTextColor = inlineTextColor || groupConfig.color || '#ffffff';
    const selectedBgOrTheme = inlineBgColor || groupConfig.theme;

    let bgColorHex = '#000000';
    let activeThemeSvg = '';

    if (selectedBgOrTheme) {
      if (themeSvgElements[selectedBgOrTheme]) {
        bgColorHex = themeSvgElements[selectedBgOrTheme].bg;
        activeThemeSvg = themeSvgElements[selectedBgOrTheme].svg;
      } else {
        bgColorHex = parseColor(selectedBgOrTheme) || '#000000';
      }
    }

    const MAX_CHARS = 140;
    if (quoteText.length > MAX_CHARS) {
      quoteText = quoteText.substring(0, MAX_CHARS) + '...';
    }

    try {
      let pushName = m.pushName || 'Usuario';
      try {
        const contact = await sock.getContact?.(authorJid);
        pushName = contact?.name || contact?.notify || m.pushName || authorJid.split('@')[0];
      } catch {
        pushName = authorJid.split('@')[0];
      }

      const width = 1200;
      const height = 630;

      // Prioridad de Fondo
      let backgroundBuffer;
      if (localImageBuffer) {
        backgroundBuffer = localImageBuffer;
      } else if (groupConfig.customBgBase64) {
        backgroundBuffer = Buffer.from(groupConfig.customBgBase64, 'base64');
      } else {
        try {
          const profilePicUrl = await sock.profilePictureUrl(authorJid, 'image');
          const response = await fetch(profilePicUrl);
          backgroundBuffer = Buffer.from(await response.arrayBuffer());
        } catch {
          backgroundBuffer = Buffer.from(
            `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111827"/></svg>`
          );
        }
      }

      const wrapText = (str, maxCharsPerLine = 20) => {
        const words = str.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
          if (word.length > maxCharsPerLine) {
            if (currentLine.trim()) {
              lines.push(currentLine.trim());
              currentLine = '';
            }
            for (let i = 0; i < word.length; i += maxCharsPerLine) {
              lines.push(word.substring(i, i + maxCharsPerLine));
            }
          } else if ((currentLine + word).length > maxCharsPerLine) {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
          } else {
            currentLine += word + ' ';
          }
        });

        if (currentLine.trim()) lines.push(currentLine.trim());

        const lineHeight = 46;
        const startY = (height / 2) - ((lines.length - 1) * lineHeight / 2) - 10;

        return lines.map((line, index) => 
          `<tspan x="75%" y="${startY + (index * lineHeight)}">${escapeXml(line)}</tspan>`
        ).join('');
      };

      const cleanName = escapeXml(pushName);
      const formattedTextSpans = wrapText(quoteText);

      const processedBg = await sharp(backgroundBuffer)
        .resize(width, height, { fit: 'cover', position: 'center' })
        .grayscale()
        .toBuffer();

      const svgOverlay = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="${bgColorHex}" stop-opacity="0.2" />
              <stop offset="45%" stop-color="${bgColorHex}" stop-opacity="0.85" />
              <stop offset="75%" stop-color="${bgColorHex}" stop-opacity="1.0" />
            </linearGradient>
          </defs>

          <rect width="100%" height="100%" fill="url(#grad)" />

          ${activeThemeSvg}

          <path d="M 60 70 Q 60 40 90 40 L 90 60 Q 75 60 75 80 L 90 80 L 90 110 L 60 110 Z M 110 70 Q 110 40 140 40 L 140 60 Q 125 60 125 80 L 140 80 L 140 110 L 110 110 Z" fill="${finalTextColor}" opacity="0.8" />

          <text text-anchor="middle" 
                fill="${finalTextColor}" 
                font-family="sans-serif" 
                font-size="36" 
                font-weight="bold">
            ${formattedTextSpans}
          </text>

          <text x="75%" y="85%" 
                text-anchor="middle" 
                fill="#d1d5db" 
                font-family="sans-serif" 
                font-size="24" 
                font-weight="300">
            - ${cleanName}
          </text>
        </svg>
      `;

      const finalImage = await sharp(processedBg)
        .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
        .png()
        .toBuffer();

      await sock.sendMessage(from, { image: finalImage }, { quoted: m });

    } catch (err) {
      console.error('Error en plugin qc:', err);
      await sock.sendMessage(from, { text: '🩵 _Ocurrió un error al generar la cita._' }, { quoted: m });
    }
  }
};
