import { config } from '../config/index.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({ status: 'error', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode ?? err.status ?? 500;
  let { message } = err;

  if (err.name === 'ValidationError') statusCode = 400;
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Valor inválido para "${err.path}": ${err.value}`;
  }
  if (err.type === 'entity.parse.failed') message = 'El body no es un JSON válido';
  if (err.code === 11000) {
    statusCode = 409;
    message = `Ya existe un registro con ese valor: ${Object.keys(err.keyValue ?? {}).join(', ')}`;
  }

  if (statusCode >= 500) {
    console.error(err);
    if (config.nodeEnv === 'production') message = 'Error interno del servidor';
  }

  res.status(statusCode).json({ status: 'error', message });
};
