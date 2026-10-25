import { ORDER_STATUS } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { ordersRepository } from '../repositories/orders.repository.js';
import { usersRepository } from '../repositories/users.repository.js';
import { calculateOrderTotal } from '../utils/order-total.js';

const CLOSED_STATUSES = [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED];

export const ordersService = {
  getAll: () => ordersRepository.findAll(),

  async getById(id) {
    const order = await ordersRepository.findById(id);
    if (!order) throw new AppError('ORDER_NOT_FOUND');
    return order;
  },

  async create({ customer, items, deliveryAddress, priority }) {
    if (!Array.isArray(items) || items.length === 0) throw new AppError('ORDER_ITEMS_REQUIRED');
    if (!customer || !(await usersRepository.findById(customer))) {
      throw new AppError('USER_NOT_FOUND', { message: 'No se encontró el usuario indicado para crear el pedido' });
    }
    return ordersRepository.create({ customer, items, deliveryAddress, priority, total: calculateOrderTotal(items) });
  },

  async updateStatus(id, status) {
    if (!Object.values(ORDER_STATUS).includes(status)) {
      throw new AppError('INVALID_ORDER_STATUS', { details: `Estados válidos: ${Object.values(ORDER_STATUS).join(', ')}` });
    }
    const order = await ordersRepository.findById(id);
    if (!order) throw new AppError('ORDER_NOT_FOUND');
    if (CLOSED_STATUSES.includes(order.status)) {
      throw new AppError('ORDER_ALREADY_CLOSED', { details: `Estado actual: ${order.status}` });
    }
    return ordersRepository.updateStatus(id, status);
  },
};
