const mongoose = require('mongoose');
const Group = require('../sistema/Modelos/sgrupo');

const groupConfigSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    botActivo: { type: Boolean, default: true },
    antiLinks: { type: Boolean, default: false }
});
const GroupConfigModel = mongoose.models.GroupConfig || mongoose.model('GroupConfig', groupConfigSchema);

const nukeSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    razon: String,
    origenGrupo: String,
    fecha: String
});
const NukeModel = mongoose.models.Nuke || mongoose.model('Nuke', nukeSchema);

const advSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    baneados: { type: [String], default: [] },
    muteadas: { type: Map, of: [String], default: {} }
});
const AdvModel = mongoose.models.Advertencia || mongoose.model('Advertencia', advSchema);

const blacklistSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    usuarios: { type: [String], default: [] }
});
const BlacklistModel = mongoose.models.Blacklist || mongoose.model('Blacklist', blacklistSchema);

const antiStickerSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    activo: { type: Boolean, default: false }
});
const AntiStickerModel = mongoose.models.AntiSticker || mongoose.model('AntiSticker', antiStickerSchema);

const groupPrefixConfigSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    disableSymbols: { type: Boolean, default: false },
    disableNames: { type: Boolean, default: false }
});
const GroupPrefixConfigModel = mongoose.models.GroupPrefixConfig || mongoose.model('GroupPrefixConfig', groupPrefixConfigSchema);

const afkSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    groupId: { type: String, required: true },
    motivo: { type: String, default: 'Sin motivo especificado' },
    tiempo: { type: Number, default: Date.now },
    frase: { type: String, default: "¡Hola! Estoy usando Hatsune Miku Bot" }
}, { strict: false });

if (mongoose.models.Afk) {
    delete mongoose.models.Afk;
}
const AfkModel = mongoose.model('Afk', afkSchema);

const messageSchema = new mongoose.Schema({
    remoteJid: { type: String, required: true, index: true },
    messageId: { type: String, required: true, unique: true },
    sender: { type: String, required: true, index: true },
    fromMe: { type: Boolean, default: false },
    text: String,
    timestamp: { type: Date, default: Date.now, index: true }
});
const MessageModel = mongoose.models.Message || mongoose.model('Message', messageSchema);

const welcomeSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    welcomeActivo: { type: Boolean, default: false },
    byeActivo: { type: Boolean, default: false },
    welcomeTexto: { type: String, default: '¡Hola <member>, bienvenido/a a *<group>*! 🎉' },
    byeTexto: { type: String, default: '¡Adiós <member>! 👋 Nos quedamos con <count> miembros.' },
    welcomeMedia: { type: String, default: null },
    byeMedia: { type: String, default: null },
    welcomeCard: { type: Boolean, default: false },
    byeCard: { type: Boolean, default: false },
    welcomeBotones: { type: Array, default: [] },
    byeBotones: { type: Array, default: [] }
});
const WelcomeModel = mongoose.models.Welcome || mongoose.model('Welcome', welcomeSchema);

const cargarCaches = async () => {
    try {
        global.antistickerStatus = global.antistickerStatus || {};
        global.groupPrefixConfig = global.groupPrefixConfig || {};
        global.welcomeCache = global.welcomeCache || {};
        global.groupStatusCache = global.groupStatusCache || {};

        const registrosAnti = await AntiStickerModel.find({});
        registrosAnti.forEach(doc => { global.antistickerStatus[doc.groupId] = doc.activo; });

        const gruposMongo = await Group.find({});
        gruposMongo.forEach(doc => { 
            if (doc.antisticker !== undefined) {
                global.antistickerStatus[doc.groupId] = doc.antisticker; 
            }
        });

        const registrosConfig = await GroupPrefixConfigModel.find({});
        registrosConfig.forEach(doc => {
            global.groupPrefixConfig[doc.groupId] = {
                disableSymbols: doc.disableSymbols,
                disableNames: doc.disableNames
            };
        });

        const registrosWelcome = await WelcomeModel.find({});
        registrosWelcome.forEach(doc => { global.welcomeCache[doc.groupId] = doc.toObject(); });

        const registrosGroupConfig = await GroupConfigModel.find({});
        registrosGroupConfig.forEach(doc => {
            global.groupStatusCache[doc.groupId] = {
                botActivo: doc.botActivo,
                antiLinks: doc.antiLinks
            };
        });
    } catch (e) {
        console.error('Error al cargar cachés:', e);
    }
};

module.exports = {
    GroupConfigModel,
    NukeModel,
    AdvModel,
    BlacklistModel,
    AntiStickerModel,
    GroupPrefixConfigModel,
    AfkModel,
    MessageModel,
    WelcomeModel,
    cargarCaches
};
