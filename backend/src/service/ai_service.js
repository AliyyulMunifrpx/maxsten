import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { validate } from "../validation/validation.js";
import { descriptionGeneratorValidation } from "../validation/ai_validation.js";

const AI_REQUEST_TIMEOUT_MS = 30000;
const AI_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
const AI_REFERER = process.env.FRONTEND_URL || "http://localhost:5173";

// Helper bareng: panggil OpenRouter dengan timeout, dipakai kedua fungsi
// biar gak duplikasi logic fetch + abort + cleanup JSON di 2 tempat.
async function callOpenRouter(promptText, systemPrompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": AI_REFERER,
        "X-Title": "Maxsten AI",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptText },
        ],
      }),
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(
        `OpenRouter request timed out after ${AI_REQUEST_TIMEOUT_MS}ms`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  let aiResponseText = data.choices[0].message.content;

  // Jaga-jaga kalau model tetap ngasih markdown code block walau udah diinstruksiin jangan.
  aiResponseText = aiResponseText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(aiResponseText);
}

const reportGenerator = async (user, month, year) => {
  const ownerName = user.name;

  const store = await prisma.store.findFirst({
    where: { user_id: user.id, is_delete: false },
    select: { id: true, name: true, timezone: true },
  });

  if (!store) throw new ResponseError(404, "Store not found");

  const tz = store.timezone || "Asia/Jakarta";

  const nowUtc = new Date();
  const nowZoned = toZonedTime(nowUtc, tz);
  const currentYear = nowZoned.getFullYear();
  const currentMonth = nowZoned.getMonth() + 1;

  const selectedYear = year ? Number(year) : currentYear;
  const selectedMonth = month ? Number(month) : currentMonth;

  if (
    !Number.isInteger(selectedMonth) ||
    selectedMonth < 1 ||
    selectedMonth > 12 ||
    !Number.isInteger(selectedYear)
  ) {
    throw new ResponseError(400, "Invalid month/year parameters");
  }

  const zonedMonthStart = new Date(
    selectedYear,
    selectedMonth - 1,
    1,
    0,
    0,
    0,
    0,
  );
  const utcMonthStart = fromZonedTime(zonedMonthStart, tz);

  const zonedNextMonthStart = new Date(
    selectedYear,
    selectedMonth,
    1,
    0,
    0,
    0,
    0,
  );
  const utcNextMonthStart = fromZonedTime(zonedNextMonthStart, tz);

  const isCurrentMonth =
    selectedYear === currentYear && selectedMonth === currentMonth;
  const rangeEndUtc = isCurrentMonth ? nowUtc : utcNextMonthStart;

  const dateCondition = {
    created_at: { gte: utcMonthStart, lt: rangeEndUtc },
  };

  const aggSelesai = await prisma.queue.aggregate({
    where: { store_id: store.id, status: "SELESAI", ...dateCondition },
    _sum: { total_price: true },
    _count: true,
  });

  const aggBatal = await prisma.queue.aggregate({
    where: { store_id: store.id, status: "DIBATALKAN", ...dateCondition },
    _count: true,
  });

  const totalOmzet = aggSelesai._sum.total_price || 0;
  const totalPesanan = aggSelesai._count || 0;
  const totalBatal = aggBatal._count || 0;
  const totalTransactions = totalPesanan + totalBatal;

  if (totalTransactions === 0) {
    return {
      ai_report: {
        greeting: `Halo Kak ${ownerName},`,
        evaluation:
          "Belum ada data transaksi yang bisa dievaluasi pada periode ini.",
        recommendations: [
          "Coba bagikan link tokomu ke media sosial untuk menarik pelanggan pertama bulan ini!",
        ],
      },
    };
  }

  const cancellationRate =
    totalTransactions > 0
      ? ((totalBatal / totalTransactions) * 100).toFixed(2)
      : 0;

  const averageOrderValue =
    totalPesanan > 0 ? Math.round(totalOmzet / totalPesanan) : 0;

  const queueTimes = await prisma.queue.findMany({
    where: { store_id: store.id, status: "SELESAI", ...dateCondition },
    select: { created_at: true, completed_at: true },
  });

  let totalWaitTime = 0;
  let validWaitCount = 0;
  const hourlyCounts = Array(24).fill(0);
  const dailyCounts = Array(7).fill(0);
  const dayNames = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];

  queueTimes.forEach((q) => {
    if (q.completed_at) {
      totalWaitTime +=
        (new Date(q.completed_at) - new Date(q.created_at)) / 60000;
      validWaitCount++;
    }
    const localDate = toZonedTime(new Date(q.created_at), tz);
    hourlyCounts[localDate.getHours()] += 1;
    dailyCounts[localDate.getDay()] += 1;
  });

  const avgWaitTime =
    validWaitCount > 0 ? Math.round(totalWaitTime / validWaitCount) : 0;
  const peakHourIdx = hourlyCounts.indexOf(Math.max(...hourlyCounts));
  const peakHour =
    Math.max(...hourlyCounts) > 0
      ? `${String(peakHourIdx).padStart(2, "0")}:00 - ${String((peakHourIdx + 1) % 24).padStart(2, "0")}:00`
      : "-";
  const peakDayIdx = dailyCounts.indexOf(Math.max(...dailyCounts));
  const peakDay = Math.max(...dailyCounts) > 0 ? dayNames[peakDayIdx] : "-";

  const topSellingGroups = await prisma.queueDetail.groupBy({
    by: ["product_id"],
    where: {
      queue: { store_id: store.id, status: "SELESAI", ...dateCondition },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 3,
  });

  const productIds = topSellingGroups.map((g) => g.product_id);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const productNameMap = new Map(products.map((p) => [p.id, p.name]));

  const topProductsText = topSellingGroups
    .map(
      (g) =>
        `- ${productNameMap.get(g.product_id) || "Produk"}: ${g._sum.quantity} porsi`,
    )
    .join("\n");

  const addonDetails = await prisma.queueDetail.findMany({
    where: {
      queue: { store_id: store.id, status: "SELESAI", ...dateCondition },
      selected_addons: { not: null },
    },
    select: { selected_addons: true, quantity: true },
  });

  const addonMap = {};
  addonDetails.forEach((detail) => {
    let addons = detail.selected_addons;
    if (typeof addons === "string") {
      try {
        addons = JSON.parse(addons);
      } catch (e) {
        addons = [];
      }
    }
    if (Array.isArray(addons)) {
      addons.forEach((a) => {
        if (a.name) {
          addonMap[a.name] = (addonMap[a.name] || 0) + detail.quantity;
        }
      });
    }
  });

  const topAddonsText = Object.entries(addonMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, qty]) => `- ${name}: ${qty} pesanan`)
    .join("\n");

  // Data yang dipakai di prompt (store.name, ownerName) berasal dari input
  // user sendiri (nama toko/nama akun) - secara teori bisa disusupi teks
  // yang nyoba "membajak" instruksi prompt. Validasi shape di bawah
  // (setelah callOpenRouter) adalah lapisan pertahanan utama terhadap ini:
  // walau prompt-nya "dibajak", response yang gak sesuai shape tetap ditolak.
  const promptText = `
    Kamu adalah konsultan bisnis restoran. Evaluasi performa restoran berdasarkan data berikut.

    Data Restoran "${store.name}" (Bulan ${selectedMonth}/${selectedYear}):
    - Omzet: Rp ${totalOmzet.toLocaleString("id-ID")}
    - Pesanan Berhasil: ${totalPesanan}
    - Pesanan Batal: ${totalBatal} (Tingkat Batal: ${cancellationRate}%)
    - Rata-rata Order (AOV): Rp ${averageOrderValue.toLocaleString("id-ID")}
    - Rata-rata Waktu Tunggu: ${avgWaitTime} menit
    - Waktu Ramai: Hari ${peakDay} jam ${peakHour}

    [3 PRODUK TERLARIS]
    ${topProductsText || "- Belum ada data"}

    [3 ADD-ON TERLARIS]
    ${topAddonsText || "- Belum ada data"}

    Instruksi Output:
    Kembalikan HANYA format JSON murni tanpa markdown block. Gunakan skema persis seperti ini:
    {
      "greeting": "Halo Kak ${ownerName},",
      "evaluation": "Isi dengan 1 paragraf evaluasi singkat tentang performa di atas.",
      "recommendations": [
        "Saran praktis dan spesifik 1 berdasarkan data.",
        "Saran praktis dan spesifik 2 berdasarkan data."
      ]
    }
  `;

  try {
    const aiData = await callOpenRouter(
      promptText,
      "Kamu adalah AI konsultan bisnis yang HANYA membalas dengan JSON yang valid.",
    );

    if (
      typeof aiData?.greeting !== "string" ||
      typeof aiData?.evaluation !== "string" ||
      !Array.isArray(aiData?.recommendations) ||
      !aiData.recommendations.every((item) => typeof item === "string")
    ) {
      throw new Error("AI response did not match the expected shape");
    }

    return { ai_report: aiData };
  } catch (error) {
    console.error("OpenRouter Error:", error.message);
    throw new ResponseError(
      500,
      "Unable to obtain an analysis from the AI at this time",
    );
  }
};

