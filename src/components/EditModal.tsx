"use client";

import { BudgetItem } from "@/lib/types";
import { useState } from "react";

interface Props {
  item: BudgetItem;
  onSave: (updated: Partial<BudgetItem> & { id: number }) => Promise<void>;
  onClose: () => void;
}

export default function EditModal({ item, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    fund: item.fund,
    activity_detail: item.activity_detail,
    prog: item.prog,
    center_name: item.center_name,
    gl_code: item.gl_code,
    budget: item.budget,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ id: item.id, ...form });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Edit Budget Item #{item.id}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fund
            </label>
            <input
              value={form.fund}
              onChange={(e) => setForm({ ...form, fund: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activity Detail
            </label>
            <input
              value={form.activity_detail}
              onChange={(e) =>
                setForm({ ...form, activity_detail: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Program Code
              </label>
              <input
                value={form.prog}
                onChange={(e) => setForm({ ...form, prog: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GL Code
              </label>
              <input
                value={form.gl_code}
                onChange={(e) => setForm({ ...form, gl_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Center Name
              </label>
              <input
                value={form.center_name}
                onChange={(e) =>
                  setForm({ ...form, center_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget (MVR)
              </label>
              <input
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
