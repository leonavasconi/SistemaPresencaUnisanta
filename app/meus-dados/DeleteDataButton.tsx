"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteMyData } from "./actions";

export function DeleteDataButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-unisanta-red to-unisanta-red-dark px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-red-900/20 transition-all hover:brightness-110"
      >
        <Trash2 className="h-4 w-4" />
        Excluir meus dados e sair
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">
                Excluir dados permanentemente?
              </h3>
              <p className="mt-2 text-sm text-zinc-600">
                Esta ação não pode ser desfeita. Seus dados pessoais e biometria serão
                deletados, mas o histórico de presenças será mantido de forma anônima.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <form action={deleteMyData} className="flex-1">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-unisanta-red px-4 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-110"
                >
                  Sim, excluir
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}