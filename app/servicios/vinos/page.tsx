import { serverFetchAll } from "@/lib/api/server";
import { toNumber } from "@/lib/format";
import WineBookingForm from "@/components/WineBookingForm";
import BackButton from "@/components/BackButton";
import type { Wine, WinePackage } from "@/lib/api/types";

export default async function VinosServicePage() {
  const [wines, winePackages] = await Promise.all([
    serverFetchAll<Wine>("/api/servicios/vinos/"),
    serverFetchAll<WinePackage>("/api/servicios/paquetes-vino/"),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Paquete de Vinos</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Agrega botellas individuales o selecciona el paquete de 4 vinos.
        </p>
      </div>
      <WineBookingForm
        // Solo se ofertan botellas con inventario; los precios llegan como
        // string decimal desde DRF y se convierten aquí.
        wines={wines
          .filter((wine) => wine.stock > 0)
          .map((wine) => ({
            id: wine.id,
            name: wine.name,
            type: wine.type,
            price: toNumber(wine.price),
          }))}
        winePackage={
          winePackages[0]
            ? {
                id: winePackages[0].id,
                name: winePackages[0].name,
                price: toNumber(winePackages[0].price),
              }
            : null
        }
      />
    </div>
  );
}
