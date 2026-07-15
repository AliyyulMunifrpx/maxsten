export const calculateStoreStatus = (store, operationalHours) => {
  const now = new Date();
  
  // 1. DINAMIS: Ambil timezone dari database. Kalau data lama belum punya, default ke WIB.
  const storeTimeZone = store.timezone || "Asia/Jakarta";
  
  // Bikin Date object yang terkalibrasi persis dengan waktu lokal toko tersebut
  const localString = now.toLocaleString("en-US", { timeZone: storeTimeZone });
  const localDate = new Date(localString);

  // Ambil tanggal dan hari murni
  const todayString = localDate.toLocaleDateString("id-ID"); 
  const currentDay = localDate.getDay(); // 0 = Minggu, 1 = Senin

  // 2. GUNAKAN LOCALE "en-GB" KHUSUS UNTUK JAM (Biar formatnya HH:mm pakai titik dua)
  const currentHourMin = localDate.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // 3. CEK OVERRIDE MANUAL DULU
  if (store.manual_status && store.manual_updated_at) {
    // Konversi juga tanggal override manual ke timezone toko agar sinkron
    const overrideLocalString = new Date(store.manual_updated_at).toLocaleString("en-US", { timeZone: storeTimeZone });
    const overrideDate = new Date(overrideLocalString).toLocaleDateString("id-ID");
    
    if (overrideDate === todayString) {
      return store.manual_status === "OPEN";
    }
  }

  // 4. CEK JADWAL OPERASIONAL
  const todaySchedule = operationalHours.find(h => h.day === currentDay);

  if (!todaySchedule || !todaySchedule.is_active) {
    return false; 
  }

  if (
    currentHourMin >= todaySchedule.open_time && 
    currentHourMin <= todaySchedule.close_time
  ) {
    return true;
  }

  return false;
};