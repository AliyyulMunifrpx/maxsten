import supertest from "supertest";
import { prisma } from "../src/application/database.js";
import bcrypt from "bcrypt"; // Sesuaikan jika kamu pakai hashing buat password
import { web } from "../src/application/web.js";

const removeTestUser = async () => {
  await prisma.user.deleteMany({ where: { username: "test" } });
};

const registerTestUser = async () => {
  return await supertest(web).post("/api/users").send({
    username: "test",
    password: "rahasia",
    name: "test",
  });
};
const loginTestUser = async () => {
  return await supertest(web).post("/api/users/login").send({
    username: "test",
    password: "rahasia",
  });
};
export { registerTestUser, loginTestUser, removeTestUser };
