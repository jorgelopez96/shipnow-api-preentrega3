import mongoose from 'mongoose';
import app from './src/app.js';
import { config } from './src/config/index.js';

try {
  await mongoose.connect(config.mongoUri);
  console.log('Conectado a MongoDB');
  app.listen(config.port, () => {
    console.log(`ShipNow API escuchando en http://localhost:${config.port} (${config.nodeEnv})`);
  });
} catch (error) {
  console.error('No se pudo conectar a MongoDB:', error.message);
  process.exit(1);
}
