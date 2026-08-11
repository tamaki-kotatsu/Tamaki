const { cargarCaches } = require('../Esquemas/esquemas');
const { procesarMensaje } = require('../Manejadores/manejador');
const { verificarUnionGrupo } = require('../Eventos/eventos');

cargarCaches();

module.exports = { procesarMensaje, verificarUnionGrupo };
