import Link from "next/link";

export default function AddedToCartBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
      {message}{" "}
      <Link href="/carrito" className="underline underline-offset-2">
        Ver carrito
      </Link>
    </div>
  );
}
