import supertest from "supertest";
import { randomUUID } from "crypto";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { supabase } from "../../src/application/supabase.js";
import { afterEach, describe, expect, test } from "vitest";

function endpoint() {
  return "/api/users";
}

let usedEmails = [];

let orphanedSupabaseIds = [];

function uniqueEmail(prefix) {
  const email = `${prefix}-${randomUUID()}@example.com`;
  usedEmails.push(email);
  return email;
}

async function countSupabaseUsersByEmail(email) {
  const perPage = 1000;
  const maxPages = 20;
  let count = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    count += data.users.filter((u) => u.email === email).length;
    if (data.users.length < perPage) break;
  }

  return count;
}

afterEach(async () => {
  for (const email of usedEmails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, supabase_id: true },
    });
    if (user) {
      if (user.supabase_id) {
        try {
          await supabase.auth.admin.deleteUser(user.supabase_id);
        } catch {
          // best-effort cleanup; don't fail the test suite over this
        }
      }
      await prisma.user.delete({ where: { id: user.id } });
    }
  }
  usedEmails = [];

  for (const id of orphanedSupabaseIds) {
    try {
      await supabase.auth.admin.deleteUser(id);
    } catch {
      // best-effort
    }
  }
  orphanedSupabaseIds = [];
});

describe("POST /api/users (register)", () => {
  test("should register a new user and return only email and name", async () => {
    const email = uniqueEmail("register-success");

    const result = await supertest(web).post(endpoint()).send({
      email,
      password: "SuperSecret123!",
      name: "Budi Sukses",
    });
    expect(result.status).toBe(201);
    expect(result.body.data).toEqual({ email, name: "Budi Sukses" });

    // The bridge to Supabase Auth (`supabase_id`) must actually be set.
    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored).not.toBeNull();
    expect(stored.supabase_id).toBeTruthy();
  });

  test("should return 400 and create no duplicate when the email is already registered", async () => {
    const email = uniqueEmail("register-dup");

    const first = await supertest(web).post(endpoint()).send({
      email,
      password: "SuperSecret123!",
      name: "Original",
    });
    expect(first.status).toBe(201);

    const second = await supertest(web).post(endpoint()).send({
      email,
      password: "AnotherPassword123!",
      name: "Duplicate Attempt",
    });
    expect(second.status).toBe(400);

    const rows = await prisma.user.findMany({ where: { email } });
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Original"); // the duplicate attempt must not overwrite anything
  });

  test("should reject registration when the password fails validation, and persist nothing", async () => {
    const email = uniqueEmail("register-invalid-pw");

    const result = await supertest(web).post(endpoint()).send({
      email,
      password: "1", // too short/weak - rejected either by our own Joi schema or by Supabase itself
      name: "Lemah",
    });

    expect(result.status).toBe(400);

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored).toBeNull();
  });

  test("[distributed-transaction rollback, real concurrency] exactly one of two simultaneous registrations with the same email should win, with no duplicate or orphaned Supabase user left behind", async () => {
    const email = uniqueEmail("register-race");
    const payload = (name) => ({
      email,
      password: "SuperSecret123!",
      name,
    });

    const [resA, resB] = await Promise.all([
      supertest(web).post(endpoint()).send(payload("Race A")),
      supertest(web).post(endpoint()).send(payload("Race B")),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 400]);

    const rows = await prisma.user.findMany({ where: { email } });
    expect(rows).toHaveLength(1);

    const supabaseUserCount = await countSupabaseUsersByEmail(email);
    expect(supabaseUserCount).toBe(1);
  });

  test("[SECURITY] re-registering an email that already has a real (but Prisma-orphaned) Supabase account must never succeed with 201", async () => {
    const email = uniqueEmail("register-hijack");

    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password: "PasswordPemilikAsli1!",
        email_confirm: true,
      });
    expect(createError).toBeNull();
    orphanedSupabaseIds.push(created.user.id);

    const noRowYet = await prisma.user.findUnique({ where: { email } });
    expect(noRowYet).toBeNull();
    // Someone else now "registers" the SAME email with a DIFFERENT password.
    const hijackAttempt = await supertest(web).post(endpoint()).send({
      email,
      password: "PasswordOrangLain1!",
      name: "Bukan Pemilik Asli",
    });

    expect(hijackAttempt.status).not.toBe(201);

    const supabaseUserCount = await countSupabaseUsersByEmail(email);
    expect(supabaseUserCount).toBe(1);
  });
});
