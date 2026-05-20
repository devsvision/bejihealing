import { qs } from "./core.js";
import { toast } from "./helper.js";
import { canCreateSuperAdmin, isSuperAdmin, loadUsers, saveUsers } from "./access.js";

const ROLE_ACCESS = {
  "Super Admin": { dashboard: "Admin Dashboard", permission: "super-admin", permissions: ["super-admin"] },
  Admin: { dashboard: "Admin Dashboard", permission: "admin", permissions: ["admin"] },
  Finance: { dashboard: "Admin Dashboard", permission: "finance", permissions: ["finance"] },
  Staff: { dashboard: "Front Office Dashboard", permission: "front-office", permissions: ["front-office"] },
  "Front Office": { dashboard: "Front Office Dashboard", permission: "front-office", permissions: ["front-office"] },
  Healer: { dashboard: "Healer Dashboard", permission: "healer", permissions: ["healer"] },
  "Content Manager": { dashboard: "Admin Dashboard", permission: "content", permissions: ["content"] }
};

export function initUsersPage() {
  const root = qs("[data-users-page]");
  if (!root) return;
  applyUserSectionVisibility(root);
  const users = loadUsers();
  bindUserListActions(root, users);
  renderUsers(root, users);
}

function applyUserSectionVisibility(root) {
  const activeLink = qs('[data-route="users"][data-section].is-active');
  const activeSection = activeLink?.dataset.section || "user-list";
  root.querySelectorAll("[data-user-section]").forEach((section) => {
    section.hidden = section.dataset.userSection !== activeSection;
  });
}

function bindUserListActions(root, users) {
  qs("[data-user-add]", root)?.addEventListener("click", () => openUserFormModal(root, users));
  const rows = qs("#user-rows", root);
  if (!rows || rows.dataset.bound) return;
  rows.dataset.bound = "true";
  rows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-user-action]");
    if (!button) return;
    const user = users.find((item) => item.id === button.dataset.userId);
    if (!user) return;
    if (button.dataset.userAction === "view") openUserDetail(user);
    if (button.dataset.userAction === "edit") openUserFormModal(root, users, user);
    if (button.dataset.userAction === "delete") deleteUser(root, users, user);
  });
}

function renderUsers(root, users) {
  const rows = qs("#user-rows", root);
  const total = qs("#user-total-label", root);
  const visibleUsers = isSuperAdmin() ? users : users.filter((user) => user.role !== "Super Admin");
  if (total) total.textContent = `${visibleUsers.length} user`;
  if (!rows) return;
  rows.innerHTML = visibleUsers.map((user) => `
    <tr>
      <td>${userPhotoMarkup(user)}</td>
      <td><p class="font-semibold text-white">${user.name}</p><p class="text-xs text-white/45">${user.id}</p></td>
      <td>${user.email}</td>
      <td>${user.phone}</td>
      <td>${user.role}</td>
      <td>${user.dashboard}</td>
      <td>${user.permission}</td>
      <td><span class="status-pill ${user.status === "active" ? "status-confirmed" : "status-pending"}">${user.status}</span></td>
      <td>
        <div class="flex flex-wrap gap-2">
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-user-action="view" data-user-id="${user.id}" title="Lihat"><i data-lucide="eye" class="size-4"></i></button>
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-user-action="edit" data-user-id="${user.id}" title="Edit"><i data-lucide="pencil" class="size-4"></i></button>
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-user-action="delete" data-user-id="${user.id}" title="Hapus"><i data-lucide="trash-2" class="size-4"></i></button>
        </div>
      </td>
    </tr>`).join("");
  window.lucide?.createIcons();
}

