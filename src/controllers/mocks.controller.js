import { mocksService } from '../services/mocks.service.js';

const sendMocks = (generate) => (req, res, next) => {
  try {
    res.json(generate(req.query.qty));
  } catch (error) {
    next(error);
  }
};

export const mocksController = {
  getUsers: sendMocks(mocksService.getUsers),
  getDrivers: sendMocks(mocksService.getDrivers),
  getOrders: sendMocks(mocksService.getOrders),
  getDeliveries: sendMocks(mocksService.getDeliveries),

  async seed(req, res, next) {
    try {
      const insertados = await mocksService.seed(req.query, req.body);
      res.status(201).json({ status: 'success', insertados });
    } catch (error) {
      next(error);
    }
  },
};
