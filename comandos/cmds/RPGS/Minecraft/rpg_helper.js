const fs = require('fs');
const path = require('path');

// Esto obligará a guardar el archivo en la raíz principal (/home/container/rpg_db.json)
// en lugar de la carpeta de plugins, evitando que el host lo limpie al reiniciar.
const dbPath = path.join(process.cwd(), 'rpg_db.json');

function leerDB() {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function guardarDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function obtenerUsuario(sender) {
    const db = leerDB();
    if (!db[sender]) {
        db[sender] = {
            xp: 0,
            nivel: 1,
            pico: 'Madera',
            inventario: {
                carbón: 0,
                hierro: 0,
                oro: 0,
                diamante: 0,
                piedra: 0,
                madera: 5
            },
            cooldown: 0
        };
        guardarDB(db);
    }
    return db[sender];
}

function actualizarUsuario(sender, datos) {
    const db = leerDB();
    db[sender] = datos;
    guardarDB(db);
}

module.exports = { obtenerUsuario, actualizarUsuario };
