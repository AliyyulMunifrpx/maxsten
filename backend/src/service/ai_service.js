import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const reportGenerator = async (user, month, year) => {
  const ownerName = user.name;

  // 1. AMBIL INFO TOKO
  const store = await prisma.store.findFirst({
    where: { user_id: user.id, is_delete: false },
    select: { id: true, name: true, timezone: true },
  });

  if (!store) throw new ResponseError(404, "Toko tidak ditemukan");

  const tz = store.timezone || "Asia/Jakarta";

  // --- 2. SETTING RANGE WAKTU ---
  const nowUtc = new Date();
  const nowZoned = toZonedTime(nowUtc, tz);
  const currentYear = nowZoned.getFullYear();
  const currentMonth = nowZoned.getMonth() + 1;

  const selectedYear = year ? Number(year) : currentYear;
  const selectedMonth = month ? Number(month) : currentMonth;

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

  // --- 3. QUERY OPTIMAL: Cuma ambil agregasi ---
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

  // Jika tidak ada transaksi sama sekali, langsung return JSON manual tanpa nembak AI
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

  // --- 4. HITUNG WAKTU TUNGGU & PEAK TRAFFIC ---
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

  // --- 5. TOP 3 PRODUK ---
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

  // --- 6. TOP 3 ADDON ---
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

  // --- 7. RAKIT PROMPT UNTUK OPENROUTER ---
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
    // Kita pakai fetch bawaan Node.js, nggak butuh axios lagi
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "UMKM Hub",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-ultra-550b-a55b:free",
          messages: [
            {
              role: "system",
              content:
                "Kamu adalah AI konsultan bisnis yang HANYA membalas dengan JSON yang valid.",
            },
            {
              role: "user",
              content: promptText,
            },
          ],
        }),
      },
    );

    // Handle kalau OpenRouter ngasih pesan error (misal API key salah / server down)
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    let aiResponseText = data.choices[0].message.content;

    // PEMBERSIH JSON: Jaga-jaga kalau model Tencent membandel ngasih markdown
    aiResponseText = aiResponseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Parsing string yang udah bersih jadi objek
    const aiData = JSON.parse(aiResponseText);

    return { ai_report: aiData };
  } catch (error) {
    console.error("OpenRouter Error:", error.message);
    throw new ResponseError(500, "Gagal mendapatkan analisa dari AI saat ini.");
  }
};

export default { reportGenerator };
