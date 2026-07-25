import { useState } from "react";
import { userLogin } from "../../lib/userApi.js";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { connectToSocket } from "../../lib/socket/socket.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  const mutation = useMutation({
    mutationFn: userLogin,
    onSuccess: (data) => {
      toast.success(t("login.success", "Login Berhasil"));
      localStorage.setItem("user", JSON.stringify(data));
      console.log("User data stored in localStorage:", data);
      navigate("/seller");
      connectToSocket();
    },
    onError: (error) => {
      const errorCode = error.response?.data?.errors;
      
      if (errorCode === "ERR_UNVERIFIED_EMAIL") {
        toast.error("Email kamu belum diverifikasi!");
        // Lempar ke halaman verifikasi dengan bawa emailnya
        navigate("/verify-email", { state: { email: email } });
      } else {
        toast.error("Email atau password salah.");
      }
      console.error("Login error:", errorCode);
    },
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    mutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("title.login", "Masuk Akun")}
          </h1>

          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => changeLanguage("en")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                i18n.language === "en"
                  ? "bg-white shadow text-blue-600"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => changeLanguage("id")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                i18n.language === "id"
                  ? "bg-white shadow text-blue-600"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              ID
            </button>
          </div>
        </header>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              {t("login.label.email", "Email")}
            </label>
            <input
              id="email"
              name="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              placeholder={t(
                "login.placeholder.email",
                "Masukkan Email",
              )}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              {t("login.label.password", "Kata Sandi")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 focus:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all active:scale-[0.98]"
          >
            {t("login.button", "Masuk")}
          </button>
        </form>
      </main>
    </div>
  );
}
