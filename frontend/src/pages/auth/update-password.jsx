import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdatePassword } from "../../hooks/auth.js";
import toast from "react-hot-toast";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const { mutate, isPending } = useUpdatePassword();
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    mutate(password, {
      onSuccess: () => {
        toast.success("Password berhasil diperbarui!");
        // Kalau sukses, langsung lempar ke dashboard atau login
        navigate("/dashboard");
      },
      onError: (err) => {
        toast.error(err.message || "Gagal memperbarui password.");
      },
    });
  }

  return (
    <div className="w-full rounded-2xl bg-white p-8">
      <h1 className="mb-3 text-center text-2xl font-semibold">
        Buat Password Baru
      </h1>
      <p className="mb-6 text-center text-base text-muted-foreground">
        Silakan masukkan password baru kamu di bawah ini.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="password" className="text-base">
            Password Baru
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            className="h-12 px-4 text-base"
          />
        </div>

        <Button
          type="submit"
          className="h-12 w-full text-base"
          disabled={isPending}
        >
          {isPending ? "Menyimpan..." : "Simpan Password"}
        </Button>
      </form>
    </div>
  );
}
