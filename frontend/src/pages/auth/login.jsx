import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "../../hooks/auth.js";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const { mutate, isPending } = useLogin();

  function handleSubmit(e) {
    e.preventDefault();
    mutate(form, {
      onSuccess: (data) => {
        localStorage.setItem("access_token", data.data.access_token);
        localStorage.setItem("refresh_token", data.data.refresh_token);
        toast.success("Login berhasil!");
        navigate("/dashboard");
      },
      onError: (err) => {
        if (err.message.includes("belum diverifikasi")) {
          toast.error("Email belum diverifikasi!");

          navigate("/verify-email", { state: { email: form.email } });
        } else {
          toast.error(err.message || "Login gagal, silakan coba lagi.");
        }
      },
    });
  }

  return (
    // p-8 = 32px (Kelipatan 8)
    // rounded-2xl = 16px (Kelipatan 8) - sebelumnya rounded-xl (12px), bisa dipilih salah satu
    <div className="w-full rounded-2xl bg-white p-8 ">
      {/* text-2xl = 24px, mb-3 = 12px (Batas minimum) */}
      <h1 className="mb-3 text-center text-2xl font-semibold">Masuk Akun</h1>

      {/* text-base = 16px, mb-6 = 24px */}
      <p className="mb-6 text-center text-base text-muted-foreground">
        Selamat datang kembali di Maxsten
      </p>

      {/* space-y-6 = 24px (Jarak antar grup input form) */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* space-y-3 = 12px (Jarak antara Label dan Input, batas minimum) */}
        <div className="space-y-3">
          <Label htmlFor="email" className="text-base">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="nama@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            // Menimpa default shadcn: h-12 = 48px, text-base = 16px, px-4 = 16px
            className="h-12 px-4 text-base"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-base">
              Password
            </Label>
            {/* text-xs = 12px (Batas minimum text size) */}
            <Link
              to="/forgot-password"
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Lupa password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Masukkan password kamu"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            // Menimpa default shadcn: h-12 = 48px, text-base = 16px, px-4 = 16px
            className="h-12 px-4 text-base"
          />
        </div>

        {/* Menimpa default shadcn: h-12 = 48px, text-base = 16px */}
        <Button
          type="submit"
          className="h-12 w-full text-base"
          disabled={isPending}
        >
          {isPending ? "Masuk..." : "Masuk"}
        </Button>
      </form>

      {/* mt-6 = 24px, text-base = 16px */}
      <p className="mt-6 text-center text-base text-muted-foreground">
        Belum punya akun?{" "}
        <Link to="/register" className="text-foreground underline">
          Daftar sekarang
        </Link>
      </p>
    </div>
  );
}
