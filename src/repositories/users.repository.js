import { UserModel } from '../models/user.model.js';

export const usersRepository = {
  create: (data) => UserModel.create(data),
  insertMany: (users) => UserModel.insertMany(users),
  findAll: (filter = {}) => UserModel.find(filter),
  findById: (id) => UserModel.findById(id),
  findByEmail: (email) => UserModel.exists({ email: String(email).toLowerCase().trim() }),
  deleteByIds: (ids) => UserModel.deleteMany({ _id: { $in: ids } }),
};
