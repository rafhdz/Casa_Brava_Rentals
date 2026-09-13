"use client";

import { useState } from "react";
import { BadgePercent, Sparkles, Utensils, Wine as WineIcon, type LucideIcon } from "lucide-react";
import { formatMoney, toNumber } from "@/lib/format";
import { MEAL_TYPES, type MealType, type ProfileStatus } from "@/lib/api/types";
import CatalogTable, {
  type CatalogField,
  type CatalogMessages,
  type CatalogRow,
} from "@/components/CatalogTable";
import {
  createFareType,
  createMasseuse,
  createMenu,
  createWine,
  deleteFareType,
  deleteMasseuse,
  deleteMenu,
  deleteWine,
  updateFareType,
  updateMasseuse,
  updateMenu,
  updateWine,
} from "@/app/p/casa-brava/owner-panel/catalogos/actions";

/**
 * Panel de catálogos: un selector de catálogo y, debajo, la tabla del que esté
 * activo.
 *
 * Este archivo es el **adaptador** entre los cuatro catálogos y el CRUD
 * genérico de `CatalogTable`: define los campos de cada uno, cómo se ve cada
 * celda y cómo se traduce el formulario (todo strings) al cuerpo tipado que
 * espera cada Server Action. La conversión de los importes vive aquí, con
 * `toNumber()`, porque es el último punto antes de la petición — la página ya
 * hizo la conversión inversa al recibirlos como `Decimal` (string) de DRF.
 */

// Los decimales ya vienen convertidos a number desde la página (Server
// Component), según la regla de la capa de API: los componentes de
// presentación reciben números limpios, nunca el string de DRF.
export type FareTypeSummary = { id: string; name: string; surcharge_percentage: number };
export type MasseuseSummary = { id: string; name: string; status: ProfileStatus };
export type MenuSummary = {
  id: string;
  meal_type: MealType;
  name: string;
  price_per_person: number;
};
export type WineSummary = { id: string; name: string; type: string; price: number; stock: number };

type CatalogKey = "tarifas" | "masajistas" | "menus" | "vinos";

const TABS: { key: CatalogKey; label: string; icon: LucideIcon }[] = [
  { key: "tarifas", label: "Tipos de tarifa", icon: BadgePercent },
  { key: "masajistas", label: "Masajistas", icon: Sparkles },
  { key: "menus", label: "Menús", icon: Utensils },
  { key: "vinos", label: "Vinos", icon: WineIcon },
];

// ---------------------------------------------------------------------------
// Tipos de tarifa
// ---------------------------------------------------------------------------

const FARE_TYPE_FIELDS: readonly CatalogField[] = [
  { name: "name", label: "Nombre", type: "text", required: true, placeholder: "Estándar" },
  {
    name: "surcharge_percentage",
    label: "Recargo (%)",
    type: "number",
    required: true,
    step: "0.01",
    min: "0",
    align: "right",
    help: "Porcentaje que se suma al subtotal de noches, antes del depósito.",
  },
];

const FARE_TYPE_MESSAGES: CatalogMessages = {
  title: "Tipos de tarifa",
  description: "Modalidades de cobro de la estadía y el recargo que aplica cada una.",
  createButton: "Nuevo tipo de tarifa",
  createTitle: "Crear tipo de tarifa",
  editTitle: "Editar tipo de tarifa",
  deleteTitle: "Eliminar tipo de tarifa",
  subject: "el tipo de tarifa",
  created: "Tipo de tarifa creado correctamente.",
  updated: "Tipo de tarifa actualizado correctamente.",
  deleted: "Tipo de tarifa eliminado correctamente.",
  deleteWarning:
    "Dejará de ofrecerse en /reservar y en el panel de reservaciones. Si alguna reservación ya lo usa, el servidor rechazará el borrado para no reescribir su historial.",
  empty: "Todavía no hay tipos de tarifa.",
};

// ---------------------------------------------------------------------------
// Masajistas
// ---------------------------------------------------------------------------

// El backend reutiliza el enum `ProfileStatus` de los perfiles, donde el valor
// contrario a "activo" es "invitado". Para una masajista eso significa "fuera
// de servicio", así que la etiqueta que se muestra es "Inactiva": el valor que
// viaja sigue siendo `invitado`.
const MASSEUSE_STATUS_OPTIONS = [
  { value: "activo", label: "Activa" },
  { value: "invitado", label: "Inactiva" },
] as const;

