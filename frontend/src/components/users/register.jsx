import { useState } from "react";
import { userRegister } from "../../lib/userApi.js";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  const mutation = useMutation({
    mutationFn: userRegister,
    onSuccess: () => {
      toast.success(t("register.success", "Akun berhasil dibuat"));
      navigate("/verify-email", { state: { email: email } });
    },
    onError: (error) => {
      const errorCode = error.response?.data?.errors;
      if (errorCode) {
        toast.error(t(`api_errors.${errorCode}`));
      }
    },
  });
  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error("password tidak sesuai");
    }
    mutation.mutate({ email, password, name });
  };
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("title.register", "Daftar Akun")}
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

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium text-gray-700">
              {t("register.label.name", "Nama Lengkap")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-required="true"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              placeholder={t(
                "register.placeholder.name",
                "Masukkan Nama Lengkap",
              )}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="username"
              className="text-sm font-medium text-gray-700"
            >
              {t("register.label.email", "Email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              placeholder={t("register.placeholder.email", "Masukkan Email")}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              {t("register.label.password", "Kata Sandi")}
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

          {/* Konfirmasi Password */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-gray-700"
            >
              {t("register.label.confirmPassword", "Konfirmasi Kata Sandi")}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {t("register.button", "Registrasi")}
          </button>
        </form>
      </main>
    </div>
  );
}
