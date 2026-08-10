const { exec } = require('child_process');

// Función auxiliar para pausar la ejecución unos segundos
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
    name: 'update',
    alias: ['actualizar', 'pull', 'restart'],
    description: 'Actualiza el bot acumulando pasos en un solo mensaje y limpia el chat antes de reiniciar.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        try {
            // 1. Reacción inicial en tu comando
            await sock.sendMessage(from, { react: { text: '📥', key: m.key } });

            // Enviamos el primer mensaje (Paso 1)
            let statusText = '🔄 *[1/4] Actualizando...*\nJalando cambios desde el repositorio de GitHub...';
            const enviado = await sock.sendMessage(from, { text: statusText });
            const msgKey = enviado.key; // Clave del mensaje del bot para editarlo/borrarlo

            await delay(1500);

            // 2. Ejecutamos el pull
            exec('git pull', async (err, stdout, stderr) => {
                if (err) {
                    console.error(err);
                    statusText += `\n\n❌ *Error al ejecutar git pull:*\n\`\`\`${err.message}\`\`\``;
                    await sock.sendMessage(from, { text: statusText, edit: msgKey });
                    return;
                }

                // Analizamos el resultado del pull
                let pullResult = '';
                if (stdout.includes('Already up to date.') || stdout.includes('Ya está al día.')) {
                    pullResult = '⚠️ El repositorio ya está al día. No hubo cambios nuevos.';
                } else {
                    pullResult = `✅ Cambios jalados con éxito:\n\`\`\`${stdout.slice(0, 200)}\`\`\``;
                }

                // 3. Editamos añadiendo el Paso 2 (Mantenemos el Paso 1 arriba)
                statusText += `\n\n🔍 *[2/4] Repositorio comprobado*\n${pullResult}`;
                await sock.sendMessage(from, { text: statusText, edit: msgKey });
                await delay(2500);

                // 4. Editamos añadiendo el Paso 3
                statusText += '\n\n🔌 *[3/4] Reiniciando...*\nApagando el proceso actual para aplicar los cambios...';
                await sock.sendMessage(from, { text: statusText, edit: msgKey });
                await delay(2000);

                // 5. Editamos añadiendo el Paso 4 final
                statusText += '\n\n🚀 *[4/4] ¡Listo!*\nEl bot se ha actualizado con éxito. Limpiando chat y aplicando cambios...';
                await sock.sendMessage(from, { text: statusText, edit: msgKey });

                // Reacción final de éxito en tu comando original
                await sock.sendMessage(from, { react: { text: '✅', key: m.key } });
                await delay(4000); // Damos 4 segundos para que puedan ver que terminó con éxito antes de borrar

                // 6. Proceso de limpieza (Elimina tu comando y el mensaje del bot)
                try {
                    // Borramos el mensaje del bot
                    await sock.sendMessage(from, { delete: msgKey });
                    await delay(1000);
                    // Borramos tu comando (/pull)
                    await sock.sendMessage(from, { delete: m.key });
                } catch (errDelete) {
                    console.log("No se pudieron eliminar los mensajes:", errDelete);
                }

                // Damos un último segundo de gracia para asegurar que WhatsApp procesó los borrados en sus servidores
                await delay(1500);

                // 7. Forzar el reinicio
                process.exit(0);
            });

        } catch (error) {
            console.error(error);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error inesperado al procesar la actualización.' });
        }
    }
};
