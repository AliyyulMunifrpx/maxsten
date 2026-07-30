import supertest from "supertest";
import { randomUUID } from "crypto";
import { web } from "../../src/application/web.js";
import { prisma } from "../../src/application/database.js";
import { supabase } from "../../src/application/supabase.js";
import { afterEach, describe, expect, test } from "vitest";

// Pre-existing fixture accounts already set up in the real Supabase test
// project (same ones used across the other test suites in this repo).
const LOGIN_EMAIL = "aliyyulmunif780@gmail.com";
const LOGIN_PASSWORD = "aliyyul";
const LOGIN_NAME = "aliyyul munif";

// Dedicated fixture account kept intentionally "yatim piatu" (exists in
// Supabase Auth, deliberately has no matching Prisma row) so the
// auto-healing test has something real to heal every run. We delete the
// Prisma row again in afterEach so this fixture stays orphaned for the
// next run too.
const ORPHAN_EMAIL = "aliyyulmunifuy@gmail.com";
const ORPHAN_PASSWORD = "gemini";

function endpoint() {
  return "/api/users/login";
}

let createdEmails = [];
let createdSupabaseIds = [];

function uniqueEmail(prefix) {
  const email = `${prefix}-${randomUUID()}@example.com`;
  createdEmails.push(email);
  return email;
}

async function createSupabaseUser(email, password, opts = {}) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: opts.emailConfirm ?? true,
    user_metadata: opts.metadata ?? {},
  });
  if (error) throw error;
  createdSupabaseIds.push(data.user.id);
  return data.user;
}

afterEach(async () => {
  // Keep the orphan fixture orphaned for the next run.
  await prisma.user.deleteMany({ where: { email: ORPHAN_EMAIL } });

  for (const email of createdEmails) {
    await prisma.user.deleteMany({ where: { email } });
  }
  createdEmails = [];

  for (const id of createdSupabaseIds) {
    try {
      await supabase.auth.admin.deleteUser(id);
    } catch {
      // best-effort cleanup
    }
  }
  createdSupabaseIds = [];
});

describe("POST /api/users/login", () => {
  test("should successfully login with valid credentials", async () => {
    const result = await supertest(web).post(endpoint()).send({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    });
    expect(result.status).toBe(200);
    expect(result.body.data.email).toBe(LOGIN_EMAIL);
    expect(result.body.data.name).toBe(LOGIN_NAME);
    expect(result.body.data.access_token).toBeUndefined();
    expect(result.body.data.refresh_token).toBeUndefined();
  });

  test("should reject login with incorrect password", async () => {
    const result = await supertest(web).post(endpoint()).send({
      email: LOGIN_EMAIL,
      password: "inisalah",
    });

    expect(result.status).toBe(401);
    expect(result.body.data).toBeUndefined();
    expect(result.body.errors).toBe("Incorrect email or password");
  });

  test("should reject login with unregistered email", async () => {
    const result = await supertest(web).post(endpoint()).send({
      email: "inisalah@gmail.com",
      password: "aliyyul",
    });

    expect(result.status).toBe(401);
    expect(result.body.data).toBeUndefined();
    expect(result.body.errors).toBe("Incorrect email or password");
  });

  test("should reject login with invalid email format", async () => {
    const result = await supertest(web).post(endpoint()).send({
      email: "salahformat.com",
      password: "aliyyul",
    });

    expect(result.status).toBe(400);
    expect(result.body.data).toBeUndefined();
    expect(result.body.errors).toBe('"email" must be a valid email');
  });

  test("should reject login with invalid password data type", async () => {
    const result = await supertest(web).post(endpoint()).send({
      email: LOGIN_EMAIL,
      password: 1234,
    });

    expect(result.status).toBe(400);
    expect(result.body.data).toBeUndefined();
    expect(result.body.errors).toBe('"password" must be a string');
  });

  test("[auto-healing, was previously 404] should now auto-create the Prisma profile and log in successfully when the Supabase account has no matching row", async () => {
    const result = await supertest(web).post(endpoint()).send({
      email: ORPHAN_EMAIL,
      password: ORPHAN_PASSWORD,
    });
    expect(result.status).toBe(200);
    expect(result.body.data.email).toBe(ORPHAN_EMAIL);
    expect(result.body.data.access_token).toBeUndefined();

    const healed = await prisma.user.findUnique({
      where: { email: ORPHAN_EMAIL },
    });
    expect(healed).not.toBeNull();
  });

  test("[auto-healing] should sync Prisma's email to match Supabase's current email", async () => {
    const oldEmail = uniqueEmail("login-stale-old");
    const password = "SuperSecret123!";
    const authUser = await createSupabaseUser(oldEmail, password);

    const newEmail = uniqueEmail("login-stale-new");
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      { email: newEmail, email_confirm: true },
    );
    if (updateError) throw updateError;

    await prisma.user.create({
      data: { supabase_id: authUser.id, email: oldEmail, name: "Stale Name" },
    });

    const result = await supertest(web)
      .post(endpoint())
      .send({ email: newEmail, password });
    expect(result.status).toBe(200);
    expect(result.body.data.email).toBe(newEmail);

    const healed = await prisma.user.findUnique({
      where: { supabase_id: authUser.id },
    });
    expect(healed.email).toBe(newEmail);
  });

  test("[regression, upsert-conflict fix] should return a clean 409 instead of crashing when Supabase's email collides with a different existing Prisma profile", async () => {
    const conflictingEmail = uniqueEmail("login-conflict");
    const password = "SuperSecret123!";

    await prisma.user.create({
      data: {
        supabase_id: `unrelated-${randomUUID()}`,
        email: conflictingEmail,
        name: "Unrelated Existing Profile",
      },
    });

    const authUser = await createSupabaseUser(
      uniqueEmail("login-conflict-src"),
      password,
    );
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      { email: conflictingEmail, email_confirm: true },
    );
    if (updateError) throw updateError;

    const result = await supertest(web)
      .post(endpoint())
      .send({ email: conflictingEmail, password });
    expect(result.status).toBe(409);
    expect(result.body.data).toBeUndefined();
    expect(result.body.errors).toBe(
      "This email address is already in use by another user. Please contact the admin",
    );

    const rows = await prisma.user.findMany({
      where: { email: conflictingEmail },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Unrelated Existing Profile");
  });
  test("should reject login with 403 when the account is banned", async () => {
    const email = uniqueEmail("login-banned");
    const password = "SuperSecret123!";
    const authUser = await createSupabaseUser(email, password);

    await supabase.auth.admin.updateUserById(authUser.id, {
      ban_duration: "876000h", // ~100 tahun, efeknya permanen buat kebutuhan test
    });

    const result = await supertest(web)
      .post(endpoint())
      .send({ email, password });

    expect(result.status).toBe(403);
    expect(result.body.errors).toBe(
      "Account suspended. Please contact support.",
    );
  });
});
