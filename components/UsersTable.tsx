"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { MockUser, UserRole, UserStatus } from "@/lib/mock-data";

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

const INPUT_CLASS =
  "rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 transition-all duration-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900";

function EditUserModal({
  user,
  onClose,
  onSave,
}: {
  user: MockUser;
  onClose: () => void;
  onSave: (updatedUser: MockUser) => void;
}) {
  const [nombre, setNombre] = useState(user.nombre);
  const [email, setEmail] = useState(user.email);
  const [rol, setRol] = useState<UserRole>(user.rol);
  const [estado, setEstado] = useState<UserStatus>(user.estado);

  // Cerrar con Escape, igual que cualquier modal accesible — listener nativo en un
  // useEffect (no un derivado de estado), mismo patrón que los listeners globales de Carousel.tsx.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({ ...user, nombre, email, rol, estado });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm [animation:fade-in_200ms_ease-out]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl [animation:modal-in_200ms_ease-out]"
      >
        <h2 id="edit-user-modal-title" className="text-lg font-semibold text-neutral-900">
          Editar usuario
        </h2>
        <p className="mt-1 text-sm text-neutral-500">Actualiza los datos de {user.nombre}.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">Nombre</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">Correo</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Rol</span>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as UserRole)}
                className={INPUT_CLASS}
              >
                <option value="admin">Admin</option>
                <option value="guest">Huésped</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Estado</span>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as UserStatus)}
                className={INPUT_CLASS}
              >
                <option value="activo">Activo</option>
                <option value="invitado">Invitado</option>
              </select>
            </label>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition-all duration-300 ease-in-out hover:text-neutral-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:bg-neutral-700 active:scale-95"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersTable({ users: initialUsers }: { users: MockUser[] }) {
  const [users, setUsers] = useState<MockUser[]>(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);

  function handleEditClick(user: MockUser) {
    setSelectedUser(user);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedUser(null);
  }

  async function handleSaveUser(updatedUser: MockUser) {
    /*
     * TODO: Integración con Supabase - Reemplazar la actualización del estado local
     * por una llamada a la API o mutación de base de datos aquí.
     */
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    handleCloseModal();
  }

  return (
    <>
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
                    onClick={() => handleEditClick(user)}
                    className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition-all duration-300 ease-in-out hover:border-neutral-900 hover:text-neutral-900 active:scale-95"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedUser && (
        <EditUserModal user={selectedUser} onClose={handleCloseModal} onSave={handleSaveUser} />
      )}
    </>
  );
}
