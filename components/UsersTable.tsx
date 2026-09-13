"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import type { ProfileStatus, RoleType, Usuario } from "@/lib/api/types";
import { createUser, deleteUser, updateUser } from "@/app/p/casa-brava/owner-panel/actions";

const ROLE_LABELS: Record<RoleType, string> = {
  admin: "Admin",
  holder: "Propietario",
  guest: "Huésped",
};

const ROLE_BADGE_CLASSES: Record<RoleType, string> = {
  admin: "bg-neutral-900 text-white",
  holder: "bg-blue-100 text-blue-700",
  guest: "bg-neutral-100 text-neutral-700",
};

function RoleBadge({ role }: { role: RoleType }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE_CLASSES[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusBadge({ status }: { status: ProfileStatus }) {
  const isActivo = status === "activo";
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

const PRIMARY_BUTTON_CLASS =
  "rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out enabled:hover:bg-neutral-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60";

const SECONDARY_BUTTON_CLASS =
  "rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition-all duration-300 ease-in-out hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60";

const DANGER_BUTTON_CLASS =
  "rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out enabled:hover:bg-red-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60";

// Cierra con Escape, igual que cualquier modal accesible — listener nativo en un
// useEffect (no un derivado de estado), mismo patrón que los listeners globales de Carousel.tsx.
function useCloseOnEscape(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}

function EditUserModal({
  user,
  isSelf,
  onClose,
  onSave,
  isPending,
}: {
  user: Usuario;
  isSelf: boolean;
  onClose: () => void;
  onSave: (updates: { role: RoleType; status: ProfileStatus }) => void;
  isPending: boolean;
}) {
  const [role, setRole] = useState<RoleType>(user.role);
  const [status, setStatus] = useState<ProfileStatus>(user.status);

  useCloseOnEscape(onClose);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isSelf) return;
    onSave({ role, status });
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
        <p className="mt-1 text-sm text-neutral-500">
          Actualiza el rol y estado de {user.nombre_completo}.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Correo</span>
            <span className="text-neutral-500">{user.email}</span>
          </div>

          {isSelf && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              No puedes modificar tu propio rol o estado.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Rol</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as RoleType)}
                disabled={isSelf}
                className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="guest">Huésped</option>
                <option value="holder">Propietario</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Estado</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProfileStatus)}
                disabled={isSelf}
                className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="activo">Activo</option>
                <option value="invitado">Invitado</option>
              </select>
            </label>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isPending} className={SECONDARY_BUTTON_CLASS}>
              Cancelar
            </button>
            <button type="submit" disabled={isPending || isSelf} className={PRIMARY_BUTTON_CLASS}>
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type CreateUserFormData = {
  email: string;
  firstName: string;
  lastName1: string;
  lastName2: string;
  role: RoleType;
};

function CreateUserModal({
  onClose,
  onCreate,
  isPending,
}: {
  onClose: () => void;
  onCreate: (data: CreateUserFormData) => void;
  isPending: boolean;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName1, setLastName1] = useState("");
  const [lastName2, setLastName2] = useState("");
  const [role, setRole] = useState<RoleType>("guest");

  useCloseOnEscape(onClose);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onCreate({ email, firstName, lastName1, lastName2, role });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm [animation:fade-in_200ms_ease-out]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl [animation:modal-in_200ms_ease-out]"
      >
        <h2 id="create-user-modal-title" className="text-lg font-semibold text-neutral-900">
          Crear usuario
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          La cuenta queda activa de inmediato con la contraseña temporal{" "}
          <span className="font-medium text-neutral-700">changeme123</span>. Comparte esa
          contraseña con la persona para que inicie sesión.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">Nombre(s)</span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Apellido paterno</span>
              <input
                type="text"
                value={lastName1}
                onChange={(e) => setLastName1(e.target.value)}
                required
                className={INPUT_CLASS}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Apellido materno</span>
              <input
                type="text"
                value={lastName2}
                onChange={(e) => setLastName2(e.target.value)}
                className={INPUT_CLASS}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">Rol</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleType)}
              className={INPUT_CLASS}
            >
              <option value="guest">Huésped</option>
              <option value="holder">Propietario</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isPending} className={SECONDARY_BUTTON_CLASS}>
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className={PRIMARY_BUTTON_CLASS}>
              Crear usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteUserModal({
  user,
  onClose,
  onConfirm,
  isPending,
}: {
  user: Usuario;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  useCloseOnEscape(onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm [animation:fade-in_200ms_ease-out]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-user-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl [animation:modal-in_200ms_ease-out]"
      >
        <h2 id="delete-user-modal-title" className="text-lg font-semibold text-neutral-900">
          Eliminar usuario
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          ¿Seguro que quieres eliminar a{" "}
          <span className="font-medium text-neutral-900">{user.nombre_completo}</span>? Se
          borrará su cuenta de acceso y su perfil. Esta acción no se puede deshacer.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isPending} className={SECONDARY_BUTTON_CLASS}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={isPending} className={DANGER_BUTTON_CLASS}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersTable({
  users,
  currentUserId,
}: {
  users: Usuario[];
  currentUserId: string;
}) {
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null);
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  function handleEditClick(user: Usuario) {
    setSelectedUser(user);
  }

  function handleCloseEditModal() {
    setSelectedUser(null);
  }

  function handleSaveUser(updates: { role: RoleType; status: ProfileStatus }) {
    if (!selectedUser) return;
    const userId = selectedUser.id;

    startUpdateTransition(async () => {
      const result = await updateUser(userId, updates);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      handleCloseEditModal();
      toast.success("Usuario actualizado correctamente.");
    });
  }

  function handleOpenCreateModal() {
    setIsCreateModalOpen(true);
  }

  function handleCloseCreateModal() {
    setIsCreateModalOpen(false);
  }

  function handleCreateUser(formData: CreateUserFormData) {
    startCreateTransition(async () => {
      const result = await createUser(
        formData.email,
        formData.firstName,
        formData.lastName1,
        formData.lastName2,
        formData.role
      );
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      handleCloseCreateModal();
      toast.success("Usuario creado correctamente.");
    });
  }

  function handleDeleteClick(user: Usuario) {
    setUserToDelete(user);
  }

  function handleCloseDeleteModal() {
    setUserToDelete(null);
  }

  function handleConfirmDelete() {
    if (!userToDelete) return;
    const userId = userToDelete.id;

    startDeleteTransition(async () => {
      const result = await deleteUser(userId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      handleCloseDeleteModal();
      toast.success("Usuario eliminado correctamente.");
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:bg-neutral-700 active:scale-95"
        >
          Crear usuario
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
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
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-neutral-500">
                  Todavía no hay usuarios registrados.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr key={user.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {user.nombre_completo}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditClick(user)}
                          className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition-all duration-300 ease-in-out hover:border-neutral-900 hover:text-neutral-900 active:scale-95"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(user)}
                          disabled={isSelf}
                          title={isSelf ? "No puedes eliminar tu propia cuenta" : undefined}
                          className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition-all duration-300 ease-in-out enabled:hover:border-red-600 enabled:hover:bg-red-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <EditUserModal
          user={selectedUser}
          isSelf={selectedUser.id === currentUserId}
          onClose={handleCloseEditModal}
          onSave={handleSaveUser}
          isPending={isUpdatePending}
        />
      )}

      {isCreateModalOpen && (
        <CreateUserModal
          onClose={handleCloseCreateModal}
          onCreate={handleCreateUser}
          isPending={isCreatePending}
        />
      )}

      {userToDelete && (
        <DeleteUserModal
          user={userToDelete}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          isPending={isDeletePending}
        />
      )}
    </>
  );
}
