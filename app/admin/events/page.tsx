import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, name, starts_at, ends_at")
    .order("starts_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-unisanta-navy">Eventos</h1>
        <Link
          href="/admin/events/new"
          className="rounded-lg bg-unisanta-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-unisanta-red-dark"
        >
          + Novo evento
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-100">
        {!events || events.length === 0 ? (
          <p className="p-6 text-center text-sm text-zinc-500">
            Nenhum evento cadastrado ainda.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Início</th>
                <th className="px-4 py-3">Fim</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-800">{event.name}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(event.starts_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(event.ends_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="font-medium text-unisanta-navy hover:underline"
                    >
                      Ver painel →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
