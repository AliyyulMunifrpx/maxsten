import {  useNavigate, useLocation, Navigate } from "react-router-dom";
import { Mail, } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase/supabase"; // Sesuaikan path

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  // Nangkep email yang dikirim dari halaman Login atau Register
  const email = location.state?.email;

  // Proteksi: Kalau ada orang iseng langsung ngetik /verify-email di URL
  // tanpa bawa data email, tendang balik ke halaman register
  if (!email) {
    return <Navigate to="/register" replace />;
  }

  const handleResend = async () => {
    // Supabase butuh email untuk ngirim ulang link verifikasi
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    if (error) {
      toast.error("Gagal mengirim ulang: " + error.message);
    } else {
      toast.success("Email verifikasi berhasil dikirim ulang ke " + email);
    }
  };

  const handleCheckVerification = () => {
    // KENAPA NGGAK PAKE supabase.auth.getUser() ?
    // Karena kalau user ngeklik link konfirmasinya di HP,
    // browser di laptop ini nggak akan tau kalau dia udah verifikasi.
    // Solusi terbaik: Arahkan mereka ke halaman Login buat nyoba masuk.
    toast.success("Mantap! Silakan login untuk melanjutkan.");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        {/* ... (Isi UI lo nggak ada yang gw ubah karena udah cakep) ... */}

        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-10 w-10 text-blue-600" />
          </div>

          <h1 className="text-3xl font-bold text-slate-800">
            Verifikasi Email
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            Kami telah mengirim email verifikasi ke
          </p>

          <div className="mt-4 w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 font-semibold text-blue-700">
            {email} {/* SEKARANG INI DINAMIS! */}
          </div>

          {/* ... Sisa tombol lo taruh di sini ... */}

          <div className="mt-8 flex w-full flex-col gap-3">
            <button onClick={handleResend} className="...">
              Kirim Ulang Email
            </button>
            <button onClick={handleCheckVerification} className="...">
              Saya Sudah Verifikasi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
