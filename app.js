const API_STATE_URL = "/api/state";
const LOCAL_STORAGE_KEY = "fabric-price-book-state-v1";
const APP_CONFIG = window.APP_CONFIG || {};
const BACKEND_MODE = APP_CONFIG.backend || "supabase";

const TEXT = {
  formCreate: "\uC6D0\uB2E8 \uC815\uBCF4 \uC785\uB825",
  formEdit: "\uC6D0\uB2E8 \uC815\uBCF4 \uC218\uC815",
  saveCreate: "\uB4F1\uB85D",
  saveEdit: "\uC218\uC815 \uC800\uC7A5",
  totalSupplier: "\uC804\uCCB4 \uACF5\uAE09\uC5C5\uCCB4",
  count: "\uAC74",
  selectedItem: "\uC120\uD0DD \uD56D\uBAA9",
  deleteConfirmSuffix: "\uC744 \uC0AD\uC81C\uD560\uAE4C\uC694?",
  supplier: "\uACF5\uAE09\uC5C5\uCCB4",
  fabricCompany: "\uC6D0\uB2E8\uC5C5\uCCB4",
  widthMm: "\uC804\uD3ED(mm)",
  lengthM: "\uBBF8\uD130(M)",
  fabricName: "\uC6D0\uB2E8\uBA85",
  sqUnitPrice: "1SQ \uB2E8\uAC00",
  unitPrice: "\uACC4\uC0B0\uB2E8\uAC00",
  thickness: "\uB450\uAED8",
  color: "\uC0C9\uC0C1",
  adhesion: "\uC810\uCC29\uB825",
  releaseForce: "\uC774\uD615\uB825(g)",
  detail: "\uC0C1\uC138\uC815\uBCF4",
  note: "\uBE44\uACE0",
  manage: "\uAD00\uB9AC",
  edit: "\uC218\uC815",
  delete: "\uC0AD\uC81C",
  history: "\uC774\uB825",
  close: "\uB2EB\uAE30",
  noHistory: "\uC218\uC815\uC774\uB825\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
  historyTitle: "\uC218\uC815\uC774\uB825",
  changedAt: "\uC218\uC815\uC77C\uC2DC",
  before: "\uBCC0\uACBD \uC804",
  after: "\uBCC0\uACBD \uD6C4",
  csvFilename: "\uC6D0\uB2E8_\uADDC\uACA9_\uAC00\uACA9\uD45C"
};

const EDITABLE_FIELDS = [
  ["supplier", TEXT.supplier],
  ["fabricCompany", TEXT.fabricCompany],
  ["widthMm", TEXT.widthMm],
  ["lengthM", TEXT.lengthM],
  ["fabricName", TEXT.fabricName],
  ["sqUnitPrice", TEXT.sqUnitPrice],
  ["thickness", TEXT.thickness],
  ["color", TEXT.color],
  ["adhesion", TEXT.adhesion],
  ["releaseForce", TEXT.releaseForce],
  ["note", TEXT.note]
];

const state = {
  fabrics: []
};

let editingId = "";
let backendAvailable = true;

const fabricForm = document.getElementById("fabricForm");
const fabricIdInput = document.getElementById("fabricId");
const supplierInput = document.getElementById("supplier");
const fabricCompanyInput = document.getElementById("fabricCompany");
const widthMmInput = document.getElementById("widthMm");
const lengthMInput = document.getElementById("lengthM");
const fabricNameInput = document.getElementById("fabricName");
const sqUnitPriceInput = document.getElementById("sqUnitPrice");
const unitPriceInput = document.getElementById("unitPrice");
const thicknessInput = document.getElementById("thickness");
const colorInput = document.getElementById("color");
const adhesionInput = document.getElementById("adhesion");
const releaseForceInput = document.getElementById("releaseForce");
const noteInput = document.getElementById("note");
const fabricTableBody = document.getElementById("fabricTableBody");
const searchInput = document.getElementById("searchInput");
const supplierFilter = document.getElementById("supplierFilter");
const itemCount = document.getElementById("itemCount");
const emptyState = document.getElementById("emptyState");
const formTitle = document.getElementById("formTitle");
const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const printBtn = document.getElementById("printBtn");
const historyModal = document.getElementById("historyModal");
const historyModalTitle = document.getElementById("historyModalTitle");
const historyModalBody = document.getElementById("historyModalBody");
const historyCloseBtn = document.getElementById("historyCloseBtn");

