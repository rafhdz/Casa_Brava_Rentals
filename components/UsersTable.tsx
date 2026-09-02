"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import type { Profile } from "@/lib/AuthContext";
import { createUser, deleteUser, updateUser } from "@/app/admin/actions";

function formatFullName(profile: Profile): string {
  return [profile.first_name, profile.apellido_paterno, profile.apellido_materno]
    .filter(Boolean)
    .join(" ");
}

const ROLE_LABELS: Record<Profile["role"], string> = {
  admin: "Admin",
  holder: "Propietario",
  guest: "Huésped",
};

const ROLE_BADGE_CLASSES: Record<Profile["role"], string> = {
  admin: "bg-neutral-900 text-white",
  holder: "bg-blue-100 text-blue-700",
  guest: "bg-neutral-100 text-neutral-700",
};

function RoleBadge({ role }: { role: Profile["role"] }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE_CLASSES[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusBadge({ status }: { status: Profile["status"] }) {
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
  onClose,
  onSave,
  isPending,
  error,
}: {
  user: Profile;
  onClose: () => void;
  onSave: (updates: { role: Profile["role"]; status: Profile["status"] }) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [role, setRole] = useState<Profile["role"]>(user.role);
  const [status, setStatus] = useState<Profile["status"]>(user.status);

  useCloseOnEscape(onClose);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
          Actualiza el rol y estado de {formatFullName(user)}.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Correo</span>
            <span className="text-neutral-500">{user.email}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Rol</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Profile["role"])}
                className={INPUT_CLASS}
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
                onChange={(e) => setStatus(e.target.value as Profile["status"])}
                className={INPUT_CLASS}
              >
                <option value="activo">Activo</option>
                <option value="invitado">Invitado</option>
              </select>
            </label>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isPending} className={SECONDARY_BUTTON_CLASS}>
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className={PRIMARY_BUTTON_CLASS}>
              {isPending ? "Guardando…" : "Guardar cambios"}
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
  role: Profile["role"];
};

function CreateUserModal({
  onClose,
  onCreate,
  isPending,
  error,
}: {
  onClose: () => void;
  onCreate: (data: CreateUserFormData) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName1, setLastName1] = useState("");
  const [lastName2, setLastName2] = useState("");
  const [role, setRole] = useState<Profile["role"]>("guest");

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
              onChange={(e) => setRole(e.target.value as Profile["role"])}
              className={INPUT_CLASS}
            >
              <option value="guest">Huésped</option>
              <option value="holder">Propietario</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isPending} className={SECONDARY_BUTTON_CLASS}>
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className={PRIMARY_BUTTON_CLASS}>
              {isPending ? "Creando…" : "Crear usuario"}
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
  error,
}: {
  user: Profile;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  error: string | null;
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
          <span className="font-medium text-neutral-900">{formatFullName(user)}</span>? Se
          borrará su cuenta de acceso y su perfil. Esta acción no se puede deshacer.
        </p>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isPending} className={SECONDARY_BUTTON_CLASS}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={isPending} className={DANGER_BUTTON_CLASS}>
            {isPending ? "Eliminando…" : "Eliminar"}
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
  users: Profile[];
  currentUserId: string;
}) {
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  function handleEditClick(user: Profile) {
    setEditError(null);
    setSelectedUser(user);
  }

  function handleCloseEditModal() {
    setSelectedUser(null);
    setEditError(null);
  }

  function handleSaveUser(updates: { role: Profile["role"]; status: Profile["status"] }) {
    if (!selectedUser) return;
    const userId = selectedUser.id;

    startUpdateTransition(async () => {
      const result = await updateUser(userId, updates);
      if ("error" in result) {
        setEditError(result.error);
        return;
      }
      handleCloseEditModal();
    });
  }

  function handleOpenCreateModal() {
    setCreateError(null);
    setIsCreateModalOpen(true);
  }

  function handleCloseCreateModal() {
    setIsCreateModalOpen(false);
    setCreateError(null);
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
        setCreateError(result.error);
        return;
      }
      handleCloseCreateModal();
    });
  }

  function handleDeleteClick(user: Profile) {
    setDeleteError(null);
    setUserToDelete(user);
  }

  function handleCloseDeleteModal() {
    setUserToDelete(null);
    setDeleteError(null);
  }

  function handleConfirmDelete() {
    if (!userToDelete) return;
    const userId = userToDelete.id;

    startDeleteTransition(async () => {
      const result = await deleteUser(userId);
      if ("error" in result) {
        setDeleteError(result.error);
        return;
      }
      handleCloseDeleteModal();
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
                      {formatFullName(user)}
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
          onClose={handleCloseEditModal}
          onSave={handleSaveUser}
          isPending={isUpdatePending}
          error={editError}
        />
      )}

      {isCreateModalOpen && (
        <CreateUserModal
          onClose={handleCloseCreateModal}
          onCreate={handleCreateUser}
          isPending={isCreatePending}
          error={createError}
        />
      )}

      {userToDelete && (
        <DeleteUserModal
          user={userToDelete}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          isPending={isDeletePending}
          error={deleteError}
        />
      )}
    </>
  );
}
