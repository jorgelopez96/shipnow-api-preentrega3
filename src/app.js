import express from 'express';
import { config } from './config/index.js';
import deliveriesRouter from './routes/deliveries.router.js';
import mocksRouter from './routes/mocks.router.js';
import ordersRouter from './routes/orders.router.js';
import usersRouter from './routes/users.router.js';
import { errorHandler, notFoundHandler } from './utils/error-handler.js';

const app = express();

app.use(express.json());

app.use('/api/users', usersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/deliveries', deliveriesRouter);

if (config.nodeEnv !== 'production') {
  app.use('/api/mocks', mocksRouter);
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
