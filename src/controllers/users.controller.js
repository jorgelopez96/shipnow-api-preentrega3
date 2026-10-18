import { usersService } from '../services/users.service.js';

export const usersController = {
  async getAll(req, res, next) {
    try {
      res.json(await usersService.getAll());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      res.json(await usersService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      res.status(201).json(await usersService.create(req.body ?? {}));
    } catch (error) {
      next(error);
    }
  },
};
