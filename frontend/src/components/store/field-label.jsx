import { Label } from "@/components/ui/label";

export default function FieldLabel({ htmlFor, required, children }) {
  return (
    <Label
      htmlFor={htmlFor}
      className="flex items-center gap-1.5 text-white"
    >
      {children}
      {required ? (
        <span
          className="h-1.5 w-1.5 rounded-full bg-red-500"
          title="Wajib diisi"
        />
      ) : (
        <span className="rounded-full bg-white/10 px-1.5 py-1 text-[10px] font-normal border-1 border-white/10 text-white/60">
          Opsional
        </span>
      )}
    </Label>
  );
}
