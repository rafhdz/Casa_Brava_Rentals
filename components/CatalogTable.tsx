"use client";

import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CatalogActionResult } from "@/app/admin/catalogos/actions";

/**
 * Tabla de un catálogo administrable, con sus modales de crear / editar /
 * eliminar.
 *
 * Los cuatro catálogos de `/admin/catalogos` (tarifas, masajistas, menús y
 * vinos) son el mismo CRUD sobre un puñado de campos planos: cambia la lista
 * de campos, el endpoint y los textos, no la mecánica. Por eso este componente
 * se describe con datos (`fields`) en vez de existir cuatro veces copiado —
 * cada catálogo aporta sus campos y sus tres Server Actions desde
 * `CatalogsView`.
 *
 * El formulario trabaja siempre con **strings** (es lo que devuelve un
 * `<input>`); la conversión a number la hace el adaptador de cada catálogo en
 * `CatalogsView`, con `toNumber()`, justo antes de llamar a la Server Action.
 */

export type CatalogFieldOption = { value: string; label: string };

export type CatalogField = {
  /** Clave dentro de `values`/`display` de cada fila y del formulario. */
  name: string;
  label: string;
  type: "text" | "number" | "select";
  /** Solo para `type: "select"`. */
  options?: readonly CatalogFieldOption[];
  required?: boolean;
  /** Solo para `type: "number"`: `"0.01"` para dinero, `"1"` para enteros. */
  step?: string;
  min?: string;
  placeholder?: string;
  /** Nota bajo el campo en el modal, para explicar una regla del backend. */
  help?: string;
  /** Los importes y las cantidades se alinean a la derecha. */
  align?: "left" | "right";
};

export type CatalogRow = {
  id: string;
  /** Nombre legible de la fila, para los textos de los modales. */
  label: string;
  /** Valor por campo tal como lo edita el formulario (siempre string). */
  values: Record<string, string>;
  /**
   * Valor por campo ya listo para la celda: texto formateado
   * (`formatMoney`, `%`, …) o un nodo, cuando la columna se pinta como
   * insignia en vez de como texto plano.
   */
  display: Record<string, ReactNode>;
};

export type CatalogMessages = {
  /** Encabezado de la sección, ej. "Menús". */
  title: string;
  description: string;
  /** Texto del botón de alta, ej. "Nuevo menú". */
  createButton: string;
  createTitle: string;
  editTitle: string;
  deleteTitle: string;
  /** Con artículo, para meterlo en una frase: "el menú". */
  subject: string;
  created: string;
  updated: string;
  deleted: string;
  /** Qué implica borrarlo — segundo paso de la confirmación. */
  deleteWarning: string;
  empty: string;
};

// Mismas clases que UsersTable.tsx / ReservationsTable.tsx: los modales del
// panel comparten lenguaje visual, y cada archivo las declara por su cuenta
// como ya hacen esos dos.
const INPUT_CLASS =
  "rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 transition-all duration-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900";

const PRIMARY_BUTTON_CLASS =
  "rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out enabled:hover:bg-neutral-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60";

const SECONDARY_BUTTON_CLASS =
  "rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition-all duration-300 ease-in-out hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60";

const DANGER_BUTTON_CLASS =
  "rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out enabled:hover:bg-red-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60";

const OVERLAY_CLASS =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm [animation:fade-in_200ms_ease-out]";

const DIALOG_CLASS =
  "w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl [animation:modal-in_200ms_ease-out]";

// Cierra con Escape — listener nativo en un useEffect, igual que en
// UsersTable.tsx y ReservationsTable.tsx.
function useCloseOnEscape(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}

/** Valores iniciales del formulario: los de la fila, o el primer valor de cada select. */
function valoresIniciales(
  fields: readonly CatalogField[],
  row: CatalogRow | null
): Record<string, string> {
  const inicial: Record<string, string> = {};
  for (const field of fields) {
    inicial[field.name] = row?.values[field.name] ?? field.options?.[0]?.value ?? "";
  }
  return inicial;
}