function openUserFormModal(root, users, user = null) {
  const modal = qs("#modal-root");
  if (!modal) return;
  modal.innerHTML = `
    <section class="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" data-user-form-close>
      <form class="glass-card luxury-border max-h-[92vh] w-full max-w-6xl overflow-y-auto p-6" id="user-form" data-user-form-modal data-editing-id="${user?.id || ""}">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="eyebrow">Input User</p>
            <h2 class="font-display text-3xl mt-2">${user ? "Edit User Login" : "Tambah User Login"}</h2>
          </div>
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-user-form-close aria-label="Tutup"><i data-lucide="x" class="size-4"></i></button>
        </div>
        <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label class="xl:row-span-3">Foto Profile
            <input class="sr-only" type="file" accept="image/*" name="photoFile" data-user-photo-input />
            <input type="hidden" name="photo" value="${user?.photo || ""}" data-user-photo-store />
            <button class="mt-2 grid h-40 w-40 place-items-center overflow-hidden rounded-2xl border border-dashed border-gold/45 bg-white/[.025] text-gold" type="button" data-user-photo-button>
              ${user?.photo ? `<img class="h-full w-full object-cover" src="${user.photo}" alt="${user.name}" />` : `<span class="text-3xl">+</span>`}
            </button>
          </label>
          ${inputField("name", "Nama Lengkap", "Nama user", user?.name || "")}
          ${inputField("email", "Email Login", "user@bejihealing.com", user?.email || "", "email")}
          ${inputField("phone", "No HP", "+62...", user?.phone || "", "tel")}
          <label>Role
            <select class="glass-input mt-2" name="role" required>
              ${roleOptions(user?.role)}
            </select>
          </label>
          <label>Akses Dashboard
            <select class="glass-input mt-2 opacity-70" name="dashboard" required>
              <option value="Admin Dashboard">Admin Dashboard</option>
              <option value="Front Office Dashboard">Front Office Dashboard</option>
              <option value="Healer Dashboard">Healer Dashboard</option>
            </select>
          </label>
          <label>Status
            <select class="glass-input mt-2" name="status" required>
              <option value="active" ${user?.status !== "inactive" ? "selected" : ""}>Aktif</option>
              <option value="inactive" ${user?.status === "inactive" ? "selected" : ""}>Nonaktif</option>
            </select>
          </label>
          <label>Permission
            <select class="glass-input mt-2 opacity-70" name="permission" required>
              ${permissionOptions()}
            </select>
          </label>
          ${inputField("password", "Password", user ? "Kosongkan jika tidak diganti" : "Minimal 6 karakter", "", "password", user ? "" : "required")}
          ${inputField("confirmPassword", "Konfirmasi Password", user ? "Kosongkan jika tidak diganti" : "Ulangi password", "", "password", user ? "" : "required")}
          <label class="md:col-span-2">Catatan
            <textarea class="glass-input mt-2 min-h-[96px]" name="notes" placeholder="Catatan akses, jadwal kerja, atau area tanggung jawab">${user?.notes || ""}</textarea>
          </label>
        </div>
        <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-white/50">Saat backend siap, password wajib disimpan dengan hashing, bukan plain text.</p>
          <button class="luxury-button" type="submit">Simpan User</button>
        </div>
      </form>
    </section>`;
  window.lucide?.createIcons();
  const form = qs("#user-form", modal);
  bindModalPhotoInput(form);
  syncRoleAccess(form);
  form.elements.role.addEventListener("change", () => syncRoleAccess(form));
  form.addEventListener("submit", (event) => saveUser(event, root, users, form));
  modal.onclick = (event) => {
    if (event.target.closest("button[data-user-form-close]")) modal.innerHTML = "";
    if (event.target.closest("[data-user-form-close]") && !event.target.closest("[data-user-form-modal]")) modal.innerHTML = "";
  };
}

function saveUser(event, root, users, form) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(form).entries());
  if (payload.password !== payload.confirmPassword) {
    toast("Konfirmasi password belum sama.");
    return;
  }
  const existingUser = users.find((item) => item.id === form.dataset.editingId);
  const duplicateEmail = users.some((item) => item.id !== existingUser?.id && item.email.toLowerCase() === payload.email.toLowerCase());
  if (duplicateEmail) {
    toast("Email user sudah terdaftar.");
    return;
  }
  if (payload.role === "Super Admin" && !canCreateSuperAdmin()) {
    toast("Hanya Super Admin yang boleh membuat user Super Admin.");
    return;
  }
  const next = {
    id: existingUser?.id || nextUserId(users),
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    role: payload.role,
    dashboard: payload.dashboard,
    permission: payload.permission,
    status: payload.status,
    photo: payload.photo,
    notes: payload.notes,
    password: payload.password || existingUser?.password || "healing",
    passwordSet: true,
    createdAt: existingUser?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (existingUser) users.splice(users.findIndex((item) => item.id === existingUser.id), 1, next);
  else users.unshift(next);
  saveUsers(users);
  qs("#modal-root").innerHTML = "";
  renderUsers(root, users);
  toast(existingUser ? "User diperbarui." : "User login tersimpan.");
}

