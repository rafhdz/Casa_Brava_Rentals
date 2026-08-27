import type { MockUser } from "@/lib/mock-data";

function RoleBadge({ rol }: { rol: MockUser["rol"] }) {
  const isAdmin = rol === "admin";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isAdmin ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"
      }`}
    >
      {isAdmin ? "Admin" : "Huésped"}
    </span>
  );
}

function StatusBadge({ estado }: { estado: MockUser["estado"] }) {
  const isActivo = estado === "activo";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActivo ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {isActivo ? "Activo" : "Invitado"}
    </span>
  );
}

export default function UsersTable({ users }: { users: MockUser[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <th className="px-4 py-3 font-medium">Nombre</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Rol</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3 font-medium text-neutral-900">{user.nombre}</td>
              <td className="px-4 py-3 text-neutral-600">{user.email}</td>
              <td className="px-4 py-3">
                <RoleBadge rol={user.rol} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge estado={user.estado} />
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