function CatalogFormModal({
  fields,
  row,
  messages,
  onClose,
  onSubmit,
  isPending,
}: {
  fields: readonly CatalogField[];
  /** `null` en el alta; la fila a editar en la edición. */
  row: CatalogRow | null;
  messages: CatalogMessages;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
  isPending: boolean;
}) {
  const [values, setValues] = useState(() => valoresIniciales(fields, row));

  useCloseOnEscape(onClose);

  function handleChange(name: string, value: string) {
    setValues((previo) => ({ ...previo, [name]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <div className={OVERLAY_CLASS} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-form-modal-title"
        onClick={(e) => e.stopPropagation()}
        className={DIALOG_CLASS}
      >
        <h2 id="catalog-form-modal-title" className="text-lg font-semibold text-neutral-900">
          {row ? messages.editTitle : messages.createTitle}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {row ? row.label : messages.description}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {fields.map((field) => (
            <label key={field.name} className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">{field.label}</span>

              {field.type === "select" ? (
                <select
                  value={values[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className={INPUT_CLASS}
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={values[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  step={field.step}
                  min={field.min}
                  placeholder={field.placeholder}
                  className={INPUT_CLASS}
                />
              )}

              {field.help && <span className="text-xs text-neutral-500">{field.help}</span>}
            </label>
          ))}

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className={SECONDARY_BUTTON_CLASS}
            >
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className={PRIMARY_BUTTON_CLASS}>
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteCatalogRowModal({
  row,
  messages,
  onClose,
  onConfirm,
  isPending,
}: {
  row: CatalogRow;
  messages: CatalogMessages;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  // Doble confirmación en dos pasos dentro del mismo modal, igual que el
  // borrado de reservaciones. Se reinicia solo al volver a montarse (el padre
  // lo renderiza condicionalmente), sin lógica extra.
  const [step, setStep] = useState<1 | 2>(1);
  useCloseOnEscape(onClose);

  return (
    <div className={OVERLAY_CLASS} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-catalog-row-modal-title"
        onClick={(e) => e.stopPropagation()}
        className={DIALOG_CLASS}
      >
        <h2
          id="delete-catalog-row-modal-title"
          className="text-lg font-semibold text-neutral-900"
        >
          {messages.deleteTitle}
        </h2>

        {step === 1 ? (
          <>
            <p className="mt-2 text-sm text-neutral-600">
              ¿Eliminar {messages.subject}{" "}
              <span className="font-medium text-neutral-900">{row.label}</span>?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
                Cancelar
              </button>
              <button type="button" onClick={() => setStep(2)} className={PRIMARY_BUTTON_CLASS}>
                Continuar
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-neutral-600">{messages.deleteWarning}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isPending}
                className={SECONDARY_BUTTON_CLASS}
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                className={DANGER_BUTTON_CLASS}
              >
                Sí, eliminar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CatalogTable({
  fields,
  rows,
  messages,
  onCreate,
  onUpdate,
  onDelete,
}: {
  fields: readonly CatalogField[];
  rows: CatalogRow[];
  messages: CatalogMessages;
  onCreate: (values: Record<string, string>) => Promise<CatalogActionResult>;
  onUpdate: (id: string, values: Record<string, string>) => Promise<CatalogActionResult>;
  onDelete: (id: string) => Promise<CatalogActionResult>;
}) {
  // Como UsersTable: las filas se renderizan tal cual llegan por props. El
  // refresco tras una acción lo trae el `revalidatePath` de la Server Action,
  // no una copia local que habría que mantener sincronizada.
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [rowToEdit, setRowToEdit] = useState<CatalogRow | null>(null);
  const [rowToDelete, setRowToDelete] = useState<CatalogRow | null>(null);
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  function handleCreate(values: Record<string, string>) {
    startCreateTransition(async () => {
      const result = await onCreate(values);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setIsCreateOpen(false);
      toast.success(messages.created);
    });
  }

  function handleUpdate(values: Record<string, string>) {
    if (!rowToEdit) return;
    const id = rowToEdit.id;

    startUpdateTransition(async () => {
      const result = await onUpdate(id, values);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setRowToEdit(null);
      toast.success(messages.updated);
    });
  }

  function handleDelete() {
    if (!rowToDelete) return;
    const id = rowToDelete.id;

    startDeleteTransition(async () => {
      const result = await onDelete(id);
      if ("error" in result) {
        // Un 409 llega aquí cuando la fila ya tiene historial (FK PROTECT en
        // el backend); el mensaje viene redactado y se muestra tal cual.
        toast.error(result.error);
        return;
      }
      setRowToDelete(null);
      toast.success(messages.deleted);
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">{messages.title}</h2>
          <p className="mt-1 text-sm text-neutral-500">{messages.description}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex w-fit items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:bg-neutral-700 active:scale-95"
        >
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          {messages.createButton}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              {fields.map((field) => (
                <th
                  key={field.name}
                  className={`px-4 py-3 font-medium ${
                    field.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {field.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={fields.length + 1}
                  className="px-4 py-6 text-center text-sm text-neutral-500"
                >
                  {messages.empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100 last:border-0">
                  {fields.map((field, index) => (
                    <td
                      key={field.name}
                      className={`px-4 py-3 ${
                        field.align === "right" ? "text-right tabular-nums" : ""
                      } ${index === 0 ? "font-medium text-neutral-900" : "text-neutral-600"}`}
                    >
                      {row.display[field.name]}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setRowToEdit(row)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition-all duration-300 ease-in-out hover:border-neutral-900 hover:text-neutral-900 active:scale-95"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setRowToDelete(row)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition-all duration-300 ease-in-out hover:border-red-600 hover:bg-red-50 active:scale-95"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isCreateOpen && (
        <CatalogFormModal
          fields={fields}
          row={null}
          messages={messages}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreate}
          isPending={isCreatePending}
        />
      )}

      {rowToEdit && (
        <CatalogFormModal
          // `key` fuerza un montaje nuevo al cambiar de fila: el estado del
          // formulario se siembra en el inicializador de useState, así que sin
          // esto una segunda edición reutilizaría los valores de la primera.
          key={rowToEdit.id}
          fields={fields}
          row={rowToEdit}
          messages={messages}
          onClose={() => setRowToEdit(null)}
          onSubmit={handleUpdate}
          isPending={isUpdatePending}
        />
      )}

      {rowToDelete && (
        <DeleteCatalogRowModal
          row={rowToDelete}
          messages={messages}
          onClose={() => setRowToDelete(null)}
          onConfirm={handleDelete}
          isPending={isDeletePending}
        />
      )}
    </section>
  );
}