bindEvents();
initializeApp();

function bindEvents() {
  fabricForm.addEventListener("submit", handleSubmit);
  [widthMmInput, lengthMInput, sqUnitPriceInput].forEach((input) => {
    input.addEventListener("input", updateCalculatedUnitPrice);
  });
  searchInput.addEventListener("input", render);
  supplierFilter.addEventListener("change", render);
  cancelEditBtn.addEventListener("click", resetForm);
  exportCsvBtn.addEventListener("click", exportCsv);
  printBtn.addEventListener("click", () => window.print());
  historyCloseBtn.addEventListener("click", closeHistoryModal);
  historyModal.addEventListener("click", (event) => {
    if (event.target === historyModal) closeHistoryModal();
  });

  fabricTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const item = state.fabrics.find((fabric) => fabric.id === button.dataset.id);
    if (!item) return;

    if (button.dataset.action === "edit") {
      startEdit(item);
      return;
    }

    if (button.dataset.action === "delete") {
      deleteItem(item.id);
      return;
    }

    if (button.dataset.action === "history") {
      openHistoryModal(item);
    }
  });
}

async function initializeApp() {
  await loadState();
  render();
}

async function loadState() {
  try {
    const nextState = isSupabaseBackend() ? await fetchSupabaseState() : await fetchApiState();
    state.fabrics = Array.isArray(nextState.fabrics) ? nextState.fabrics.map(normalizeFabricItem) : [];
  } catch {
    backendAvailable = false;
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const nextState = JSON.parse(saved);
        state.fabrics = Array.isArray(nextState.fabrics) ? nextState.fabrics.map(normalizeFabricItem) : [];
      } catch {
        state.fabrics = [];
      }
    }
  }
}

