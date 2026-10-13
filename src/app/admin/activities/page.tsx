"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, X, Upload, FileSpreadsheet, RefreshCw } from "lucide-react";
import UploadProgress from "@/components/UploadProgress";

interface Activity {
  id: number;
  activity_detail: string;
  activity_number: string;
  section: string;
  fund: string;
  created_at: string;
}

interface Section {
  id: number;
  name: string;
}

const emptyForm = { activity_detail: "", activity_number: "", section: "", fund: "" };

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [fundFilter, setFundFilter] = useState("");
  const [filterSections, setFilterSections] = useState<string[]>([]);
  const [filterFunds, setFilterFunds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // sections for dropdown
  const [sections, setSections] = useState<Section[]>([]);

  // edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // delete
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // selection for bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // sync
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "50");
    if (search) params.set("search", search);
    if (sectionFilter) params.set("section", sectionFilter);
    if (fundFilter) params.set("fund", fundFilter);

    fetch(`/api/activities?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setActivities(d.activities || []);
        setTotalPages(d.totalPages || 1);
        setTotal(d.total || 0);
        setFilterSections(d.filters?.sections || []);
        setFilterFunds(d.filters?.funds || []);
        setLoading(false);
      });
  }, [page, search, sectionFilter, fundFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
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

  const openEdit = (item: Activity) => {
    setEditingId(item.id);
    setForm({
      activity_detail: item.activity_detail,
      activity_number: item.activity_number,
      section: item.section,
      fund: item.fund,
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
      const body = editingId ? { id: editingId, ...form } : form;
      const res = await fetch("/api/activities", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) {
        setMessage(editingId ? "Activity updated" : "Activity created");
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
      const res = await fetch("/api/activities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteId }),
      });
      if (res.ok) {
        setMessage("Activity deleted");
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/activities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const d = await res.json();
      if (res.ok) {
        setMessage(d.message);
        setSelectedIds(new Set());
        fetchData();
      } else {
        setError(d.error || "Failed to delete");
      }
    } catch {
      setError("Failed to delete");
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const res = await fetch("/api/activities/upload", {
        method: "POST",
        body: formData,
      });
      const d = await res.json();

      if (res.ok) {
        setMessage(d.message);
        setShowUploadModal(false);
        setUploadFile(null);
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

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/activities/sync", { method: "POST" });
      const d = await res.json();
      if (res.ok) {
        setMessage(d.message);
      } else {
        setError(d.error || "Sync failed");
      }
    } catch {
      setError("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === activities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activities.map((a) => a.id)));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-[#E4E6E7]">Activity Details</h2>
          <p className="text-sm text-gray-500 dark:text-[#9BA1A6] mt-1">
            {total} activit{total !== 1 ? "ies" : "y"} registered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing || total === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-[#3A3F44] text-gray-700 dark:text-[#C1C5C9] rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#262A2E] transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync to Budget"}
          </button>
          <button
            onClick={() => { setShowUploadModal(true); setError(""); setUploadFile(null); }}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-[#3A3F44] text-gray-700 dark:text-[#C1C5C9] rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#262A2E] transition"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Activity
          </button>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div className="mb-4 px-4 py-3 bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-300 rounded-lg text-sm flex items-center justify-between">
          {message}
          <button onClick={() => setMessage("")}><X className="w-4 h-4" /></button>
        </div>
      )}
      {error && !showModal && !showUploadModal && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 rounded-lg text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Bulk selection bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800/50 rounded-lg px-4 py-3">
          <span className="text-sm text-red-800 dark:text-red-300 font-medium">
            {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-gray-600 dark:text-[#9BA1A6] hover:text-gray-800 font-medium transition"
            >
              Clear
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search activities..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-[#3A3F44] rounded-lg text-sm bg-white dark:bg-[#15171A] dark:text-[#E4E6E7] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={sectionFilter}
          onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
          className="select-styled pl-4 pr-10 py-2.5 border border-gray-300 dark:border-[#3A3F44] rounded-lg text-sm bg-white dark:bg-[#1D1F20] dark:text-[#E4E6E7] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition cursor-pointer"
        >
          <option value="">All Sections</option>
          {filterSections.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={fundFilter}
          onChange={(e) => { setFundFilter(e.target.value); setPage(1); }}
          className="select-styled pl-4 pr-10 py-2.5 border border-gray-300 dark:border-[#3A3F44] rounded-lg text-sm bg-white dark:bg-[#1D1F20] dark:text-[#E4E6E7] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition cursor-pointer"
        >
          <option value="">All Funds</option>
          {filterFunds.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block h-7 w-7 animate-spin rounded-full border-[3px] border-solid border-blue-600 border-r-transparent" />
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1D1F20] rounded-xl border border-gray-200 dark:border-[#3A3F44] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-[#3A3F44]">
              <thead className="bg-gray-50 dark:bg-[#262A2E]">
                <tr>
                  <th className="px-3 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={activities.length > 0 && selectedIds.size === activities.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase w-12">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase">Activity Detail</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase">Activity Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase">Section</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase">Fund</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-[#9BA1A6] uppercase w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#3A3F44]">
                {activities.map((item, index) => (
                  <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-[#262A2E] ${selectedIds.has(item.id) ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 dark:text-[#9BA1A6]">{(page - 1) * 50 + index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-[#E4E6E7] font-medium max-w-md whitespace-normal break-words">{item.activity_detail}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-[#9BA1A6] font-mono">{item.activity_number || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-[#9BA1A6]">
                      {item.section ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                          {item.section}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-[#9BA1A6]">
                      {item.fund ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium">
                          {item.fund}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition"
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
          </div>
          {activities.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-[#9BA1A6]">
              {search || sectionFilter || fundFilter ? "No activities match your filters" : "No activities uploaded yet. Click \"Upload Activities\" to import from Excel."}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="px-3 py-2 text-sm border dark:border-[#3A3F44] rounded-lg hover:bg-gray-50 dark:hover:bg-[#262A2E] disabled:opacity-50 dark:text-[#E4E6E7]"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-[#9BA1A6] px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-2 text-sm border dark:border-[#3A3F44] rounded-lg hover:bg-gray-50 dark:hover:bg-[#262A2E] disabled:opacity-50 dark:text-[#E4E6E7]"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1D1F20] rounded-xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3A3F44]">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E6E7]">{editingId ? "Edit Activity" : "Add Activity"}</h3>
            </div>
            <form onSubmit={handleSave}>
              <div className="px-6 py-4 space-y-4">
                {error && (
                  <div className="px-3 py-2 bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#C1C5C9] mb-1">
                    Activity Detail <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.activity_detail}
                    onChange={(e) => setForm({ ...form, activity_detail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#3A3F44] dark:bg-[#15171A] dark:text-[#E4E6E7] rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#C1C5C9] mb-1">
                    Activity Number
                  </label>
                  <input
                    type="text"
                    value={form.activity_number}
                    onChange={(e) => setForm({ ...form, activity_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#3A3F44] dark:bg-[#15171A] dark:text-[#E4E6E7] rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#C1C5C9] mb-1">
                    Section
                  </label>
                  <select
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                    className="select-styled w-full pl-4 pr-10 py-2.5 border border-gray-300 dark:border-[#3A3F44] dark:bg-[#15171A] dark:text-[#E4E6E7] rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition cursor-pointer"
                  >
                    <option value="">No section</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#C1C5C9] mb-1">
                    Fund
                  </label>
                  <input
                    type="text"
                    value={form.fund}
                    onChange={(e) => setForm({ ...form, fund: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#3A3F44] dark:bg-[#15171A] dark:text-[#E4E6E7] rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-[#3A3F44] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-[#C1C5C9] border border-gray-300 dark:border-[#3A3F44] rounded-lg hover:bg-gray-50 dark:hover:bg-[#262A2E] transition"
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1D1F20] rounded-xl shadow-xl max-w-xl w-full">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3A3F44] flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E6E7]">Upload Activities</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {error && (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600 dark:text-[#9BA1A6] mb-3">
                  Upload an Excel file with columns: <strong>Activity Detail</strong>, <strong>Activity Number</strong>, <strong>Sections</strong>, <strong>Fund</strong>
                </p>
                <p className="text-xs text-gray-500 dark:text-[#9BA1A6] mb-4">
                  Duplicate activities (same detail + fund) will be skipped automatically.
                </p>
              </div>

              {/* File Input */}
              <div>
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 dark:border-[#3A3F44] rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  {uploadFile ? (
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-[#E4E6E7]">
                      <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">{uploadFile.name}</span>
                      <span className="text-gray-400">({(uploadFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                      <p className="text-sm text-gray-500 dark:text-[#9BA1A6]">Click to select an Excel file</p>
                    </div>
                  )}
                </label>
              </div>

              {uploading && <UploadProgress active={uploading} />}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-[#3A3F44] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-[#C1C5C9] border border-gray-300 dark:border-[#3A3F44] rounded-lg hover:bg-gray-50 dark:hover:bg-[#262A2E] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
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
          <div className="bg-white dark:bg-[#1D1F20] rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E6E7] mb-2">Delete Activity</h3>
            <p className="text-sm text-gray-600 dark:text-[#9BA1A6] mb-6">
              Are you sure you want to delete this activity? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-[#C1C5C9] border border-gray-300 dark:border-[#3A3F44] rounded-lg hover:bg-gray-50 dark:hover:bg-[#262A2E] transition"
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
