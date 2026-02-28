"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-slate-500";
const labelClass = "mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responsableIva, setResponsableIva] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [resumen, setResumen] = useState({ nombre: "", nit: "", direccion: "", telefono: "" });
  const supabase = createClient();

  useEffect(() => {
    async function checkUser() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      // Obtener organization_id del usuario
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", currentUser.id)
        .single();

      if (userError || !userData) {
        router.push("/login?error=no_organization");
        return;
      }

      setOrganizationId(userData.organization_id);

      // Verificar si ya tiene sucursales
      const { data: branches, error: branchesError } = await supabase
        .from("branches")
        .select("id")
        .eq("organization_id", userData.organization_id);

      if (!branchesError && branches && branches.length > 0) {
        // Ya tiene sucursales, redirigir a dashboard
        router.push("/dashboard");
      }
    }

    checkUser();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !organizationId) return;

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const nombre = formData.get("nombre") as string;
    const nit = formData.get("nit") as string;
    const direccion = formData.get("direccion") as string;
    const telefono = formData.get("telefono") as string;
    const logoFile = formData.get("logo") as File | null;

    try {
      let logoUrl: string | null = null;

      // Subir logo a Supabase Storage si existe
      if (logoFile && logoFile.size > 0) {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(logoFile.type)) {
          setError("Formato de imagen no permitido. Usa JPEG, PNG, WebP o GIF.");
          setLoading(false);
          return;
        }
        const maxSize = 5 * 1024 * 1024; // 5 MB
        if (logoFile.size > maxSize) {
          setError("El logo no debe superar 5 MB.");
          setLoading(false);
          return;
        }
        const fileExt = logoFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `branches/${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(filePath, logoFile, { upsert: false });

        if (uploadError) {
          setError(uploadError.message || "Error al subir el logo. Revisa que el bucket 'logos' exista.");
          setLoading(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("logos").getPublicUrl(filePath);
        logoUrl = urlData.publicUrl;
      }

      // Crear la primera sucursal
      const { data: branchData, error: branchError } = await supabase
        .from("branches")
        .insert({
          organization_id: organizationId,
          name: nombre,
          nit,
          address: direccion,
          phone: telefono,
          responsable_iva: responsableIva,
          logo_url: logoUrl,
        })
        .select()
        .single();

      if (branchError || !branchData) {
        setError(branchError?.message || "Error al crear la sucursal. Por favor intenta de nuevo.");
        setLoading(false);
        return;
      }

      // Vincular usuario a la sucursal
      const { error: userBranchError } = await supabase
        .from("user_branches")
        .insert({
          user_id: user.id,
          branch_id: branchData.id,
        });

      if (userBranchError) {
        setError("Error al vincular usuario a la sucursal. Por favor intenta de nuevo.");
        setLoading(false);
        return;
      }

      // Redirigir a dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Error inesperado. Por favor intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <header className="space-y-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Configura tu sucursal
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Estos datos son los de tu punto de venta o negocio. Cada sucursal tendrá sus propios números de venta, inventario y configuración.
            </p>
          </div>
        </header>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-[13px] text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
            <div className="space-y-4">
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Logo
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Vista previa" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-[12px] font-medium text-slate-400">Sin logo</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      name="logo"
                      disabled={loading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLogoPreview(URL.createObjectURL(file));
                          setLogoFileName(file.name);
                        } else {
                          setLogoPreview(null);
                          setLogoFileName(null);
                        }
                      }}
                      className="block w-full text-[13px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">JPEG, PNG, WebP o GIF. Máx. 5 MB.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Datos de la sucursal
                </p>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className={labelClass}>
                      Nombre de la sucursal <span className="text-ov-pink">*</span>
                    </label>
                    <input
                      name="nombre"
                      placeholder="Ej. Sucursal Norte"
                      className={inputClass}
                      required
                      disabled={loading}
                      value={resumen.nombre}
                      onChange={(e) => setResumen((r) => ({ ...r, nombre: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      NIT <span className="text-ov-pink">*</span>
                    </label>
                    <input
                      name="nit"
                      placeholder="Ej. 900.123.456-7"
                      className={inputClass}
                      required
                      disabled={loading}
                      value={resumen.nit}
                      onChange={(e) => setResumen((r) => ({ ...r, nit: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Dirección</label>
                    <input
                      name="direccion"
                      placeholder="Ej. Cra 15 # 80-10"
                      className={inputClass}
                      disabled={loading}
                      value={resumen.direccion}
                      onChange={(e) => setResumen((r) => ({ ...r, direccion: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Teléfono</label>
                    <input
                      name="telefono"
                      placeholder="Ej. 601 765 4321"
                      className={inputClass}
                      disabled={loading}
                      value={resumen.telefono}
                      onChange={(e) => setResumen((r) => ({ ...r, telefono: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Impuestos
                </p>
                <label className="mt-3 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={responsableIva}
                    onChange={(e) => setResponsableIva(e.target.checked)}
                    disabled={loading}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 dark:text-slate-700 dark:focus:ring-slate-500"
                  />
                  <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                    Es responsable de IVA
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Resumen
                </p>
                <dl className="mt-3 space-y-1.5 text-[13px]">
                  {resumen.nombre.trim() && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500 dark:text-slate-400">Nombre</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100 truncate">{resumen.nombre}</dd>
                    </div>
                  )}
                  {resumen.nit.trim() && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500 dark:text-slate-400">NIT</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100 truncate">{resumen.nit}</dd>
                    </div>
                  )}
                  {resumen.direccion.trim() && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500 dark:text-slate-400">Dirección</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100 truncate">{resumen.direccion}</dd>
                    </div>
                  )}
                  {resumen.telefono.trim() && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500 dark:text-slate-400">Teléfono</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100 truncate">{resumen.telefono}</dd>
                    </div>
                  )}
                  {(responsableIva || resumen.nombre || resumen.nit || resumen.direccion || resumen.telefono || logoFileName) && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500 dark:text-slate-400">Responsable IVA</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100">{responsableIva ? "Sí" : "No"}</dd>
                    </div>
                  )}
                  {logoFileName && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500 dark:text-slate-400">Logo</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100 truncate">{logoFileName}</dd>
                    </div>
                  )}
                </dl>
                {!resumen.nombre.trim() && !resumen.nit.trim() && !resumen.direccion.trim() && !resumen.telefono.trim() && !logoFileName && (
                  <p className="mt-3 text-[12px] text-slate-400 dark:text-slate-500">
                    Completa los datos a la izquierda para ver el resumen.
                  </p>
                )}
                <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-70 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    {loading ? "Creando sucursal…" : "Crear sucursal"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
