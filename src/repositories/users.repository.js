import { UserModel } from '../models/user.model.js';

export const usersRepository = {
  create: (data) => UserModel.create(data),
  insertMany: (users) => UserModel.insertMany(users),
  findAll: (filter = {}) => UserModel.find(filter),
  findById: (id) => UserModel.findById(id),
};