async function persist() {
  const payload = { fabrics: state.fabrics };

  if (backendAvailable) {
    try {
      if (isSupabaseBackend()) {
        await saveSupabaseState(payload);
      } else {
        await saveApiState(payload);
      }
      return;
    } catch {
      backendAvailable = false;
    }
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
}

async function handleSubmit(event) {
  event.preventDefault();
  const now = new Date().toISOString();

  const nextFields = {
    id: editingId || crypto.randomUUID(),
    supplier: supplierInput.value.trim(),
    fabricCompany: fabricCompanyInput.value.trim(),
    widthMm: widthMmInput.value.trim(),
    lengthM: lengthMInput.value.trim(),
    fabricName: fabricNameInput.value.trim(),
    sqUnitPrice: sqUnitPriceInput.value.trim(),
    unitPrice: calculateUnitPrice(widthMmInput.value, lengthMInput.value, sqUnitPriceInput.value),
    thickness: thicknessInput.value.trim(),
    color: colorInput.value.trim(),
    adhesion: adhesionInput.value.trim(),
    releaseForce: releaseForceInput.value.trim(),
    note: noteInput.value.trim()
  };

  if (editingId) {
    const previousItem = state.fabrics.find((fabric) => fabric.id === editingId);
    const changes = getFieldChanges(previousItem, nextFields);
    const editHistory = Array.isArray(previousItem?.editHistory) ? [...previousItem.editHistory] : [];

    if (changes.length) {
      editHistory.unshift({
        id: crypto.randomUUID(),
        editedAt: now,
        before: pickEditableFields(previousItem),
        after: pickEditableFields(nextFields),
        changes
      });
    }

    const item = {
      ...previousItem,
      ...nextFields,
      createdAt: previousItem?.createdAt || now,
      updatedAt: now,
      editHistory
    };
    state.fabrics = state.fabrics.map((fabric) => (fabric.id === editingId ? item : fabric));
  } else {
    const item = {
      ...nextFields,
      createdAt: now,
      updatedAt: now,
      editHistory: []
    };
    state.fabrics.unshift(item);
  }

  await persist();
  resetForm();
  render();
}

function startEdit(item) {
  editingId = item.id;
  fabricIdInput.value = item.id;
  supplierInput.value = item.supplier || "";
  fabricCompanyInput.value = item.fabricCompany || "";
  widthMmInput.value = item.widthMm || item.spec || "";
  lengthMInput.value = item.lengthM || "";
  fabricNameInput.value = item.fabricName || "";
  sqUnitPriceInput.value = item.sqUnitPrice || item.unitPrice || "";
  unitPriceInput.value = calculateUnitPrice(widthMmInput.value, lengthMInput.value, sqUnitPriceInput.value) || item.unitPrice || "";
  thicknessInput.value = item.thickness || "";
  colorInput.value = item.color || "";
  adhesionInput.value = item.adhesion || "";
  releaseForceInput.value = item.releaseForce || "";
  noteInput.value = item.note || "";
  formTitle.textContent = TEXT.formEdit;
  saveBtn.textContent = TEXT.saveEdit;
  cancelEditBtn.hidden = false;
  supplierInput.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteItem(id) {
  const item = state.fabrics.find((fabric) => fabric.id === id);
  const label = item ? `${item.supplier} / ${item.fabricName}` : TEXT.selectedItem;
  if (!confirm(`${label}${TEXT.deleteConfirmSuffix}`)) return;

  state.fabrics = state.fabrics.filter((fabric) => fabric.id !== id);
  if (editingId === id) resetForm();
  await persist();
  render();
}

function resetForm() {
  editingId = "";
  fabricForm.reset();
  fabricIdInput.value = "";
  formTitle.textContent = TEXT.formCreate;
  saveBtn.textContent = TEXT.saveCreate;
  cancelEditBtn.hidden = true;
}

function normalizeFabricItem(item) {
  return {
    ...item,
    fabricCompany: item.fabricCompany || "",
    widthMm: item.widthMm || item.spec || "",
    lengthM: item.lengthM || "",
    sqUnitPrice: item.sqUnitPrice || item.unitPrice || "",
    unitPrice: calculateUnitPrice(item.widthMm || item.spec || "", item.lengthM || "", item.sqUnitPrice || item.unitPrice || "") || item.unitPrice || "",
    thickness: item.thickness || "",
    color: item.color || "",
    adhesion: item.adhesion || "",
    releaseForce: item.releaseForce || "",
    editHistory: Array.isArray(item.editHistory) ? item.editHistory : []
  };
}

function render() {
  renderSupplierFilter();

  const rows = getFilteredFabrics();
  fabricTableBody.innerHTML = rows.map(renderRow).join("");
  itemCount.textContent = `${rows.length}${TEXT.count}`;
  emptyState.hidden = rows.length > 0;
}

function renderSupplierFilter() {
  const currentValue = supplierFilter.value;
  const suppliers = [...new Set(state.fabrics.map((item) => item.supplier).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ko")
  );

  supplierFilter.innerHTML = [
    `<option value="">${TEXT.totalSupplier}</option>`,
    ...suppliers.map((supplier) => `<option value="${escapeAttr(supplier)}">${escapeHtml(supplier)}</option>`)
  ].join("");

  supplierFilter.value = suppliers.includes(currentValue) ? currentValue : "";
}

function getFilteredFabrics() {
  const keyword = searchInput.value.trim().toLowerCase();
  const supplier = supplierFilter.value;

  return state.fabrics.filter((item) => {
    const matchesSupplier = !supplier || item.supplier === supplier;
    const haystack = [
      item.supplier,
      item.fabricCompany,
      item.widthMm,
      item.lengthM,
      item.spec,
      item.fabricName,
      item.sqUnitPrice,
      item.unitPrice,
      item.thickness,
      item.color,
      item.adhesion,
      item.releaseForce,
      item.note
    ]
      .join(" ")
      .toLowerCase();
    const matchesKeyword = !keyword || haystack.includes(keyword);
    return matchesSupplier && matchesKeyword;
  });
}

function renderRow(item) {
  const historyCount = Array.isArray(item.editHistory) ? item.editHistory.length : 0;
  return `
    <tr>
      <td data-label="${TEXT.supplier}">${escapeHtml(item.supplier)}</td>
      <td data-label="${TEXT.widthMm}">${escapeHtml(item.widthMm || item.spec)}</td>
      <td data-label="${TEXT.lengthM}">${escapeHtml(item.lengthM)}</td>
      <td data-label="${TEXT.fabricName}">${escapeHtml(item.fabricName)}</td>
      <td data-label="${TEXT.sqUnitPrice}" class="price-cell">${escapeHtml(item.sqUnitPrice || item.unitPrice)}</td>
      <td data-label="${TEXT.unitPrice}" class="price-cell">${escapeHtml(item.unitPrice)}</td>
      <td data-label="${TEXT.detail}" class="detail-cell">${renderDetailCell(item)}</td>
      <td data-label="${TEXT.note}" class="note-cell">${escapeHtml(item.note || "-")}</td>
      <td data-label="${TEXT.manage}">
        <div class="row-actions">
          <button type="button" class="icon-btn" data-action="edit" data-id="${escapeAttr(item.id)}">${TEXT.edit}</button>
          <button type="button" class="history-btn" data-action="history" data-id="${escapeAttr(item.id)}">${TEXT.history} ${historyCount}</button>
          <button type="button" class="danger-btn" data-action="delete" data-id="${escapeAttr(item.id)}">${TEXT.delete}</button>
        </div>
      </td>
    </tr>
  `;
}

function renderDetailCell(item) {
  const details = [
    [TEXT.fabricCompany, item.fabricCompany],
    [TEXT.thickness, item.thickness],
    [TEXT.color, item.color],
    [TEXT.adhesion, item.adhesion],
    [TEXT.releaseForce, item.releaseForce]
  ].filter(([, value]) => value);

  if (!details.length) return "-";
  return details
    .map(([label, value]) => `<span><b>${escapeHtml(label)}</b> ${escapeHtml(value)}</span>`)
    .join("");
}

function getFieldChanges(previousItem, nextItem) {
  return EDITABLE_FIELDS.reduce((changes, [key, label]) => {
    const beforeValue = String(previousItem?.[key] || "");
    const afterValue = String(nextItem?.[key] || "");
    if (beforeValue !== afterValue) {
      changes.push({
        field: key,
        label,
        before: beforeValue,
        after: afterValue
      });
    }
    return changes;
  }, []);
}

function pickEditableFields(item) {
  return EDITABLE_FIELDS.reduce((picked, [key]) => {
    picked[key] = String(item?.[key] || "");
    return picked;
  }, {});
}

function openHistoryModal(item) {
  const history = Array.isArray(item.editHistory) ? item.editHistory : [];
  historyModalTitle.textContent = `${TEXT.historyTitle} - ${item.fabricName || item.supplier || TEXT.selectedItem}`;

  if (!history.length) {
    historyModalBody.innerHTML = `<div class="empty-state">${TEXT.noHistory}</div>`;
  } else {
    historyModalBody.innerHTML = history.map(renderHistoryItem).join("");
  }

  historyModal.hidden = false;
}

function closeHistoryModal() {
  historyModal.hidden = true;
}

function renderHistoryItem(entry) {
  const changes = Array.isArray(entry.changes) ? entry.changes : [];
  return `
    <article class="history-entry">
      <strong>${TEXT.changedAt}: ${escapeHtml(formatDateTime(entry.editedAt))}</strong>
      <div class="history-change-list">
        ${changes.map(renderHistoryChange).join("")}
      </div>
    </article>
  `;
}

function renderHistoryChange(change) {
  return `
    <div class="history-change">
      <span class="history-field">${escapeHtml(change.label || change.field || "")}</span>
      <div><b>${TEXT.before}</b><p>${escapeHtml(change.before || "-")}</p></div>
      <div><b>${TEXT.after}</b><p>${escapeHtml(change.after || "-")}</p></div>
    </div>
  `;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function updateCalculatedUnitPrice() {
  unitPriceInput.value = calculateUnitPrice(widthMmInput.value, lengthMInput.value, sqUnitPriceInput.value);
}

function calculateUnitPrice(widthMm, lengthM, sqUnitPrice) {
  const width = parseNumber(widthMm);
  const length = parseNumber(lengthM);
  const price = parseNumber(sqUnitPrice);
  if (!width || !length || !price) return "";
  const total = (width / 1000) * length * price;
  return formatNumber(total);
}

function parseNumber(value) {
  const normalized = String(value || "").replace(/,/g, "").replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value) {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString("ko-KR", {
    maximumFractionDigits: Number.isInteger(rounded) ? 0 : 2
  });
}

function exportCsv() {
  const rows = getFilteredFabrics();
  const csvRows = [
    [
      TEXT.supplier,
      TEXT.fabricCompany,
      TEXT.widthMm,
      TEXT.lengthM,
      TEXT.fabricName,
      TEXT.sqUnitPrice,
      TEXT.unitPrice,
      TEXT.thickness,
      TEXT.color,
      TEXT.adhesion,
      TEXT.releaseForce,
      TEXT.note
    ],
    ...rows.map((item) => [
      item.supplier,
      item.fabricCompany,
      item.widthMm || item.spec,
      item.lengthM,
      item.fabricName,
      item.sqUnitPrice || item.unitPrice,
      item.unitPrice,
      item.thickness,
      item.color,
      item.adhesion,
      item.releaseForce,
      item.note
    ])
  ];
  const csv = csvRows.map((row) => row.map(toCsvCell).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${TEXT.csvFilename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function toCsvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

function isSupabaseBackend() {
  return BACKEND_MODE === "supabase";
}

function hasSupabaseConfig() {
  return Boolean(APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseAnonKey);
}

async function fetchApiState() {
  const response = await fetch(API_STATE_URL);
  if (!response.ok) throw new Error("API unavailable");
  return response.json();
}

async function saveApiState(payload) {
  const response = await fetch(API_STATE_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Save failed");
}

function getSupabaseStateUrl() {
  const baseUrl = String(APP_CONFIG.supabaseUrl || "").replace(/\/$/, "");
  const table = APP_CONFIG.supabaseTable || "app_state";
  const rowId = encodeURIComponent(APP_CONFIG.supabaseRowId || "fabric_price_book");
  return `${baseUrl}/rest/v1/${table}?id=eq.${rowId}&select=payload`;
}

function getSupabaseTableUrl() {
  const baseUrl = String(APP_CONFIG.supabaseUrl || "").replace(/\/$/, "");
  const table = APP_CONFIG.supabaseTable || "app_state";
  return `${baseUrl}/rest/v1/${table}`;
}

function getSupabaseHeaders(extra = {}) {
  return {
    apikey: APP_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${APP_CONFIG.supabaseAnonKey}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function fetchSupabaseState() {
  if (!hasSupabaseConfig()) {
    throw new Error("missing supabase config");
  }

  const response = await fetch(getSupabaseStateUrl(), {
    headers: getSupabaseHeaders(),
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error("supabase state fetch failed");
  }

  const rows = await response.json();
  if (!rows.length || !rows[0].payload) {
    return { fabrics: [] };
  }
  return rows[0].payload;
}

async function saveSupabaseState(nextState) {
  if (!hasSupabaseConfig()) {
    throw new Error("missing supabase config");
  }

  const response = await fetch(getSupabaseTableUrl(), {
    method: "POST",
    headers: getSupabaseHeaders({
      Prefer: "resolution=merge-duplicates,return=representation"
    }),
    body: JSON.stringify([
      {
        id: APP_CONFIG.supabaseRowId || "fabric_price_book",
        payload: nextState
      }
    ])
  });
  if (!response.ok) {
    throw new Error("supabase save failed");
  }
  return response.json();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
