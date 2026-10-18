import { OrderModel } from '../models/order.model.js';

export const ordersRepository = {
  create: (data) => OrderModel.create(data),
  insertMany: (orders) => OrderModel.insertMany(orders),
  findAll: (filter = {}) => OrderModel.find(filter).populate('customer', 'firstName lastName email'),
  findById: (id) => OrderModel.findById(id).populate('customer', 'firstName lastName email'),
};
