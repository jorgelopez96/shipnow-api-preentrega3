import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const REQUIRED_ENV_VARS = ['MONGODB_URI', 'NODE_ENV'];

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Faltan variables de entorno obligatorias: ${missing.join(', ')}. ` +
      'Creá un archivo .env a partir de .env.example.'
  );
}

export const config = {
  port: Number(process.env.PORT) || 8080,
  mongoUri: process.env.MONGODB_URI,
  nodeEnv: process.env.NODE_ENV || 'development',
};
