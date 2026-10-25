import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { AppError } from '../errors/app-error.js';

const describeField = ({ kind, path, value, message }) => {
  if (kind === 'required') return `El campo "${path}" es obligatorio`;
  if (kind === 'enum') return `"${value}" no es un valor válido para "${path}"`;
  if (kind === 'min' || kind === 'max') return `El valor de "${path}" está fuera del rango permitido`;
  if (kind === 'ObjectId' || kind === 'Number') return `El campo "${path}" tiene un formato inválido`;
  return message;
};

const toAppError = (err) => {
  if (err instanceof AppError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors).map(describeField).join('. ');
    return new AppError('VALIDATION_ERROR', { message });
  }
  if (err instanceof mongoose.Error.CastError) {
    return new AppError('INVALID_ID', { details: `Valor recibido en "${err.path}": ${err.value}` });
  }
  if (err.code === 11000) {
    return new AppError('DUPLICATE_VALUE', { details: `Campos: ${Object.keys(err.keyValue ?? {}).join(', ')}` });
  }
  if (err.type === 'entity.parse.failed') return new AppError('INVALID_JSON');
  if (err.name?.startsWith('Mongo')) return new AppError('DATABASE_ERROR', { details: err.message });

  return new AppError('INTERNAL_SERVER_ERROR', { details: err.message });
};

export const notFoundHandler = (req, res, next) => {
  next(new AppError('ROUTE_NOT_FOUND', { details: `${req.method} ${req.originalUrl}` }));
};

export const errorHandler = (err, req, res, next) => {
  const error = toAppError(err);
  if (error.statusCode >= 500) console.error(err);

  const body = {
    status: 'error',
    statusCode: error.statusCode,
    error: error.code,
    message: error.message,
  };
  if (config.nodeEnv !== 'production' && error.details) body.details = error.details;

  res.status(error.statusCode).json(body);
};
