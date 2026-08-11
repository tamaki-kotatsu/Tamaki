const { cargarCaches } = require('../principales/Esquemas/esquemas');
const { procesarMensaje } = require('../principales/Manejadores/manejador');
const { verificarUnionGrupo } = require('../principales/Eventos/eventos');

cargarCaches();

module.exports = { procesarMensaje, verificarUnionGrupo };
