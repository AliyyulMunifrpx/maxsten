import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegister } from "../../hooks/auth.js";
import toast from "react-hot-toast"; // 1. Import toast

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const { mutate, isPending } = useRegister();
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    mutate(form, {
      onSuccess: (data) => {
        // 2. Tambahkan toast sukses
        toast.success("Registrasi berhasil! Silakan cek email kamu.");
        console.log("Registration successful:", data);

        navigate("/verify-email", { state: { email: form.email, startTimer: true } });
      },
      onError: (err) => {
       
        toast.error(err.message || "Gagal mendaftar, silakan coba lagi.");
      },
    });
  }

  return (
    // p-8 = 32px
    // rounded-2xl = 16px
    <div className="w-full rounded-2xl bg-white p-8 ">
      {/* text-2xl = 24px, mb-3 = 12px (Batas minimum) */}
      <h1 className="mb-3 text-center text-2xl font-semibold">Daftar Akun</h1>

      {/* text-base = 16px, mb-6 = 24px */}
      <p className="mb-6 text-center text-base text-muted-foreground">
        Buat akun buat mulai pakai Maxsten
      </p>

      {/* space-y-6 = 24px (Jarak antar grup input form) */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* space-y-3 = 12px */}
        <div className="space-y-3">
          <Label htmlFor="name" className="text-base">
            Nama
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Nama lengkap"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            // h-12 = 48px, text-base = 16px, px-4 = 16px
            className="h-12 px-4 text-base"
          />
        </div>

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
            className="h-12 px-4 text-base"
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="password" className="text-base">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Minimal 8 karakter"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={8}
            required
            className="h-12 px-4 text-base"
          />
        </div>

        {/* h-12 = 48px, text-base = 16px */}
        <Button
          type="submit"
          className="h-12 w-full text-base"
          disabled={isPending}
        >
          {isPending ? "Mendaftar..." : "Daftar"}
        </Button>
      </form>

      {/* mt-6 = 24px, text-base = 16px */}
      <p className="mt-6 text-center text-base text-muted-foreground">
        Udah punya akun?{" "}
        <Link to="/login" className="text-foreground underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
