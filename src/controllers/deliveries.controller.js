import { deliveriesService } from '../services/deliveries.service.js';

export const deliveriesController = {
  async getAll(req, res, next) {
    try {
      res.json(await deliveriesService.getAll());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      res.json(await deliveriesService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      res.status(201).json(await deliveriesService.create(req.body ?? {}));
    } catch (error) {
      next(error);
    }
  },
};
