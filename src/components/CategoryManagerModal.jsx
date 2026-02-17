import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save, Ban } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import DeleteConfirmModal from './common/DeleteConfirmModal';

const CategoryManagerModal = ({ categories, products, onClose, onAdd, onUpdate, onDelete }) => {
    const { addToast } = useInventory();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState(null);
    const [editName, setEditName] = useState('');
    const [categoryCounts, setCategoryCounts] = useState({});

    // New delete confirmation state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);

    // Calculate usage counts
    useEffect(() => {
        const counts = {};
        categories.forEach(cat => {
            counts[cat] = products.filter(p => p.category === cat).length;
        });
        setCategoryCounts(counts);
    }, [categories, products]);

    const handleAdd = () => {
        if (newCategoryName.trim()) {
            onAdd(newCategoryName.trim());
            setNewCategoryName('');
        }
    };

    const handleUpdate = () => {
        if (editingCategory && editName.trim() && editName !== editingCategory) {
            onUpdate(editingCategory, editName.trim());
            setEditingCategory(null);
            setEditName('');
        }
    };

    const handleDelete = (cat) => {
        if (categoryCounts[cat] > 0) {
            addToast(`Cannot delete category "${cat}" because it is used by ${categoryCounts[cat]} products.`, "error");
            return;
        }
        setCategoryToDelete(cat);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (categoryToDelete) {
            onDelete(categoryToDelete);
            setIsDeleteModalOpen(false);
            setCategoryToDelete(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Manage Categories</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Add New */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="New Category Name"
                            className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent dark:text-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newCategoryName.trim()}
                            className="px-4 py-2 bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-accent/20 transition-all flex items-center justify-center"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20">
                    {categories.map((cat) => (
                        <div key={cat} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm group hover:border-indigo-100 dark:hover:border-slate-600 transition-colors">

                            {editingCategory === cat ? (
                                <div className="flex-1 flex gap-2 mr-2">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-accent rounded-lg text-sm outline-none dark:text-white"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleUpdate();
                                            if (e.key === 'Escape') setEditingCategory(null);
                                        }}
                                    />
                                    <button onClick={handleUpdate} className="text-emerald-500 hover:bg-emerald-50 rounded p-1"><Save className="w-4 h-4" /></button>
                                    <button onClick={() => setEditingCategory(null)} className="text-red-400 hover:bg-red-50 rounded p-1"><X className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{cat}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full">
                                            {categoryCounts[cat] || 0} products
                                        </span>
                                    </div>
                                    <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditingCategory(cat); setEditName(cat); }}
                                            className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                                            title="Rename"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat)}
                                            className={`p-2 rounded-lg transition-colors ${categoryCounts[cat] > 0
                                                ? 'text-slate-300 cursor-not-allowed'
                                                : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
                                                }`}
                                            title={categoryCounts[cat] > 0 ? "Cannot delete used category" : "Delete"}
                                        >
                                            {categoryCounts[cat] > 0 ? <Ban className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {categories.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No categories found. Add one above.
                        </div>
                    )}
                </div>

            </div>

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setCategoryToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Category"
                message={`Are you sure you want to delete category "${categoryToDelete}"?`}
            />
        </div>
    );
};

export default CategoryManagerModal;
