import React, { useEffect, useState } from 'react';
import { Ban, Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import DeleteConfirmModal from './common/DeleteConfirmModal';
import { useInventory } from '../context/InventoryContext';

const DEFAULT_TYPES = ['Social Media Post', 'Social Media Reels', 'Other'];

const ExpenseTypeManagerModal = ({ expenseTypes, expenses, onClose, onSaveTypes }) => {
    const { addToast } = useInventory();
    const [newTypeName, setNewTypeName] = useState('');
    const [editingType, setEditingType] = useState(null);
    const [editName, setEditName] = useState('');
    const [typeCounts, setTypeCounts] = useState({});
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [typeToDelete, setTypeToDelete] = useState(null);

    useEffect(() => {
        const counts = {};
        (expenseTypes || []).forEach((type) => {
            counts[type] = (expenses || []).filter((expense) => (expense.type || 'Other') === type).length;
        });
        setTypeCounts(counts);
    }, [expenseTypes, expenses]);

    const persist = async (types) => {
        await onSaveTypes(types);
    };

    const handleAdd = async () => {
        const next = newTypeName.trim();
        if (!next) return;
        if (expenseTypes.includes(next)) {
            addToast('Expense type already exists', 'info');
            return;
        }
        await persist([...expenseTypes, next]);
        setNewTypeName('');
    };

    const handleUpdate = async () => {
        const nextName = editName.trim();
        if (!editingType || !nextName) return;
        if (nextName === editingType) {
            setEditingType(null);
            setEditName('');
            return;
        }
        if (expenseTypes.includes(nextName)) {
            addToast('Expense type already exists', 'info');
            return;
        }
        const nextTypes = expenseTypes.map((type) => (type === editingType ? nextName : type));
        await persist(nextTypes);
        setEditingType(null);
        setEditName('');
    };

    const handleDelete = (type) => {
        if (DEFAULT_TYPES.includes(type)) {
            addToast('Default expense types cannot be removed.', 'warning');
            return;
        }
        if ((typeCounts[type] || 0) > 0) {
            addToast(`Cannot delete type "${type}" because it is used by ${typeCounts[type]} expenses.`, 'error');
            return;
        }
        setTypeToDelete(type);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!typeToDelete) return;
        const nextTypes = expenseTypes.filter((type) => type !== typeToDelete);
        await persist(nextTypes);
        setIsDeleteModalOpen(false);
        setTypeToDelete(null);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Manage Expense Types</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTypeName}
                            onChange={(e) => setNewTypeName(e.target.value)}
                            placeholder="New expense type"
                            className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent dark:text-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newTypeName.trim()}
                            className="px-4 py-2 bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-accent/20 transition-all flex items-center justify-center"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20">
                    {(expenseTypes || []).map((type) => (
                        <div key={type} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm group hover:border-indigo-100 dark:hover:border-slate-600 transition-colors">
                            {editingType === type ? (
                                <div className="flex-1 flex gap-2 mr-2">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-accent rounded-lg text-sm outline-none dark:text-white"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleUpdate();
                                            if (e.key === 'Escape') {
                                                setEditingType(null);
                                                setEditName('');
                                            }
                                        }}
                                    />
                                    <button onClick={handleUpdate} className="text-emerald-500 hover:bg-emerald-50 rounded p-1"><Save className="w-4 h-4" /></button>
                                    <button onClick={() => { setEditingType(null); setEditName(''); }} className="text-red-400 hover:bg-red-50 rounded p-1"><X className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{type}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full">
                                            {typeCounts[type] || 0} expenses
                                        </span>
                                    </div>
                                    <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditingType(type); setEditName(type); }}
                                            className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                                            title="Rename"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(type)}
                                            className={`p-2 rounded-lg transition-colors ${DEFAULT_TYPES.includes(type) || (typeCounts[type] || 0) > 0
                                                ? 'text-slate-300 cursor-not-allowed'
                                                : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
                                                }`}
                                            title={DEFAULT_TYPES.includes(type) ? 'Default type cannot be deleted' : ((typeCounts[type] || 0) > 0 ? 'Cannot delete used type' : 'Delete')}
                                        >
                                            {DEFAULT_TYPES.includes(type) || (typeCounts[type] || 0) > 0 ? <Ban className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {(expenseTypes || []).length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No expense types found. Add one above.
                        </div>
                    )}
                </div>
            </div>

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setTypeToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Expense Type"
                message={`Are you sure you want to delete type "${typeToDelete}"?`}
            />
        </div>
    );
};

export default ExpenseTypeManagerModal;
