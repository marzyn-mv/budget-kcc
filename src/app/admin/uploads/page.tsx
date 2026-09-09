"use client";

import { useState, useEffect } from "react";

interface Upload {
  id: number;
  filename: string;
  rows_imported: number;
  uploaded_at: string;
  uploaded_by: string;
  linked_items: number;
  linked_pos: number;
  linked_vouchers: number;
  related_logs: number;
}

interface LogEntry {
  id: number;
  level: string;
  action: string;
  details: string | null;
  created_at: string;
}

export default function UploadHistoryPage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [relatedLogs, setRelatedLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Upload | null>(null);
  const [deleteInput, setDeleteInput] = useState("");

  const fetchUploads = () => {
    fetch("/api/uploads")
      .then((r) => r.json())
      .then((d) => setUploads(d.uploads || []));
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const handleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setRelatedLogs([]);
      return;
    }
    setExpandedId(id);
    setLoadingLogs(true);
    const res = await fetch(`/api/uploads/${id}/logs`);
    const data = await res.json();
    setRelatedLogs(data.logs || []);
    setLoadingLogs(false);
  };

  const handleDeleteClick = (upload: Upload) => {
    setDeleteConfirm(upload);
    setDeleteInput("");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    setDeleting(deleteConfirm.id);
    const res = await fetch("/api/uploads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteConfirm.id }),
    });
    if (res.ok) {
      if (expandedId === deleteConfirm.id) {
        setExpandedId(null);
        setRelatedLogs([]);
      }
      fetchUploads();
    }
    setDeleting(null);
    setDeleteConfirm(null);
    setDeleteInput("");
  };

  const levelColors: Record<string, string> = {
    info: "bg-blue-100 text-blue-800",
    warn: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Uploads</h2>
        <p className="text-gray-500 text-sm">
          View all Excel uploads with related activity logs
        </p>
      </div>

      {uploads.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          No uploads yet
        </div>
      ) : (
        <div className="space-y-3">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-700 text-lg">
                    📄
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {upload.filename}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                      <span>{upload.rows_imported} rows imported</span>
                      <span>·</span>
                      <span className={upload.linked_items > 0 ? "text-green-600 font-medium" : "text-gray-500"}>
                        {upload.linked_items} budget items
                      </span>
                      {upload.linked_pos > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-blue-600 font-medium">
                            {upload.linked_pos} POs
                          </span>
                        </>
                      )}
                      {upload.linked_vouchers > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-purple-600 font-medium">
                            {upload.linked_vouchers} vouchers
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span>{upload.uploaded_at}</span>
                      <span>·</span>
                      <span>by {upload.uploaded_by}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExpand(upload.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                      expandedId === upload.id
                        ? "bg-blue-50 border-blue-300 text-blue-700"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {expandedId === upload.id ? "Hide Logs" : `Logs (${upload.related_logs})`}
                  </button>
                  <button
                    onClick={() => handleDeleteClick(upload)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {expandedId === upload.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Related Logs
                  </h4>
                  {loadingLogs ? (
                    <div className="text-center py-4">
                      <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-r-transparent"></div>
                    </div>
                  ) : relatedLogs.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">
                      No related logs found
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {relatedLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 bg-white rounded-lg border border-gray-200 p-3"
                        >
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full mt-0.5 ${levelColors[log.level] || "bg-gray-100"}`}
                          >
                            {log.level}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {log.action}
                            </p>
                            {log.details && (
                              <p className="text-sm text-gray-500 truncate">
                                {log.details}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {log.created_at}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-lg">
                !
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Delete
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              This will permanently delete the upload record for{" "}
              <strong className="text-gray-900">{deleteConfirm.filename}</strong>.
            </p>
            {(deleteConfirm.linked_items > 0 || deleteConfirm.linked_pos > 0 || deleteConfirm.linked_vouchers > 0) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-red-700 font-medium mb-1">
                  Warning: This will also delete:
                </p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-0.5">
                  {deleteConfirm.linked_items > 0 && (
                    <li>{deleteConfirm.linked_items} budget item{deleteConfirm.linked_items !== 1 ? "s" : ""}</li>
                  )}
                  {deleteConfirm.linked_pos > 0 && (
                    <li>{deleteConfirm.linked_pos} PO report{deleteConfirm.linked_pos !== 1 ? "s" : ""}</li>
                  )}
                  {deleteConfirm.linked_vouchers > 0 && (
                    <li>{deleteConfirm.linked_vouchers} voucher report{deleteConfirm.linked_vouchers !== 1 ? "s" : ""}</li>
                  )}
                </ul>
              </div>
            )}
            <p className="text-sm text-gray-600 mb-4">
              Type the filename below to confirm.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={deleteConfirm.filename}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteConfirm(null);
                  setDeleteInput("");
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={
                  deleteInput !== deleteConfirm.filename ||
                  deleting === deleteConfirm.id
                }
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {deleting === deleteConfirm.id
                  ? "Deleting..."
                  : "Delete Upload Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
