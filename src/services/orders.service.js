import { ordersRepository } from '../repositories/orders.repository.js';
import { usersRepository } from '../repositories/users.repository.js';
import { AppError } from '../utils/app-error.js';
import { calculateOrderTotal } from '../utils/order-total.js';

export const ordersService = {
  getAll: () => ordersRepository.findAll(),

  async getById(id) {
    const order = await ordersRepository.findById(id);
    if (!order) throw new AppError('Pedido no encontrado', 404);
    return order;
  },

  async create({ customer, items, deliveryAddress, priority }) {
    if (!customer || !(await usersRepository.findById(customer))) {
      throw new AppError('El cliente del pedido no existe', 400);
    }
    return ordersRepository.create({ customer, items, deliveryAddress, priority, total: calculateOrderTotal(items) });
  },
};
