const app = require('./app');
const config = require('./config');

const PORT = config.port || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} [${config.nodeEnv}]`);
});