function bindModalPhotoInput(form) {
  const input = qs("[data-user-photo-input]", form);
  const button = qs("[data-user-photo-button]", form);
  const store = qs("[data-user-photo-store]", form);
  button.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      store.value = reader.result;
      button.innerHTML = `<img class="h-full w-full object-cover" src="${reader.result}" alt="Foto profile user" />`;
    };
    reader.readAsDataURL(file);
  });
}

function openUserDetail(user) {
  const modal = qs("#modal-root");
  if (!modal) return;
  modal.innerHTML = `
    <section class="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" data-user-close>
      <article class="glass-card luxury-border max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6" data-user-modal>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-center gap-4">${userPhotoMarkup(user)}<div><p class="eyebrow">Detail User</p><h2 class="font-display text-3xl mt-2">${user.name}</h2><p class="mt-2 text-white/55">${user.id} - ${user.role}</p></div></div>
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-user-close aria-label="Tutup"><i data-lucide="x" class="size-4"></i></button>
        </div>
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          ${detailBox("Kontak", `${user.email}<br>${user.phone}`)}
          ${detailBox("Akses", `${user.dashboard}<br>${user.permission}<br>${user.status}`)}
          ${detailBox("Role", user.role)}
          ${detailBox("Catatan", user.notes || "-")}
        </div>
      </article>
    </section>`;
  window.lucide?.createIcons();
  modal.onclick = (event) => {
    if (event.target.closest("button[data-user-close]")) modal.innerHTML = "";
    if (event.target.closest("[data-user-close]") && !event.target.closest("[data-user-modal]")) modal.innerHTML = "";
  };
}

function deleteUser(root, users, user) {
  if (user.role === "Super Admin" && !isSuperAdmin()) {
    toast("Super Admin tidak bisa dihapus oleh user ini.");
    return;
  }
  if (!confirm(`Hapus user ${user.name}?`)) return;
  const index = users.findIndex((item) => item.id === user.id);
  if (index >= 0) users.splice(index, 1);
  saveUsers(users);
  renderUsers(root, users);
  toast("User dihapus.");
}

function syncRoleAccess(scope) {
  const role = qs('[name="role"]', scope);
  const dashboard = qs('[name="dashboard"]', scope);
  const permission = qs('[name="permission"]', scope);
  if (!role || !dashboard || !permission) return;
  const rule = ROLE_ACCESS[role.value] || ROLE_ACCESS.Admin;
  dashboard.value = rule.dashboard;
  permission.value = rule.permission;
  [...dashboard.options].forEach((option) => {
    option.hidden = option.value !== rule.dashboard;
  });
  [...permission.options].forEach((option) => {
    option.hidden = !rule.permissions.includes(option.value);
  });
}

function roleOptions(selected = "Admin") {
  const roles = ["Admin", "Finance", "Staff", "Front Office", "Healer", "Content Manager"];
  if (canCreateSuperAdmin()) roles.unshift("Super Admin");
  return roles.map((role) => `<option value="${role}" ${selected === role ? "selected" : ""}>${role}</option>`).join("");
}

function permissionOptions() {
  const permissions = canCreateSuperAdmin() ? ["super-admin", "admin", "finance", "front-office", "healer", "content"] : ["admin", "finance", "front-office", "healer", "content"];
  return permissions.map((permission) => `<option value="${permission}">${permission}</option>`).join("");
}

function inputField(name, label, placeholder, value = "", type = "text", required = "required") {
  return `<label>${label}<input class="glass-input mt-2" type="${type}" name="${name}" placeholder="${placeholder}" value="${value}" ${required} /></label>`;
}

function userPhotoMarkup(user) {
  if (user.photo) return `<img class="h-14 w-14 rounded-xl object-cover" src="${user.photo}" alt="${user.name}" />`;
  return `<span class="grid h-14 w-14 place-items-center rounded-xl border border-white/10 bg-white/[.06] font-display text-lg text-gold">${user.name.slice(0, 1)}</span>`;
}

function detailBox(label, value) {
  return `<div class="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p class="text-xs uppercase tracking-[.18em] text-white/40">${label}</p><div class="mt-2 text-sm leading-7 text-white/85">${value}</div></div>`;
}

function nextUserId(users) {
  return `USR-${String(users.length + 1).padStart(4, "0")}`;
}