const descriptionGenerator = async (req) => {
  const request = validate(descriptionGeneratorValidation, req);
  const store = await prisma.store.findFirst({
    where: { user_id: request.user_id, is_delete: false },
    select: { id: true },
  });

  if (!store) throw new ResponseError(404, "Store not found");

  // Sama seperti reportGenerator, product_name berasal dari input user -
  // validasi shape di bawah jadi lapisan pertahanan terhadap prompt injection.
  const promptText = `
    Kamu adalah Copywriter F&B profesional yang ahli membuat deskripsi menu makanan/minuman.
    Buatkan 2 pilihan deskripsi yang singkat, menggugah selera, dan informatif untuk produk bernama: "${request.product_name}".

    Syarat:
    - Gunakan bahasa yang ramah, asik, tapi tetap profesional.
    - Hindari kata-kata hiperbola/lebay (contoh: "paling enak sedunia").
    - Berikan skor (1-100) seberapa kuat deskripsi ini bisa menarik pembeli untuk memesan.

    Instruksi Output:
    Wajib kembalikan HANYA format JSON murni tanpa markdown block. Gunakan struktur persis seperti ini:
    {
      "recommendations": [
        { "text": "Isi deskripsi pilihan pertama di sini...", "score": 95 },
        { "text": "Isi deskripsi pilihan kedua di sini...", "score": 90 }
      ]
    }
  `;

  try {
    const aiData = await callOpenRouter(
      promptText,
      "Kamu adalah asisten AI yang HANYA merespons dengan JSON murni yang valid.",
    );

    const isValidShape =
      Array.isArray(aiData?.recommendations) &&
      aiData.recommendations.length > 0 &&
      aiData.recommendations.every(
        (item) =>
          typeof item?.text === "string" &&
          typeof item?.score === "number" &&
          item.score >= 1 &&
          item.score <= 100,
      );

    if (!isValidShape) {
      throw new Error("AI response did not match the expected shape");
    }

    return aiData;
  } catch (error) {
    console.error("AI Description Error:", error.message);
    throw new ResponseError(
      500,
      "Failed to generate an automatic product description. Please try again.",
    );
  }
};

export default { reportGenerator, descriptionGenerator };
