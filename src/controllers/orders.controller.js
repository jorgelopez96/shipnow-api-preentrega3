import { ordersService } from '../services/orders.service.js';

export const ordersController = {
  async getAll(req, res, next) {
    try {
      res.json(await ordersService.getAll());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      res.json(await ordersService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      res.status(201).json(await ordersService.create(req.body ?? {}));
    } catch (error) {
      next(error);
    }
  },
};
