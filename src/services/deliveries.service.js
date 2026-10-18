import { DELIVERY_STATUS, USER_ROLES } from '../constants/index.js';
import { deliveriesRepository } from '../repositories/deliveries.repository.js';
import { ordersRepository } from '../repositories/orders.repository.js';
import { usersRepository } from '../repositories/users.repository.js';
import { AppError } from '../utils/app-error.js';

export const deliveriesService = {
  getAll: () => deliveriesRepository.findAll(),

  async getById(id) {
    const delivery = await deliveriesRepository.findById(id);
    if (!delivery) throw new AppError('Entrega no encontrada', 404);
    return delivery;
  },

  async create({ order: orderId, driver: driverId }) {
    const order = orderId && (await ordersRepository.findById(orderId));
    if (!order) throw new AppError('El pedido de la entrega no existe', 400);

    if (driverId) {
      const driver = await usersRepository.findById(driverId);
      if (driver?.role !== USER_ROLES.DRIVER) {
        throw new AppError('El repartidor no existe o no tiene rol de repartidor', 400);
      }
    }
    return deliveriesRepository.create({
      order: order._id,
      driver: driverId,
      status: driverId ? DELIVERY_STATUS.ASSIGNED : DELIVERY_STATUS.PENDING,
      priority: order.priority,
    });
  },
};
