// ==========================================
// 1. BANCO MASIVO DE FRASES (Categorizado)
// ==========================================
const predicciones = {
    critico: [
        '💀 *Hoy no es tu día:* Si ves una cáscara de plátano, camina por la calle. Evita tomar decisiones importantes.',
        '📉 *Mala racha:* Tu señal de WiFi fallará en el peor momento posible. Mejor vete a dormir temprano.',
        '🛑 *Alerta:* El universo te está diciendo que dejes de gastar dinero en cosas que no necesitas hoy.',
        '🤡 *F en el chat:* Se te va a caer el pan con el lado de la mantequilla hacia el suelo. Fuerza.'
    ],
    neutral: [
        '🤝 *Día Normal:* Ni fu ni fa. Un día perfecto para pasar desapercibido y terminar tus pendientes.',
        '☕ *Estable:* La rutina te mantendrá a salvo hoy. Nada emocionante pasará, y a veces eso es bueno.',
        '🧊 *Día de flojera:* Tu energía está al 50%. Ideal para maratonear una serie y no salir de la cama.',
        '🍃 *Viento ligero:* Las cosas fluirán lento pero seguro. No te desesperes.'
    ],
    bueno: [
        '🔥 *¡Andas con todo!:* Encontrarás un billete olvidado en un pantalón viejo o te invitarán la comida.',
        '⚡ *Buena Vibra:* Tu crush podría responderte el mensaje que dejaste en visto hace tres días.',
        '🎵 *Inspirado:* Hoy andarás con la creatividad al 100%. Buen momento para proponer planes.',
        '😏 *Racha positiva:* Todos los semáforos se pondrán en verde para ti hoy. Aprovecha el bug.'
    ],
    epico: [
        '👑 *¡Día Legendario!:* El éxito te persigue. Si juegas algo hoy, tienes un 99% de probabilidad de ganar.',
        '🔮 *Escrito en las Estrellas:* Un golpe de suerte inesperado cambiará el rumbo de tu semana. ¡Atento!',
        '✨ *Bendecido:* Tu carisma hoy está tan alto que podrías convencer a cualquiera de lo que sea.',
        '🚀 *Modo Dios:* Nada ni nadie puede arruinar tu día hoy. Estás en tu mejor momento.'
    ]
};

// ==========================================
// 2. TEMAS VISUALES PARA LA BARRA
// ==========================================
const temasBarra = [
    { lleno: '🟢', vacio: '🔴', titulo: '🔮 PREDICCIÓN DIARIA 🔮' },
    { lleno: '⚡', vacio: '⚫', titulo: '⚡ ENERGÍA DEL DÍA ⚡' },
    { lleno: '✨', vacio: '🌫️', titulo: '✨ DESTINO DIARIO ✨' },
    { lleno: '💰', vacio: '💸', titulo: '🍀 MEDIDOR DE FORTUNA 🍀' },
    { lleno: '🚀', vacio: '🛸', titulo: '🌌 COSMOS ACTUAL 🌌' }
];

// ==========================================
// 3. FUNCIÓN HASH (Para que no cambie en todo el día)
// ==========================================
// Genera un número del 0 al 100 basado en el remitente y la fecha actual
function obtenerPorcentajeDiario(usuario) {
    const fechaActual = new Date().toISOString().slice(0, 10); // Ejemplo: "2026-07-19"
    const cadenaSemilla = usuario + fechaActual; 
    
    let hash = 0;
    for (let i = 0; i < cadenaSemilla.length; i++) {
        hash = cadenaSemilla.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Retorna un número absoluto entre 0 y 100
    return Math.abs(hash % 101);
}

module.exports = {
    name: 'suerte',
    alias: ['prediccion', 'destino'],
    description: 'Calcula tu suerte o la de un miembro del grupo para el día de hoy.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        // Validación de grupo idéntica a tus otros archivos
        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '🤷‍♂️ _Solo en grupos._' });
        }

        // Detectar si el usuario etiquetó a alguien o se lo hace a sí mismo
        const mentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const sender = m.key.participant || m.key.remoteJid;
        
        // El 'objetivo' será el etiquetado, si no hay ninguno, el remitente original
        const objetivo = mentions.length > 0 ? mentions[0] : sender;

        // === IMPLEMENTACIÓN DE LA TÉCNICA 3 (Porcentaje Fijo por Día) ===
        const porcentaje = obtenerPorcentajeDiario(objetivo);

        // === IMPLEMENTACIÓN DE LA TÉCNICA 2 (Tema visual aleatorio) ===
        // Nota: El tema cambia en cada mensaje para mantenerlo dinámico e ilimitado visualmente
        const tema = temasBarra[Math.floor(Math.random() * temasBarra.length)];
        const bloquesLlenos = Math.round(porcentaje / 10);
        const barra = tema.lleno.repeat(bloquesLlenos) + tema.vacio.repeat(10 - bloquesLlenos);

        // === IMPLEMENTACIÓN DE LA TÉCNICA 1 (Selección del banco de frases) ===
        let rango = 'critico';
        if (porcentaje >= 25 && porcentaje < 55) rango = 'neutral';
        else if (porcentaje >= 55 && porcentaje < 85) rango = 'bueno';
        else if (porcentaje >= 85) rango = 'epico';

        const listaFrases = predicciones[rango];
        const fraseFinal = listaFrases[Math.floor(Math.random() * listaFrases.length)];

        // Construir la respuesta final
        const textoRespuesta = `
${tema.titulo}

👤 *Usuario:* @${objetivo.split('@')[0]}
📊 *Porcentaje:* [ ${barra} ] *${porcentaje}%*

📝 *Análisis:* ${fraseFinal}

📌 _Nota: Tu suerte está fijada por hoy. Vuelve mañana para un nuevo resultado._
        `.trim();

        await sock.sendMessage(from, {
            text: textoRespuesta,
            mentions: [objetivo]
        }, { quoted: m });
    }
};
