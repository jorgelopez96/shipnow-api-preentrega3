import { DEFAULT_MOCK_QTY, MAX_MOCK_ITEMS, MOCK_USER_PASSWORD, USER_ROLES } from '../constants/index.js';
import { generateDeliveries } from '../mocks/deliveries.mock.js';
import { generateOrders } from '../mocks/orders.mock.js';
import { generateDrivers, generateUsers } from '../mocks/users.mock.js';
import { deliveriesRepository } from '../repositories/deliveries.repository.js';
import { ordersRepository } from '../repositories/orders.repository.js';
import { usersRepository } from '../repositories/users.repository.js';
import { AppError } from '../utils/app-error.js';
import { hashPassword } from '../utils/password.js';

const SEED_TYPES = ['users', 'drivers', 'orders', 'deliveries'];

const parseQuantity = (value, field) => {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isInteger(number) || number < 0 || number > MAX_MOCK_ITEMS) {
    throw new AppError(`"${field}" debe ser un número entero entre 0 y ${MAX_MOCK_ITEMS}`, 400);
  }
  return number;
};

const parseGetQty = (qty) => {
  if (qty === undefined) return DEFAULT_MOCK_QTY;
  const number = parseQuantity(qty, 'qty');
  if (number === 0) throw new AppError('"qty" debe ser mayor a 0', 400);
  return number;
};

const parseSeedCounts = (query, body = {}) => {
  const qty = query.qty === undefined ? 0 : parseQuantity(query.qty, 'qty');
  const counts = Object.fromEntries(
    SEED_TYPES.map((type) => [type, body[type] === undefined ? qty : parseQuantity(body[type], type)])
  );

  if (Object.values(counts).every((count) => count === 0)) {
    throw new AppError('Indicá al menos una cantidad mayor a 0 (?qty=N o body { users, drivers, orders, deliveries })', 400);
  }
  if (counts.orders > 0 && counts.users === 0) {
    throw new AppError('Para generar pedidos hace falta generar al menos un usuario (cliente)', 400);
  }
  if (counts.deliveries > 0 && (counts.orders === 0 || counts.drivers === 0)) {
    throw new AppError('Para generar entregas hace falta generar al menos un pedido y un repartidor', 400);
  }
  return counts;
};

export const mocksService = {
  getUsers: (qty) => generateUsers(parseGetQty(qty)),
  getDrivers: (qty) => generateDrivers(parseGetQty(qty)),
  getOrders: (qty) => generateOrders(parseGetQty(qty)),
  getDeliveries: (qty) => generateDeliveries(parseGetQty(qty)),

  async seed(query, body) {
    const counts = parseSeedCounts(query, body);

    const password = await hashPassword(MOCK_USER_PASSWORD);
    const withPassword = (users) => users.map((user) => ({ ...user, password }));

    const users = await usersRepository.insertMany(
      withPassword(generateUsers(counts.users, { role: USER_ROLES.CUSTOMER }))
    );
    const drivers = await usersRepository.insertMany(withPassword(generateDrivers(counts.drivers)));
    const orders = await ordersRepository.insertMany(
      generateOrders(counts.orders, users.map((user) => user._id))
    );
    const deliveries = await deliveriesRepository.insertMany(
      generateDeliveries(counts.deliveries, orders, drivers.map((driver) => driver._id))
    );

    return {
      usuarios: users.length,
      repartidores: drivers.length,
      pedidos: orders.length,
      entregas: deliveries.length,
    };
  },
};
