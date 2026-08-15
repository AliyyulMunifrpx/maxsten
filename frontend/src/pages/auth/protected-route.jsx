import { Navigate, Outlet } from "react-router-dom";
import { useAuthSession } from "../../hooks/auth.js";
import { useDocumentTitle } from "../../hooks/use-document-title.js";

export default function ProtectedRoute() {
  const { data: user, isLoading, isError } = useAuthSession();
  useDocumentTitle("Memeriksa Akses");
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1e1e1e]">
        <div className="flex flex-col items-center gap-[24px]">
          <div className="flex items-center gap-[10px]">
            <span
              className="h-[10px] w-[10px] rounded-full bg-[#C0FE04] animate-[maxsten-bounce_1s_ease-in-out_infinite]"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="h-[10px] w-[10px] rounded-full bg-[#C0FE04] animate-[maxsten-bounce_1s_ease-in-out_infinite]"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="h-[10px] w-[10px] rounded-full bg-[#C0FE04] animate-[maxsten-bounce_1s_ease-in-out_infinite]"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <p className="text-[14px] font-medium tracking-wide text-neutral-400">
            Memeriksa akses...
          </p>
        </div>

        <style>{`
          @keyframes maxsten-bounce {
            0%, 80%, 100% {
              transform: translateY(0);
              opacity: 0.4;
            }
            40% {
              transform: translateY(-8px);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
