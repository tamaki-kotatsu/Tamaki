const mongoose = require('mongoose');

const link = "mongodb+srv://tamakiopps_db_user:QpMlxSGry1ZcmgDF@tamaki.swozjnj.mongodb.net/?retryWrites=true&w=majority&appName=Tamaki";

const conectarDB = async () => {
    try {
        await mongoose.connect(link);
        console.log('🩵  Base de datos conectada con éxito');
    } catch (e) {
        console.log('❌ [DATABASE] Error de conexión: ' + e);
    }
};

module.exports = conectarDB;
