import { Activity, BedDouble, Info, TrendingUp } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import SupplierPropertiesTable, { type SupplierPropertyRow } from "@/components/SupplierPropertiesTable";
import { nullOnApiError, publicFetchAll } from "@/lib/api/server";
import { formatMoney, formatPercent, toNumber } from "@/lib/format";
import { PROPERTIES, TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";
import { ownerPanelRoutes } from "@/lib/owner-panel-routes";
import {
  baselineOccupancyFromRating,
  projectAnnualRevenue,
  summarizePortfolio,
  type AnnualProjection,
} from "@/lib/revenue-simulator";
import type { PropertyListing } from "@/lib/api/types";

type TenantZeroChannel = { listing: PropertyListing; latencyMs: number } | null;

/**
 * Verifica EN VIVO el canal de Tenant 0: pide el catálogo público de
 * propiedades a Django y busca Casa Brava. Es lo que respalda el badge "En
 * línea · Conectado a Django" — sin esta llamada el badge sería otro valor
 * hardcodeado. Si Django no responde (o no tiene la propiedad), el canal se
 * reporta caído en vez de inventar datos.
 *
 * Endpoint público (`AllowAny`): este portal no exige sesión, así que aquí
 * solo se leen datos que ya son públicos — nada de reservaciones ni de
 * ocupación real de Casa Brava, que viven tras el guard de rol del
 * owner-panel.
 *
 * Fuera del componente a propósito: `performance.now()` es impuro y el lint
 * `react-hooks/purity` lo marca dentro del cuerpo de un componente.
 */
async function checkTenantZeroChannel(): Promise<TenantZeroChannel> {
  const startedAt = performance.now();
  const listings = await publicFetchAll<PropertyListing>("/api/propiedades/").catch(nullOnApiError);
  const listing = listings?.find((property) => property.slug === TENANT_ZERO_SLUG);
  if (!listing) return null;
  return { listing, latencyMs: Math.round(performance.now() - startedAt) };
}

/**
 * Portal de anfitrión. Frontera dura de la arquitectura multi-tenant (ver
 * CLAUDE.md): la fila de Casa Brava usa datos de Django y enlaza a su panel
 * real; las propiedades mock usan el motor de Revenue Management
 * (lib/revenue-simulator.ts) y nunca tocan la API.
 *
 * Métricas de la cabecera — todas calculadas, ninguna hardcodeada:
 * - Ocupación promedio proyectada y RevPAR: proyección anual del motor sobre
 *   las propiedades simuladas, ponderada por noches disponibles. Casa Brava
 *   queda fuera: su ocupación es real y privada, y no se estima.
 * - Índice de respuesta operativa: proporción del portafolio con canal
 *   operativo en línea (backend real que respondió en esta petición).
 */
export default async function SupplierPage() {
  const tenantZero = await checkTenantZeroChannel();

  const projections: AnnualProjection[] = [];
  const rows: SupplierPropertyRow[] = PROPERTIES.map((property): SupplierPropertyRow => {
    const base = {
      id: property.id,
      name: property.name,
      locationName: property.locationName,
      isInviteOnly: property.accessType === "INVITE_ONLY",
      maxGuests: property.maxGuests,
    };

    if (property.slug === TENANT_ZERO_SLUG) {
      return {
        ...base,
        kind: "tenant-zero",
        online: tenantZero !== null,
        latencyMs: tenantZero?.latencyMs ?? null,
        // DRF manda el decimal como string: se convierte aquí, en la página.
        nightlyRate: tenantZero ? toNumber(tenantZero.listing.base_price_per_night) : null,
        maxGuests: tenantZero?.listing.max_guests ?? property.maxGuests,
        managementHref: ownerPanelRoutes(TENANT_ZERO_SLUG).root,
      };
    }

    const baselineOccupancy = baselineOccupancyFromRating(property.ratingsAverage);
    const projection = projectAnnualRevenue(property.basePricePerNight, baselineOccupancy);
    projections.push(projection);
    return {
      ...base,
      kind: "simulated",
      nightlyRate: property.basePricePerNight,
      baselineOccupancy,
      projectedOccupancy: projection.totals.occupancy,
    };
  });

  const portfolio = summarizePortfolio(projections);
  const onlineCount = tenantZero ? 1 : 0;
  const responseIndex = PROPERTIES.length > 0 ? onlineCount / PROPERTIES.length : 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Mis propiedades</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Portal de anfitrión de Parras Home Hub: estado operativo de cada propiedad y simulación de
          tarifas dinámicas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Ocupación promedio proyectada"
          icon={BedDouble}
          value={formatPercent(portfolio.occupancy)}
          detail={`Proyección anual de ${projections.length} propiedades simuladas`}
        />
        <KpiCard
          label="RevPAR estimado"
          icon={TrendingUp}
          value={formatMoney(portfolio.revparCents / 100)}
          detail={`Ingreso por noche disponible · ADR ${formatMoney(portfolio.adrCents / 100)}`}
        />
        <KpiCard
          label="Índice de respuesta operativa"
          icon={Activity}
          value={formatPercent(responseIndex, 0)}
          detail={
            tenantZero
              ? `${onlineCount} de ${PROPERTIES.length} propiedades con canal en línea · Django respondió en ${tenantZero.latencyMs} ms`
              : `0 de ${PROPERTIES.length} propiedades en línea · Django no respondió`
          }
        />
      </div>

      <SupplierPropertiesTable rows={rows} />

      <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.75} aria-hidden />
        <p>
          Casa Brava es la única propiedad conectada al backend: su gestión real (usuarios,
          reservaciones y catálogos) vive en su panel. Las demás son propiedades de demostración
          — su simulador calcula con los supuestos del plan de negocio y no guarda nada. El alta
          de anfitriones y los pagos vía Stripe Connect llegan con el soporte multi-propiedad en
          el backend.
        </p>
      </div>
    </div>
  );
}