const MASSEUSE_FIELDS: readonly CatalogField[] = [
  { name: "name", label: "Nombre", type: "text", required: true, placeholder: "Lucía Fernández" },
  {
    name: "status",
    label: "Estado",
    type: "select",
    options: MASSEUSE_STATUS_OPTIONS,
    help: "Una masajista inactiva deja de ofrecerse sin perder su historial. Es la vía correcta para retirar a alguien que ya atendió sesiones.",
  },
];

const MASSEUSE_MESSAGES: CatalogMessages = {
  title: "Masajistas",
  description: "Quiénes pueden atender las sesiones de spa.",
  createButton: "Nueva masajista",
  createTitle: "Crear masajista",
  editTitle: "Editar masajista",
  deleteTitle: "Eliminar masajista",
  subject: "a la masajista",
  created: "Masajista creada correctamente.",
  updated: "Masajista actualizada correctamente.",
  deleted: "Masajista eliminada correctamente.",
  deleteWarning:
    "Se eliminará junto con los bloques de disponibilidad que tenga sin reservar. Si ya atendió alguna sesión, el servidor rechazará el borrado: en ese caso márcala como inactiva.",
  empty: "Todavía no hay masajistas registradas.",
};

function MasseuseStatusBadge({ status }: { status: ProfileStatus }) {
  const activa = status === "activo";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        activa ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"
      }`}
    >
      {activa ? "Activa" : "Inactiva"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Menús
// ---------------------------------------------------------------------------

const MENU_FIELDS: readonly CatalogField[] = [
  {
    name: "meal_type",
    label: "Tiempo",
    type: "select",
    // Los valores del enum ya vienen en español desde el backend, así que
    // sirven a la vez de valor y de etiqueta.
    options: MEAL_TYPES.map((meal) => ({ value: meal, label: meal })),
  },
  {
    name: "name",
    label: "Nombre",
    type: "text",
    required: true,
    placeholder: "Menú degustación",
  },
  {
    name: "price_per_person",
    label: "Precio por persona",
    type: "number",
    required: true,
    step: "0.01",
    min: "0",
    align: "right",
  },
];

const MENU_MESSAGES: CatalogMessages = {
  title: "Menús",
  description: "Lo que ofrece la cocina en cada tiempo de comida, con su precio por persona.",
  createButton: "Nuevo menú",
  createTitle: "Crear menú",
  editTitle: "Editar menú",
  deleteTitle: "Eliminar menú",
  subject: "el menú",
  created: "Menú creado correctamente.",
  updated: "Menú actualizado correctamente.",
  deleted: "Menú eliminado correctamente.",
  deleteWarning:
    "Dejará de ofrecerse en /servicios/comida. Los servicios ya contratados conservan el precio con el que se cobraron; si alguno usa este menú, el servidor rechazará el borrado.",
  empty: "Todavía no hay menús en el catálogo.",
};

// ---------------------------------------------------------------------------
// Vinos
// ---------------------------------------------------------------------------

const WINE_FIELDS: readonly CatalogField[] = [
  { name: "name", label: "Nombre", type: "text", required: true, placeholder: "Casa Madero V" },
  { name: "type", label: "Tipo", type: "text", required: true, placeholder: "Tinto" },
  { name: "price", label: "Precio", type: "number", required: true, step: "0.01", min: "0", align: "right" },
  {
    name: "stock",
    label: "Existencias",
    type: "number",
    required: true,
    step: "1",
    min: "0",
    align: "right",
    help: "Botellas disponibles. El catálogo se muestra igual con existencias en cero.",
  },
];

const WINE_MESSAGES: CatalogMessages = {
  title: "Vinos",
  description: "Botellas del catálogo, con su precio y sus existencias.",
  createButton: "Nuevo vino",
  createTitle: "Crear vino",
  editTitle: "Editar vino",
  deleteTitle: "Eliminar vino",
  subject: "el vino",
  created: "Vino creado correctamente.",
  updated: "Vino actualizado correctamente.",
  deleted: "Vino eliminado correctamente.",
  deleteWarning:
    "Dejará de ofrecerse en /servicios/vinos. Si algún pedido ya lo incluye, el servidor rechazará el borrado para no reescribir ese pedido.",
  empty: "Todavía no hay vinos en el catálogo.",
};

// ---------------------------------------------------------------------------

export default function CatalogsView({
  fareTypes,
  masseuses,
  menus,
  wines,
}: {
  fareTypes: FareTypeSummary[];
  masseuses: MasseuseSummary[];
  menus: MenuSummary[];
  wines: WineSummary[];
}) {
  const [activeTab, setActiveTab] = useState<CatalogKey>("tarifas");

  const fareTypeRows: CatalogRow[] = fareTypes.map((fare) => ({
    id: fare.id,
    label: fare.name,
    values: { name: fare.name, surcharge_percentage: String(fare.surcharge_percentage) },
    display: {
      name: fare.name,
      surcharge_percentage: `${fare.surcharge_percentage.toFixed(2)}%`,
    },
  }));

  const masseuseRows: CatalogRow[] = masseuses.map((masseuse) => ({
    id: masseuse.id,
    label: masseuse.name,
    values: { name: masseuse.name, status: masseuse.status },
    display: {
      name: masseuse.name,
      status: <MasseuseStatusBadge status={masseuse.status} />,
    },
  }));

  const menuRows: CatalogRow[] = menus.map((menu) => ({
    id: menu.id,
    label: menu.name,
    values: {
      meal_type: menu.meal_type,
      name: menu.name,
      price_per_person: String(menu.price_per_person),
    },
    display: {
      meal_type: menu.meal_type,
      name: menu.name,
      price_per_person: formatMoney(menu.price_per_person),
    },
  }));

  const wineRows: CatalogRow[] = wines.map((wine) => ({
    id: wine.id,
    label: wine.name,
    values: {
      name: wine.name,
      type: wine.type,
      price: String(wine.price),
      stock: String(wine.stock),
    },
    display: {
      name: wine.name,
      type: wine.type,
      price: formatMoney(wine.price),
      stock: String(wine.stock),
    },
  }));

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="Catálogos"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = key === activeTab;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 ease-in-out active:scale-95 ${
                isActive
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {activeTab === "tarifas" && (
        <CatalogTable
          fields={FARE_TYPE_FIELDS}
          rows={fareTypeRows}
          messages={FARE_TYPE_MESSAGES}
          onCreate={(values) =>
            createFareType({
              name: values.name,
              surcharge_percentage: toNumber(values.surcharge_percentage),
            })
          }
          onUpdate={(id, values) =>
            updateFareType(id, {
              name: values.name,
              surcharge_percentage: toNumber(values.surcharge_percentage),
            })
          }
          onDelete={deleteFareType}
        />
      )}

      {activeTab === "masajistas" && (
        <CatalogTable
          fields={MASSEUSE_FIELDS}
          rows={masseuseRows}
          messages={MASSEUSE_MESSAGES}
          onCreate={(values) =>
            createMasseuse({ name: values.name, status: values.status as ProfileStatus })
          }
          onUpdate={(id, values) =>
            updateMasseuse(id, { name: values.name, status: values.status as ProfileStatus })
          }
          onDelete={deleteMasseuse}
        />
      )}

      {activeTab === "menus" && (
        <CatalogTable
          fields={MENU_FIELDS}
          rows={menuRows}
          messages={MENU_MESSAGES}
          onCreate={(values) =>
            createMenu({
              meal_type: values.meal_type as MealType,
              name: values.name,
              price_per_person: toNumber(values.price_per_person),
            })
          }
          onUpdate={(id, values) =>
            updateMenu(id, {
              meal_type: values.meal_type as MealType,
              name: values.name,
              price_per_person: toNumber(values.price_per_person),
            })
          }
          onDelete={deleteMenu}
        />
      )}

      {activeTab === "vinos" && (
        <CatalogTable
          fields={WINE_FIELDS}
          rows={wineRows}
          messages={WINE_MESSAGES}
          onCreate={(values) =>
            createWine({
              name: values.name,
              type: values.type,
              price: toNumber(values.price),
              stock: toNumber(values.stock),
            })
          }
          onUpdate={(id, values) =>
            updateWine(id, {
              name: values.name,
              type: values.type,
              price: toNumber(values.price),
              stock: toNumber(values.stock),
            })
          }
          onDelete={deleteWine}
        />
      )}
    </div>
  );
}
