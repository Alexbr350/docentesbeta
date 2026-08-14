"use client";
import { BadgeCheck } from "lucide-react";

const ADMINS: string[] = [
  "eira.vargas@ensfa.edu.mx",
  "alejandro_br.his23u@ensfa.edu.mx",
];

const MAESTROS_EMAILS_CACHE: { emails: string[] | null } = { emails: null };

export function esAdminOMaestro(email: string, maestrosEmails: string[]) {
  return ADMINS.includes(email) || maestrosEmails.includes(email);
}

export default function InsigniaVerificada({ tipo, size = 14 }: { tipo: "admin" | "maestro"; size?: number }) {
  return (
    <BadgeCheck
      size={size}
      className={tipo === "admin" ? "text-purple-500 flex-shrink-0" : "text-emerald-500 flex-shrink-0"}
      fill={tipo === "admin" ? "#a78bfa" : "#6ee7b7"}
      strokeWidth={2.5}
      style={{ color: "white" }}
    />
  );
}