"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Item {
  id: string;
  item_name: string;
  category: string;
  problem: string;
  description: string;
  status: string;
  created_at: string;
  event_title: string;
  event_date: string;
  owner_name: string;
  owner_email: string;
  fixer_name: string;
}

export default function AdminItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState({ item_name: "", category: "", problem: "", description: "", status: "" });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/admin/items");
      const data = await res.json();
      if (res.ok) {
        setItems(data.items);
      } else {
        if (res.status === 401) {
          router.push("/auth/signin?redirect=/admin/items");
          return;
        }
        throw new Error(data.message);
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load items" });
    } finally {
      setLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Delete ${selectedItems.size} selected items? This cannot be undone.`)) return;

    try {
      const res = await fetch("/api/admin/items/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: Array.from(selectedItems) }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        setSelectedItems(new Set());
        fetchItems();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to delete items" });
    }
  };

  const updateItem = async () => {
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/admin/items/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Item updated successfully" });
        setEditingItem(null);
        fetchItems();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to update item" });
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setEditForm({
      item_name: item.item_name || "",
      category: item.category || "",
      problem: item.problem || "",
      description: item.description || "",
      status: item.status || "registered",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-green-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-2xl font-bold">All Items</h1>
        </div>
        <div className="flex items-center gap-4">
          {selectedItems.size > 0 && (
            <button onClick={bulkDelete} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
              Delete {selectedItems.size} selected
            </button>
          )}
          <div className="text-sm text-gray-500">
            {items.length} total
          </div>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-right font-bold">x</button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedItems.size === items.length}
                  onChange={toggleAllSelection}
                  className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fixer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className={`hover:bg-gray-50 ${selectedItems.has(item.id) ? "bg-blue-50" : ""}`}>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                    className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                  />
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                  <div className="font-medium">{item.item_name}</div>
                  <div className="text-gray-500 text-xs">{item.category}</div>
                  {item.problem && <div className="text-gray-400 text-xs mt-1">Problem: {item.problem}</div>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.owner_name || item.owner_email || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.event_title}<br/>
                  <span className="text-xs">{item.event_date ? new Date(item.event_date).toLocaleDateString() : ''}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.fixer_name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    item.status === 'completed' ? 'bg-green-100 text-green-800' :
                    item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    item.status === 'repairing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {item.status || 'registered'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 text-sm">
                  <button onClick={() => openEditModal(item)} className="text-green-600 hover:underline">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Item</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input type="text" value={editForm.item_name} onChange={(e) => setEditForm(f => ({ ...f, item_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input type="text" value={editForm.category} onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Problem</label>
                <textarea value={editForm.problem} onChange={(e) => setEditForm(f => ({ ...f, problem: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                  <option value="registered">Registered</option>
                  <option value="in_progress">In Progress</option>
                  <option value="repairing">Repairing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingItem(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={updateItem} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}