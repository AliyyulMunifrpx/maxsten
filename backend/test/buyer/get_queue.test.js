import supertest from "supertest";
import { web } from "../../src/application/web.js"; // Sesuaikan path
import { prisma } from "../../src/application/database.js"; // Sesuaikan path
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const STORE_PUBLIC_ID = "123e4567-e89b-12d3-a456-426614174000";
const OTHER_STORE_PUBLIC_ID = "999e4567-e89b-12d3-a456-426614174999";
const GUEST_ID = "11111111-2222-3333-4444-555555555555";
const HACKER_GUEST_ID = "99999999-8888-7777-6666-555555555555";

describe("GET /api/:publicId/queue/:queueId", () => {
  let userId;
  let storeId;
  let otherStoreId;
  let queueId;
  beforeEach(async () => {
    // 1. Bersihkan database
    await prisma.queueDetail.deleteMany({});
    await prisma.queue.deleteMany({});
    await prisma.guest.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({});

    // 2. Setup Data Dasar - BIKIN 2 USER BERBEDA
    const user1 = await prisma.user.create({
      data: {
        email: "owner1@test.com",
        supabase_id: "supa-123",
        name: "Owner Asli",
      },
    });
    userId = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: "owner2@test.com",
        supabase_id: "supa-456",
        name: "Owner Toko Lain",
      },
    });
    const user2Id = user2.id;

    // Bikin Toko 1 (Milik User 1)
    const store = await prisma.store.create({
      data: {
        user_id: userId,
        public_id: STORE_PUBLIC_ID,
        name: "Toko Asli",
        timezone: "Asia/Jakarta",
      },
    });
    storeId = store.id;

    // Bikin Toko 2 (Milik User 2)
    const otherStore = await prisma.store.create({
      data: {
        user_id: user2Id,
        public_id: OTHER_STORE_PUBLIC_ID,
        name: "Toko Lain",
        timezone: "Asia/Jakarta",
      },
    });
    otherStoreId = otherStore.id;

    // 👇👇👇 INI YANG KETINGGALAN BANG! 👇👇👇

    // Bikin Guest dulu biar database gak marah
    await prisma.guest.create({ data: { id: GUEST_ID } });
    await prisma.guest.create({ data: { id: HACKER_GUEST_ID } });

    // Bikin Product dan Variant dulu biar bisa dimasukin ke detail antrean
    const product = await prisma.product.create({
      data: { store_id: storeId, name: "Mie Goreng", price: 15000 },
    });

    const variant = await prisma.variant.create({
      data: {
        product_id: product.id,
        name: "Pedas Mampus",
        additional_price: 2000,
      },
    });

    // 👆👆👆 SAMPAI SINI 👆👆👆

    // 3. BARU DEH BIKIN ANTREAN (Sekarang pasti aman!)
    const queue = await prisma.queue.create({
      data: {
        store_id: storeId,
        guest_id: GUEST_ID,
        queue_number: 10,
        status: "BELUM_BAYAR",
        total_price: 20000,
        expired_at: new Date(Date.now() + 30 * 60000),
      },
    });
    queueId = queue.id;

    // Masukkan Snapshot persis seperti hasil dari fungsi createQueue lu
    await prisma.queueDetail.create({
      data: {
        queue_id: queueId,
        product_id: product.id,
        variant_id: variant.id,
        quantity: 1,
        selected_addons: [
          { id: "uuid-addon-1", name: "Telor Mata Sapi", price: 3000 },
        ],
      },
    });
  });

  afterEach(async () => {
    await prisma.queueDetail.deleteMany({});
    await prisma.queue.deleteMany({});
    await prisma.guest.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.user.deleteMany({});
  });

  test("[SUCCESS] should return complete queue details with snapshot addons", async () => {
    const response = await supertest(web)
      .get(`/api/${STORE_PUBLIC_ID}/queue/${queueId}`)
      .set("Cookie", [`guest_id=${GUEST_ID}`]);

    expect(response.status).toBe(200);
    const data = response.body.data;
    expect(data.id).toBe(queueId);
    expect(data.guest_id).toBe(GUEST_ID);
    expect(data.server_now).toBeDefined(); // Penting untuk timer FE

    expect(data.queueDetails).toHaveLength(1);
    expect(data.queueDetails[0].product.name).toBe("Mie Goreng");
    expect(data.queueDetails[0].variant.name).toBe("Pedas Mampus");

    // Pastikan snapshot Addon aman dan bisa diakses
    expect(data.queueDetails[0].selected_addons).toHaveLength(1);
    expect(data.queueDetails[0].selected_addons[0].name).toBe(
      "Telor Mata Sapi",
    );
  });

  test("[ERROR] should return 401 Unauthorized if guest cookie is missing", async () => {
    const response = await supertest(web).get(
      `/api/${STORE_PUBLIC_ID}/queue/${queueId}`,
    );

    expect(response.status).toBe(401);
    expect(response.body.errors).toContain("Unauthorized");
  });

  test("[ERROR] should return 404 if HACKER tries to access someone else's queue", async () => {
    // Skenario: Hacker login pakai guest_id dia sendiri, tapi nyoba nembak ID antrean orang lain
    const response = await supertest(web)
      .get(`/api/${STORE_PUBLIC_ID}/queue/${queueId}`)
      .set("Cookie", [`guest_id=${HACKER_GUEST_ID}`]);

    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("No queue found");
  });

  test("[ERROR] should return 404 if accessed via wrong store's public_id", async () => {
    // Skenario: User pakai ID antrean yang bener, tapi nembak public_id toko tetangga
    const response = await supertest(web)
      .get(`/api/${OTHER_STORE_PUBLIC_ID}/queue/${queueId}`)
      .set("Cookie", [`guest_id=${GUEST_ID}`]);

    expect(response.status).toBe(404);
    expect(response.body.errors).toContain("No queue found");
  });

  test("[ERROR] should return 400 Bad Request if queueId is not a number", async () => {
    const response = await supertest(web)
      .get(`/api/${STORE_PUBLIC_ID}/queue/bukan-angka`)
      .set("Cookie", [`guest_id=${GUEST_ID}`]);

    // Ditolak oleh Joi Validation
    expect(response.status).toBe(400);
  });

  test("[ERROR] should return 400 Bad Request if publicId is not a valid UUID", async () => {
    const response = await supertest(web)
      .get(`/api/bukan-uuid-valid/queue/${queueId}`)
      .set("Cookie", [`guest_id=${GUEST_ID}`]);

    // Ditolak oleh Joi Validation
    expect(response.status).toBe(400);
  });
});
