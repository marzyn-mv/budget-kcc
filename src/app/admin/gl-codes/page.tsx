"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, X, Upload, Download, FileSpreadsheet } from "lucide-react";
import UploadProgress from "@/components/UploadProgress";

interface GlCode {
  id: number;
  gl_code: string;
  name_en: string;
  name_dv: string;
  details: string;
  section_id: number | null;
  section_name: string | null;
  created_at: string;
}

interface Section {
  id: number;
  name: string;
}

const emptyForm = { gl_code: "", name_en: "", name_dv: "", details: "", section_id: "" };

const CSV_TEMPLATE = `gl_code,name_en,name_dv,details
211001,Staff Salary,މުވައްޒަފުންގެ މުސާރަ,Monthly salary payments
211002,Staff Allowance,މުވައްޒަފުންގެ އެލަވަންސް,Staff allowances
222001,Office Supplies,އޮފީސް ސާމާނު,Office consumables and supplies`;

export default function GlCodesPage() {
  const [glCodes, setGlCodes] = useState<GlCode[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // bulk upload state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // sections
  const [sections, setSections] = useState<Section[]>([]);

  // delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchData = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "50");
    if (search) params.set("search", search);

    fetch(`/api/gl-codes?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setGlCodes(d.glCodes || []);
        setTotalPages(d.totalPages || 1);
        setTotal(d.total || 0);
      });
  }, [page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetch("/api/sections")
      .then((r) => r.json())
      .then((d) => setSections(d.sections || []));
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
    setError("");
  };

  const openEdit = (item: GlCode) => {
    setEditingId(item.id);
    setForm({
      gl_code: item.gl_code,
      name_en: item.name_en,
      name_dv: item.name_dv,
      details: item.details || "",
      section_id: item.section_id ? String(item.section_id) : "",
    });
    setShowModal(true);
    setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const method = editingId ? "PUT" : "POST";
      const payload = { ...form, section_id: form.section_id ? parseInt(form.section_id) : null };
      const body = editingId ? { id: editingId, ...payload } : payload;
      const res = await fetch("/api/gl-codes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) {
        setMessage(editingId ? "GL code updated" : "GL code created");
        setShowModal(false);
        fetchData();
      } else {
        setError(d.error || "Failed to save");
      }
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/gl-codes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteId }),
      });
      if (res.ok) {
        setMessage("GL code deleted");
        setDeleteId(null);
        fetchData();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to delete");
      }
    } catch {
      setError("Failed to delete");
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gl_codes_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    setError("");
    setMessage("");
    setUploadErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await fetch("/api/gl-codes/upload", {
        method: "POST",
        body: formData,
      });
      const d = await res.json();

      if (res.ok) {
        setMessage(d.message);
        if (d.errors) setUploadErrors(d.errors);
        setShowBulkModal(false);
        setCsvFile(null);
        fetchData();
      } else {
        setError(d.error || "Upload failed");
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Budget GL Codes</h2>
          <p className="text-sm text-gray-500 mt-1">
            {total} GL code{total !== 1 ? "s" : ""} registered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowBulkModal(true); setError(""); setUploadErrors([]); setCsvFile(null); }}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add GL Code
          </button>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm flex items-center justify-between">
          {message}
          <button onClick={() => setMessage("")}><X className="w-4 h-4" /></button>
        </div>
      )}
      {error && !showModal && !showBulkModal && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
        </div>
      )}
      {uploadErrors.length > 0 && (
        <div className="mb-4 px-4 py-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm">
          <p className="font-medium mb-1">Some rows had issues:</p>
          <ul className="list-disc list-inside text-xs space-y-0.5">
            {uploadErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                GL Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                English Name
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase" dir="rtl">
                Dhivehi Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Section
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {glCodes.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-gray-100 text-sm font-mono font-medium text-gray-800">
                    {item.gl_code}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-normal break-words">
                  {item.name_en || <span className="text-gray-400">-</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-normal break-words" dir="rtl">
                  {item.name_dv || <span className="text-gray-400">-</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {item.section_name || <span className="text-gray-400">-</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {glCodes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {search ? "No GL codes match your search" : "No GL codes added yet"}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit GL Code" : "Add GL Code"}
              </h3>
            </div>
            <form onSubmit={handleSave}>
              <div className="px-6 py-4 space-y-4">
                {error && (
                  <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GL Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.gl_code}
                    onChange={(e) => setForm({ ...form, gl_code: e.target.value })}
                    placeholder="e.g. 211001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    English Name
                  </label>
                  <input
                    type="text"
                    value={form.name_en}
                    onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                    placeholder="e.g. Staff Salary"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dhivehi Name
                  </label>
                  <input
                    type="text"
                    value={form.name_dv}
                    onChange={(e) => setForm({ ...form, name_dv: e.target.value })}
                    placeholder="މުވައްޒަފުންގެ މުސާރަ"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section
                  </label>
                  <select
                    value={form.section_id}
                    onChange={(e) => setForm({ ...form, section_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none select-styled pl-4 pr-10"
                  >
                    <option value="">No section</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Details
                  </label>
                  <textarea
                    value={form.details}
                    onChange={(e) => setForm({ ...form, details: e.target.value })}
                    placeholder="Additional details about this GL code..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Bulk Upload GL Codes</h3>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {error && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* CSV Template Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">CSV Template</p>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download template
                  </button>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">gl_codes_template.csv</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 bg-gray-50">gl_code</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 bg-gray-50">name_en</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 bg-gray-50">name_dv</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 bg-gray-50">details</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-gray-600">
                        <tr className="border-b border-gray-100">
                          <td className="px-3 py-1.5">211001</td>
                          <td className="px-3 py-1.5">Staff Salary</td>
                          <td className="px-3 py-1.5" dir="rtl">މުވައްޒަފުންގެ މުސާރަ</td>
                          <td className="px-3 py-1.5">Monthly salary payments</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="px-3 py-1.5">211002</td>
                          <td className="px-3 py-1.5">Staff Allowance</td>
                          <td className="px-3 py-1.5" dir="rtl">މުވައްޒަފުންގެ އެލަވަންސް</td>
                          <td className="px-3 py-1.5">Staff allowances</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-1.5">222001</td>
                          <td className="px-3 py-1.5">Office Supplies</td>
                          <td className="px-3 py-1.5" dir="rtl">އޮފީސް ސާމާނު</td>
                          <td className="px-3 py-1.5">Office consumables and supplies</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Only <span className="font-medium">gl_code</span> is required. Other columns are optional. Duplicate codes will be skipped.
                </p>
              </div>

              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV File
                </label>
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition">
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  />
                  {csvFile ? (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">{csvFile.name}</span>
                      <span className="text-gray-400">({(csvFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                      <p className="text-sm text-gray-500">Click to select a CSV file</p>
                    </div>
                  )}
                </label>
              </div>

              {uploading && <UploadProgress active={uploading} />}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpload}
                disabled={!csvFile || uploading}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete GL Code</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this GL code? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
