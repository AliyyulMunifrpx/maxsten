import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPassword } from "../../hooks/auth.js";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const { mutate, isPending } = useForgotPassword();
  const [isSent, setIsSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    mutate(email, {
      onSuccess: () => {
        toast.success("Link reset password berhasil dikirim!");
        setIsSent(true); // Ubah tampilan kalau email sukses terkirim
      },
      onError: (err) => {
        toast.error(err.message || "Gagal mengirim link reset.");
      },
    });
  }

  return (
    <div className="w-full rounded-2xl bg-white p-8">
      <h1 className="mb-3 text-center text-2xl font-semibold">
        Lupa Password?
      </h1>

      {!isSent ? (
        <>
          <p className="mb-6 text-center text-base text-muted-foreground">
            Masukkan email yang terdaftar, kami akan mengirimkan link untuk
            membuat password baru.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 px-4 text-base"
              />
            </div>

            <Button
              type="submit"
              className="h-12 w-full text-base"
              disabled={isPending}
            >
              {isPending ? "Mengirim..." : "Kirim Link Reset"}
            </Button>
          </form>
        </>
      ) : (
        <div className="space-y-6 text-center">
          <p className="text-base text-muted-foreground">
            Silakan cek kotak masuk atau folder spam di email{" "}
            <strong>{email}</strong>.
          </p>
          <Button
            variant="outline"
            className="h-12 w-full text-base"
            onClick={() => setIsSent(false)}
          >
            Coba email lain
          </Button>
        </div>
      )}

      <p className="mt-6 text-center text-base text-muted-foreground">
        Ingat password kamu?{" "}
        <Link to="/login" className="text-foreground underline">
          Kembali ke Login
        </Link>
      </p>
    </div>
  );
}
