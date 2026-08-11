const mongoose = require('mongoose');

const warnSchema = new mongoose.Schema({
    groupId: { type: String, required: true },
    config: {
        limite: { type: Number, default: 3 },
        castigo: { type: String, default: 'kick' }
    },
    usuarios: { type: Map, of: Array, default: {} }
});

const globalMuteBanSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    muteadas: { type: Map, of: Array, default: {} },
    baneados: { type: Array, default: [] }
});

const WarnModel = mongoose.models.Warn || mongoose.model('Warn', warnSchema);
const GlobalMuteBanModel = mongoose.models.GlobalMuteBan || mongoose.model('GlobalMuteBan', globalMuteBanSchema);

module.exports = {
    name: 'advertencia',
    alias: ['warn', 'advertir', 'advertencias'],
    description: 'Sistema avanzado de advertencias con castigos funcionales (Mute/BanBot).',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '⚠️ _Este comando solo puede ser utilizado en grupos._' });
        }

        const moderador = m.key.participant || m.key.remoteJid;

        let groupData = await WarnModel.findOne({ groupId: from });
        if (!groupData) {
            groupData = await WarnModel.create({
                groupId: from,
                config: { limite: 3, castigo: 'kick' },
                usuarios: new Map()
            });
        }

        const args = texto ? texto.trim().split(/\s+/) : [];
        const subComando = args[0]?.toLowerCase();

        if (subComando === 'limite' || subComando === 'castigo') {
            let msgConfig = '⚙️ *Configuración de Advertencias Actualizada*\n\n';

            for (let i = 0; i < args.length; i++) {
                const parametro = args[i].toLowerCase();
                const valor = args[i + 1];

                if (parametro === 'limite' && valor && !isNaN(valor)) {
                    groupData.config.limite = parseInt(valor);
                    msgConfig += `🔹 *Límite:* ${valor} advertencias\n`;
                }

                if (parametro === 'castigo' && valor) {
                    const castigoValido = valor.toLowerCase();
                    const listaCastigos = ['kick', 'mute', 'banbot'];

                    if (listaCastigos.includes(castigoValido)) {
                        groupData.config.castigo = castigoValido;
                        msgConfig += `🔹 *Castigo:* ${castigoValido}\n`;
                    } else {
                        return sock.sendMessage(from, { 
                            text: `❌ *Castigo inválido.*\n\nDisponibles:\n⭐ \`kick\`\n⭐ \`mute\`\n⭐ \`banbot\`` 
                        });
                    }
                }
            }

            await groupData.save();
            return sock.sendMessage(from, { text: msgConfig });
        }

        let mencionado = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const respondido = m.message?.extendedTextMessage?.contextInfo?.participant;
        const usuarioSancionado = mencionado || respondido;

        if (!usuarioSancionado) {
            return sock.sendMessage(from, { 
                text: `✨ *SISTEMA DE ADVERTENCIAS* ✨\n\n` +
                      `📝 *Dar advertencia:* /advertencia @usuario <motivo>\n` +
                      `⚙️ *Configurar grupo:* /advertencias limite 5 castigo mute\n\n` +
                      `📊 *Configuración de este grupo:*\n` +
                      `• Límite: *${groupData.config.limite}*\n` +
                      `• Castigo: *${groupData.config.castigo}*`
            });
        }

        let motivo = texto ? texto.replace(/@\d+/g, '').trim() : '';
        if (!motivo) motivo = 'Sin motivo especificado';

        let userWarns = groupData.usuarios.get(usuarioSancionado) || [];

        const nuevaAdvertencia = {
            moderador: `@${moderador.split('@')[0]}`,
            motivo: motivo,
            fecha: new Date().toLocaleString('es-ES', { timeZone: 'America/Caracas' })
        };

        userWarns.push(nuevaAdvertencia);
        groupData.usuarios.set(usuarioSancionado, userWarns);
        groupData.markModified('usuarios');
        await groupData.save();

        const totalWarns = userWarns.length;
        const limiteGrupo = groupData.config.limite;
        const castigoGrupo = groupData.config.castigo;

        let historialLogs = '';
        userWarns.forEach((warn, index) => {
            historialLogs += `*${index + 1}.* Mod: ${warn.moderador} | Motivo: _${warn.motivo}_ (${warn.fecha})\n`;
        });

        let mensajeSancion = `⚠️ *¡ADVERTENCIA APLICADA!* ⚠️\n\n`;
        mensajeSancion += `👤 *Usuario:* @${usuarioSancionado.split('@')[0]}\n`;
        mensajeSancion += `👮 *Moderador:* ${nuevaAdvertencia.moderador}\n`;
        mensajeSancion += `📝 *Motivo actual:* ${nuevaAdvertencia.motivo}\n`;
        mensajeSancion += `📊 *Advertencias:* ${totalWarns}/${limiteGrupo}\n\n`;
        mensajeSancion += `📜 *Historial de logs:*\n${historialLogs}`;

        await sock.sendMessage(from, { text: mensajeSancion, mentions: [usuarioSancionado, moderador] });

        if (totalWarns >= limiteGrupo) {
            let msgCastigo = `🚨 @${usuarioSancionado.split('@')[0]} alcanzó el límite de *${limiteGrupo} advertencias*. `;
            
            groupData.usuarios.delete(usuarioSancionado);
            groupData.markModified('usuarios');
            await groupData.save();

            switch (castigoGrupo) {
                case 'kick':
                    msgCastigo += `Procediendo con la *Expulsión*...`;
                    await sock.sendMessage(from, { text: msgCastigo, mentions: [usuarioSancionado] });
                    try {
                        await sock.groupParticipantsUpdate(from, [usuarioSancionado], 'remove');
                    } catch (e) {
                        await sock.sendMessage(from, { text: '❌ _Error al expulsar. ¿El bot es admin?_' });
                    }
                    break;

                case 'mute':
                    msgCastigo += `¡Ha sido *Silenciado*! Cada mensaje que envíe en este grupo será eliminado automáticamente.`;
                    await sock.sendMessage(from, { text: msgCastigo, mentions: [usuarioSancionado] });
                    
                    let globalDataMute = await GlobalMuteBanModel.findOne({ key: 'global_data' });
                    if (!globalDataMute) globalDataMute = new GlobalMuteBanModel({ key: 'global_data' });

                    let listMute = globalDataMute.muteadas.get(from) || [];
                    if (!listMute.includes(usuarioSancionado)) {
                        listMute.push(usuarioSancionado);
                        globalDataMute.muteadas.set(from, listMute);
                        globalDataMute.markModified('muteadas');
                        await globalDataMute.save();
                    }
                    break;

                case 'banbot':
                    msgCastigo += `¡Ha sido *Baneado globalmente del Bot*! El bot ignorará todos sus comandos a partir de ahora.`;
                    await sock.sendMessage(from, { text: msgCastigo, mentions: [usuarioSancionado] });
                    
                    let globalDataBan = await GlobalMuteBanModel.findOne({ key: 'global_data' });
                    if (!globalDataBan) globalDataBan = new GlobalMuteBanModel({ key: 'global_data' });

                    if (!globalDataBan.baneados.includes(usuarioSancionado)) {
                        globalDataBan.baneados.push(usuarioSancionado);
                        await globalDataBan.save();
                    }
                    break;
            }
        }
    }
};
