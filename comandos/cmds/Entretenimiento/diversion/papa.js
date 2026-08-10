// Variable global para almacenar el estado del juego en memoria
if (!global.papaGame) {
    global.papaGame = {};
}

module.exports = {
    name: 'papa',
    alias: ['papasequema', 'jugar', 'pasar'],
    description: 'Juego de la papa se quema en modo individual, pareja o grupo.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const esGrupo = from.endsWith('@g.us');
        const sender = m.key.participant || m.key.remoteJid;

        // Limpiar texto para procesar comandos
        const args = texto ? texto.trim().toLowerCase().split(' ') : [];
        const comando = args[0];

        // 1. LÓGICA DE INICIAR EL JUEGO
        if (comando === 'iniciar') {
            if (global.papaGame[from]) {
                return sock.sendMessage(from, { text: '🥔 ¡Ya hay una papa quemándose en este chat!' });
            }

            const modo = args[1]; // individual, pareja, grupo
            if (!modo || !['individual', 'pareja', 'grupo'].includes(modo)) {
                return sock.sendMessage(from, { text: '🥔 _Uso: /papa iniciar [individual | pareja | grupo]_' });
            }

            if (modo === 'grupo' && !esGrupo) {
                return sock.sendMessage(from, { text: '🥔 _El modo grupo solo se puede jugar dentro de un grupo._' });
            }

            // Configurar el tiempo aleatorio que durará la papa (entre 15 y 35 segundos)
            const tiempoExplosion = Math.floor(Math.random() * (35000 - 15000 + 1)) + 15000;

            global.papaGame[from] = {
                modo: modo,
                poseedor: sender,
                activo: true,
                timeout: setTimeout(() => {
                    // Al explotar, termina el juego y muestra el perdedor
                    const juego = global.papaGame[from];
                    if (juego) {
                        sock.sendMessage(from, { 
                            text: `💥 *¡BOOOOM!* La papa explotó en las manos de @${juego.poseedor.split('@')[0]} 🥔🔥\n\n¡Has perdido el juego!`,
                            mentions: [juego.poseedor]
                        });
                        delete global.papaGame[from];
                    }
                }, tiempoExplosion)
            };

            let mensajeInicio = `🥔 *¡La Papa se Quema ha comenzado!* 🥔\n\n`;
            if (modo === 'individual') {
                mensajeInicio += `La tienes tú, @${sender.split('@')[0]}. Escribe */papa pasar* rápido para que no te explote a ti mismo.`;
            } else if (modo === 'pareja') {
                mensajeInicio += `La tienes tú, @${sender.split('@')[0]}. ¡Menciónala a alguien rápido para pasársela! Uso: */papa pasar @user*`;
            } else {
                mensajeInicio += `La tienes tú, @${sender.split('@')[0]}. ¡Pásala rápido a cualquiera del grupo! Uso: */papa pasar @user*`;
            }

            return sock.sendMessage(from, { text: mensajeInicio, mentions: [sender] });
        }

        // 2. LÓGICA DE PASAR LA PAPA
        if (comando === 'pasar') {
            const juego = global.papaGame[from];

            if (!juego || !juego.activo) {
                return sock.sendMessage(from, { text: '🥔 No hay ningún juego activo. Inicia uno con: */papa iniciar*' });
            }

            if (juego.poseedor !== sender) {
                return sock.sendMessage(from, { text: '❌ ¡Tú no tienes la papa en este momento!' });
            }

            // MODO INDIVIDUAL: Se la pasa a sí mismo de forma simulada/bucle (o puedes pasársela al bot)
            if (juego.modo === 'individual') {
                // En individual simplemente "la mantiene en el aire" reiniciando su estado de pase
                return sock.sendMessage(from, { text: `💨 @${sender.split('@')[0]} lanzó la papa al aire y la volvió a atrapar. ¡Sigue pasando con */papa pasar*!`, mentions: [sender] });
            }

            // MODOS PAREJA Y GRUPO: Requieren mencionar a alguien
            const mencionado = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

            if (!mencionado) {
                return sock.sendMessage(from, { text: '🥔 ¡Debes mencionar a un usuario para pasarle la papa! Ej: */papa pasar @usuario*' });
            }

            if (mencionado === sender) {
                return sock.sendMessage(from, { text: '❌ No puedes pasarte la papa a ti mismo en este modo.' });
            }

            // Cambiar el poseedor actual
            juego.poseedor = mencionado;

            return sock.sendMessage(from, { 
                text: `🏃‍♂️💨 @${sender.split('@')[0]} le pasó la papa a @${mencionado.split('@')[0]} 🥔`, 
                mentions: [sender, mencionado] 
            });
        }

        // 3. MENSAJE POR DEFECTO / AYUDA
        return sock.sendMessage(from, { 
            text: `🥔 *Menú del juego: La Papa se Quema* 🥔\n\n` +
                  `• */papa iniciar individual* -> Juega solo contra el reloj.\n` +
                  `• */papa iniciar pareja* -> Juega mencionando a tu compañero.\n` +
                  `• */papa iniciar grupo* -> Juega con todos en el grupo.\n\n` +
                  `• */papa pasar* -> Pasa la papa (menciona a alguien si juegas acompañado).`
        });
    }
};
