const { cargarCaches } = require('../principal/Esquemas/esquemas');
const { procesarMensaje } = require('../principal/Manejadores/manejador');
const { verificarUnionGrupo } = require('../principal/Eventos/eventos');

// Ejecutar carga inicial de bases de datos y cachés
cargarCaches();

module.exports = { procesarMensaje, verificarUnionGrupo };
