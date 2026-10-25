import { AppError } from '../errors/app-error.js';
import { usersRepository } from '../repositories/users.repository.js';
import { hashPassword } from '../utils/password.js';

export const usersService = {
  getAll: () => usersRepository.findAll(),

  async getById(id) {
    const user = await usersRepository.findById(id);
    if (!user) throw new AppError('USER_NOT_FOUND');
    return user;
  },

  async create({ firstName, lastName, email, password, role, isAvailable }) {
    if (!password) throw new AppError('PASSWORD_REQUIRED');
    if (email && (await usersRepository.findByEmail(email))) {
      throw new AppError('USER_ALREADY_EXISTS', { details: `Email: ${email}` });
    }
    return usersRepository.create({
      firstName,
      lastName,
      email,
      password: await hashPassword(password),
      role,
      isAvailable,
    });
  },
};
