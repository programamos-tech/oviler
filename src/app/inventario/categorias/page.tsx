"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ConfirmDeleteModal from "@/app/components/ConfirmDeleteModal";
import { logActivity } from "@/lib/activities";
import Breadcrumb from "@/app/components/Breadcrumb";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";

type Category = { id: string; name: string; display_order: number };

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [productsCount, setProductsCount] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadCategories() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
    if (!userRow?.organization_id) return;
    const { data } = await supabase
      .from("categories")
      .select("id, name, display_order")
      .eq("organization_id", userRow.organization_id)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    setCategories(data ?? []);
  }

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      if (!userRow?.organization_id || cancelled) return;
      const { data } = await supabase
        .from("categories")
        .select("id, name, display_order")
        .eq("organization_id", userRow.organization_id)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (!cancelled) setCategories(data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Debes iniciar sesión.");
      setSaving(false);
      return;
    }
    const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
    if (!userRow?.organization_id) {
      setError("No se encontró tu organización.");
      setSaving(false);
      return;
    }
    const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.display_order), 0) + 1 : 0;
    const { data: newCat, error: insertError } = await supabase
      .from("categories")
      .insert({
        organization_id: userRow.organization_id,
        name,
        display_order: nextOrder,
      })
      .select("id")
      .single();
    if (insertError) {
      setError(insertError.message === "duplicate key value violates unique constraint \"categories_organization_id_name_key\""
        ? "Ya existe una categoría con ese nombre."
        : insertError.message);
      setSaving(false);
      return;
    }
    if (newCat?.id) {
      try {
        await logActivity(supabase, {
          organizationId: userRow.organization_id,
          userId: user.id,
          action: "category_created",
          entityType: "category",
          entityId: newCat.id,
          summary: `Creó la categoría ${name}`,
          metadata: { name },
        });
      } catch {
        // No bloquear el flujo si falla el registro de actividad
      }
    }
    setNewName("");
    await loadCategories();
    setSaving(false);
  }

  function openDeleteModal(cat: Category) {
    setDeleteTarget(cat);
    setProductsCount(null);
    const supabase = createClient();
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", cat.id)
      .then(({ count }) => setProductsCount(count ?? 0));
  }

  function closeDeleteModal() {
    if (!deleting) setDeleteTarget(null);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("categories").delete().eq("id", deleteTarget.id);
    setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
  }

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <Breadcrumb items={[{ label: "Inventario", href: "/inventario" }, { label: "Categorías" }]} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Categorías de productos
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Crea y organiza las categorías que usarás al dar de alta productos.
            </p>
          </div>
          <Link
            href="/inventario"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a inventario"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-[14px] font-medium text-red-800 dark:bg-red-900/30 dark:text-red-200" role="alert">
          {error}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Nueva categoría
          </p>
          <form onSubmit={handleAdd} className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Ej. Alimentos, Aseo, Bebidas"
              className={inputClass}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              type="submit"
              disabled={saving || !newName.trim()}
              className="h-10 shrink-0 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white transition-colors hover:bg-ov-pink-hover disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Agregar"}
            </button>
          </form>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Tus categorías
          </p>
          {loading ? (
            <p className="mt-3 text-[13px] text-slate-500">Cargando…</p>
          ) : categories.length === 0 ? (
            <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400">
              Aún no tienes categorías. Agrega una arriba para usarlas al crear productos.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 py-2 pl-3 pr-2 dark:border-slate-700"
                >
                  <span className="text-[14px] font-medium text-slate-800 dark:text-slate-100">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => openDeleteModal(c)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400"
                    title="Eliminar categoría"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4m1 4h.01M12 4h.01M17 4h.01" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={closeDeleteModal}
        title="Eliminar categoría"
        message={`¿Estás seguro de que quieres eliminar la categoría "${deleteTarget?.name ?? ""}"?`}
        warning={
          deleteTarget ? (
            productsCount === null ? (
              <span>Cargando productos asociados…</span>
            ) : productsCount === 0 ? (
              "Ningún producto usa esta categoría."
            ) : (
              <>
                <strong>{productsCount} producto{productsCount !== 1 ? "s" : ""}</strong>{" "}
                {productsCount === 1 ? "tiene" : "tienen"} esta categoría. Quedarán sin categoría.
              </>
            )
          ) : undefined
        }
        onConfirm={handleConfirmDelete}
        loading={deleting}
        confirmDisabled={productsCount === null}
        ariaTitle={`Eliminar categoría ${deleteTarget?.name ?? ""}`}
      />
    </div>
  );
}
