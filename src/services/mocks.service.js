import { DEFAULT_MOCK_QTY, MAX_MOCK_ITEMS, MOCK_USER_PASSWORD, USER_ROLES } from '../constants/index.js';
import { AppError } from '../errors/app-error.js';
import { generateDeliveries } from '../mocks/deliveries.mock.js';
import { generateOrders } from '../mocks/orders.mock.js';
import { generateDrivers, generateUsers } from '../mocks/users.mock.js';
import { deliveriesRepository } from '../repositories/deliveries.repository.js';
import { ordersRepository } from '../repositories/orders.repository.js';
import { usersRepository } from '../repositories/users.repository.js';
import { hashPassword } from '../utils/password.js';

const SEED_TYPES = ['users', 'drivers', 'orders', 'deliveries'];

const parseQuantity = (value, field) => {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isInteger(number)) {
    throw new AppError('INVALID_MOCK_AMOUNT', { message: `"${field}" debe ser un número entero` });
  }
  if (number < 0) {
    throw new AppError('INVALID_MOCK_AMOUNT', { message: `"${field}" no puede ser negativo` });
  }
  if (number > MAX_MOCK_ITEMS) {
    throw new AppError('MOCK_LIMIT_EXCEEDED', { message: `"${field}" no puede ser mayor a ${MAX_MOCK_ITEMS}` });
  }
  return number;
};

const parseGetQty = (qty) => {
  if (qty === undefined) return DEFAULT_MOCK_QTY;
  const number = parseQuantity(qty, 'qty');
  if (number === 0) throw new AppError('INVALID_MOCK_AMOUNT', { message: '"qty" debe ser mayor a 0' });
  return number;
};

const parseSeedCounts = (query, body = {}) => {
  const qty = query.qty === undefined ? 0 : parseQuantity(query.qty, 'qty');
  const counts = Object.fromEntries(
    SEED_TYPES.map((type) => [type, body[type] === undefined ? qty : parseQuantity(body[type], type)])
  );

  if (Object.values(counts).every((count) => count === 0)) {
    throw new AppError('INVALID_MOCK_AMOUNT', {
      message: 'Indicá al menos una cantidad mayor a 0 (?qty=N o body { users, drivers, orders, deliveries })',
    });
  }
  if (counts.orders > 0 && counts.users === 0) {
    throw new AppError('MOCK_DEPENDENCIES_MISSING', {
      message: 'Para generar pedidos hace falta generar al menos un usuario (cliente)',
    });
  }
  if (counts.deliveries > 0 && (counts.orders === 0 || counts.drivers === 0)) {
    throw new AppError('MOCK_DEPENDENCIES_MISSING', {
      message: 'Para generar entregas hace falta generar al menos un pedido y un repartidor',
    });
  }
  return counts;
};

const rollback = async (inserted) => {
  try {
    await Promise.all([
      usersRepository.deleteByIds([...inserted.users, ...inserted.drivers]),
      ordersRepository.deleteByIds(inserted.orders),
      deliveriesRepository.deleteByIds(inserted.deliveries),
    ]);
    return 'Se deshizo la carga parcial';
  } catch {
    return 'No se pudo deshacer la carga parcial';
  }
};

export const mocksService = {
  getUsers: (qty) => generateUsers(parseGetQty(qty)),
  getDrivers: (qty) => generateDrivers(parseGetQty(qty)),
  getOrders: (qty) => generateOrders(parseGetQty(qty)),
  getDeliveries: (qty) => generateDeliveries(parseGetQty(qty)),

  async seed(query, body) {
    const counts = parseSeedCounts(query, body);
    const inserted = { users: [], drivers: [], orders: [], deliveries: [] };
    const idsOf = (docs) => docs.map((doc) => doc._id);

    try {
      const password = await hashPassword(MOCK_USER_PASSWORD);
      const withPassword = (users) => users.map((user) => ({ ...user, password }));

      const users = withPassword(generateUsers(counts.users, { role: USER_ROLES.CUSTOMER }));
      inserted.users = idsOf(users);
      await usersRepository.insertMany(users);

      const drivers = withPassword(generateDrivers(counts.drivers));
      inserted.drivers = idsOf(drivers);
      await usersRepository.insertMany(drivers);

      const orders = generateOrders(counts.orders, inserted.users);
      inserted.orders = idsOf(orders);
      await ordersRepository.insertMany(orders);

      const deliveries = generateDeliveries(counts.deliveries, orders, inserted.drivers);
      inserted.deliveries = idsOf(deliveries);
      await deliveriesRepository.insertMany(deliveries);
    } catch (error) {
      const rollbackResult = await rollback(inserted);
      throw new AppError('MOCK_GENERATION_ERROR', { details: `${error.message}. ${rollbackResult}` });
    }

    return {
      usuarios: inserted.users.length,
      repartidores: inserted.drivers.length,
      pedidos: inserted.orders.length,
      entregas: inserted.deliveries.length,
    };
  },
};
