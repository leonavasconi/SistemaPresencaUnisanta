"use client";

import { useState } from "react";
import { Mail, User, GraduationCap, UserPlus } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PasswordFields } from "@/components/ui/PasswordFields";
import { signUp } from "./actions";

/**
 * Cadastro aberto a qualquer participante. Os campos acadêmicos (RA e curso)
 * só existem no formulário — e só passam a ser obrigatórios — quando a pessoa
 * marca que é aluno da Unisanta. Quem é externo conclui o cadastro apenas com
 * os campos gerais.
 *
 * Os campos são pareados em duas colunas para que o formulário caiba na tela
 * sem rolagem, inclusive com os campos acadêmicos abertos. Abaixo de `sm`
 * tudo volta a empilhar.
 *
 * A regra de negócio não vive aqui: o servidor revalida tudo em `actions.ts`.
 */
export function SignUpForm() {
  const [isUnisantaStudent, setIsUnisantaStudent] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);

  return (
    <form action={signUp} className="flex flex-col gap-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName" required>
            Nome completo
          </Label>
          <Input
            id="fullName"
            icon={User}
            name="fullName"
            required
            autoComplete="name"
            placeholder="Seu nome"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" required>
            E-mail
          </Label>
          <Input
            id="email"
            icon={Mail}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nome@dominio.com"
          />
        </div>
      </div>

      <PasswordFields onValidChange={setPasswordValid} className="gap-3.5 sm:grid-cols-2" />

      {/* Bloco do vínculo acadêmico: destacado do resto do formulário porque
          é uma escolha, não um campo a preencher — e é ela que decide se
          existem mais campos abaixo. */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
        {/* No celular o texto e o switch se empilham: lado a lado, a pergunta
            quebrava em três linhas espremidas contra o controle. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-unisanta-navy/8 text-unisanta-navy">
              <GraduationCap className="h-4.5 w-4.5" />
            </span>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-zinc-800">Você é aluno da Unisanta?</p>
              <p className="text-xs text-zinc-500">Alunos informam RA e curso.</p>
            </div>
          </div>

          <label className="flex shrink-0 cursor-pointer items-center justify-end gap-2.5">
            <span
              className={`text-xs font-medium transition-colors ${
                isUnisantaStudent ? "text-zinc-400" : "text-zinc-700"
              }`}
            >
              Não
            </span>
            <span className="relative inline-flex shrink-0 items-center">
              <input
                type="checkbox"
                name="alunoUnisanta"
                checked={isUnisantaStudent}
                onChange={(e) => setIsUnisantaStudent(e.target.checked)}
                aria-label="Você é aluno da Unisanta?"
                className="peer sr-only"
              />
              <span className="h-6 w-11 rounded-full bg-zinc-300 transition-colors peer-checked:bg-unisanta-navy peer-focus-visible:ring-4 peer-focus-visible:ring-unisanta-navy/25" />
              <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
            </span>
            <span
              className={`text-xs font-medium transition-colors ${
                isUnisantaStudent ? "text-unisanta-navy" : "text-zinc-400"
              }`}
            >
              Sim
            </span>
          </label>
        </div>

        {/* Duas colunas: os campos acadêmicos cabem numa linha só, que é o
            que mantém o formulário inteiro visível sem rolagem quando esta
            seção abre. */}
        {isUnisantaStudent && (
          <div className="mt-3.5 grid animate-[revelar_200ms_ease-out] gap-3.5 border-t border-zinc-200 pt-3.5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ra" required>
                RA
              </Label>
              <Input id="ra" name="ra" required placeholder="Seu registro acadêmico" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course" required>
                Curso
              </Label>
              <Input id="course" name="course" required placeholder="Ex: Eng. de Computação" />
            </div>
          </div>
        )}
      </div>

      <SubmitButton variant="secondary" disabled={!passwordValid} className="mt-1 w-full">
        <UserPlus className="h-4 w-4" />
        Criar conta
      </SubmitButton>
    </form>
  );
}
