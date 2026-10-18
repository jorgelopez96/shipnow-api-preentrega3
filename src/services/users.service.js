import { usersRepository } from '../repositories/users.repository.js';
import { AppError } from '../utils/app-error.js';
import { hashPassword } from '../utils/password.js';

export const usersService = {
  getAll: () => usersRepository.findAll(),

  async getById(id) {
    const user = await usersRepository.findById(id);
    if (!user) throw new AppError('Usuario no encontrado', 404);
    return user;
  },

  async create({ firstName, lastName, email, password, role, isAvailable }) {
    if (!password) throw new AppError('La contraseña es obligatoria', 400);
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
