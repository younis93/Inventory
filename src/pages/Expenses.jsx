import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format, isWithinInterval, parseISO, subDays } from 'date-fns';
import {
    Download,
    ExternalLink,
    FileText,
    Link2,
    Pencil,
    Plus,
    Search,
    Tag,
    Trash2,
    User
} from 'lucide-react';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import Layout from '../components/Layout';
import DeleteConfirmModal from '../components/common/DeleteConfirmModal';
import AppDatePicker from '../components/common/AppDatePicker';
import DateRangePicker from '../components/DateRangePicker';
import FilterDropdown from '../components/FilterDropdown';
import RowLimitDropdown from '../components/RowLimitDropdown';
import ExpenseTypeManagerModal from '../components/ExpenseTypeManagerModal';
import SearchableSelect from '../components/SearchableSelect';
import { storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useExpenses, useInventory } from '../context/InventoryContext';
import { useTranslation } from 'react-i18next';
import { exportExpensesToCSV } from '../utils/CSVExportUtil';
import { useModalA11y } from '../hooks/useModalA11y';

const defaultForm = {
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'Social Media Post',
    socialPlatform: 'Facebook',
    amountIQD: '',
    link: '',
    campaign: '',
    tags: '',
    notes: '',
    attachments: []
};
const SOCIAL_PLATFORM_TYPES = new Set(['Social Media Ads', 'Social Media Post']);

const parseDateSafe = (value) => {
    if (!value) return null;
    try {
        const parsed = parseISO(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
};

const isValidUrl = (value) => {
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol);
    } catch {
        return false;
    }
};

const dayKey = (value) => {
    if (!value) return '';
    try {
        return format(value, 'yyyy-MM-dd');
    } catch {
        return '';
    }
};

const INVALID_INTEGER_KEYS = ['e', 'E', '+', '-', '.'];

const preventInvalidIntegerKey = (event) => {
    if (INVALID_INTEGER_KEYS.includes(event.key)) {
        event.preventDefault();
    }
};

const sanitizePositiveIntegerInput = (value) => {
    const digits = String(value ?? '').replace(/[^\d]/g, '');
    const parsed = Number.parseInt(digits, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return '';
    return String(parsed);
};

const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const SUPPORTED_ATTACHMENT_TYPES = [...SUPPORTED_IMAGE_TYPES, 'application/pdf'];

const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.readAsDataURL(file);
});

const loadImage = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image.'));
    image.src = src;
});

const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to compress image.'));
    }, type, quality);
});

const compressImageIfNeeded = async (file) => {
    if (file.size <= MAX_ATTACHMENT_BYTES) return file;
    if (file.type === 'image/gif') {
        throw new Error(`${file.name} is larger than 6MB.`);
    }

    const source = await readFileAsDataUrl(file);
    const image = await loadImage(source);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, width, height);

    let quality = 0.86;
    let outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    let blob = await canvasToBlob(canvas, outputType, quality);

    while (blob.size > MAX_ATTACHMENT_BYTES && quality > 0.35) {
        quality -= 0.08;
        outputType = 'image/jpeg';
        blob = await canvasToBlob(canvas, outputType, quality);
    }

    if (blob.size > MAX_ATTACHMENT_BYTES) {
        throw new Error(`${file.name} is larger than 6MB after compression.`);
    }

    const nextName = outputType === 'image/jpeg'
        ? file.name.replace(/\.[^.]+$/, '.jpg')
        : file.name;
    return new File([blob], nextName, {
        type: outputType,
        lastModified: Date.now()
    });
};

const Expenses = () => {
    const { t } = useTranslation();
    const {
        expenses: allExpenses,
        expenseTypes,
        saveExpenseTypes,
        addExpense,
        updateExpense,
        deleteExpense
    } = useExpenses();
    const {
        addToast,
        formatCurrency,
        loading,
        brand,
        setIsModalOpen: setGlobalModalOpen
    } = useInventory();
    const { user: authUser } = useAuth();

    const [selectedTypes, setSelectedTypes] = useState([]);
    const [selectedCreatedBy, setSelectedCreatedBy] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [displayLimit, setDisplayLimit] = useState(100);
    const [sortConfig, setSortConfig] = useState({ column: 'date', direction: 'desc' });
    const [isMobileView, setIsMobileView] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTypeManagerOpen, setIsTypeManagerOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState(null);
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [form, setForm] = useState(defaultForm);
    const [newFiles, setNewFiles] = useState([]);
    const [uploadQueue, setUploadQueue] = useState([]);
    const [uploadError, setUploadError] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showValidationErrors, setShowValidationErrors] = useState(false);
    const expenseDialogRef = useRef(null);
    const expenses = allExpenses;
    const minDate = useMemo(() => {
        if (!expenses.length) return subDays(new Date(), 30);
        return expenses.reduce((min, expense) => {
            const d = parseDateSafe(expense.date);
            return d && d < min ? d : min;
        }, new Date());
    }, [expenses]);

    const defaultRange = useMemo(() => ({
        from: minDate,
        to: new Date()
    }), [minDate]);

    const [dateRange, setDateRange] = useState(defaultRange);
    const [hasInitializedDate, setHasInitializedDate] = useState(false);

    useModalA11y({
        isOpen: isModalOpen,
        onClose: () => {
            setIsModalOpen(false);
        },
        containerRef: expenseDialogRef
    });

    useEffect(() => {
        if (!loading && expenses.length > 0 && !hasInitializedDate) {
            setDateRange(defaultRange);
            setHasInitializedDate(true);
        }
    }, [loading, expenses.length, hasInitializedDate, defaultRange]);

    useEffect(() => {
        setGlobalModalOpen(isModalOpen || isTypeManagerOpen || isDeleteModalOpen);
        return () => setGlobalModalOpen(false);
    }, [isModalOpen, isTypeManagerOpen, isDeleteModalOpen, setGlobalModalOpen]);

    useEffect(() => {
        const onResize = () => setIsMobileView(window.innerWidth < 640);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const formErrors = useMemo(() => {
        const errors = {};
        if (!form.date) errors.date = 'Date is required.';
        if (!String(form.type || '').trim()) errors.type = 'Type is required.';

        const amount = Number.parseInt(form.amountIQD, 10);
        if (!Number.isInteger(amount) || amount <= 0) {
            errors.amountIQD = 'Amount must be greater than 0.';
        } else if (amount > 1000000000) {
            errors.amountIQD = 'Amount is too large.';
        }

        const link = String(form.link || '').trim();
        if (!link) {
            errors.link = 'Link URL is required.';
        } else if (!isValidUrl(link)) {
            errors.link = 'Please enter a valid URL (http/https).';
        }
        return errors;
    }, [form.amountIQD, form.date, form.link, form.type]);
    const hasFormErrors = Object.keys(formErrors).length > 0;

    const setQueueItem = (id, next) => {
        setUploadQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...next } : item)));
    };

    const prepareFiles = async (files) => {
        if (!files.length) return;

        setUploadError('');
        const queueItems = files.map((rawFile) => ({
            id: `${rawFile.name}-${rawFile.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: rawFile.name,
            size: rawFile.size,
            progress: 0,
            status: 'queued',
            message: ''
        }));
        setUploadQueue((prev) => [...prev, ...queueItems]);

        const prepared = [];

        for (const [index, rawFile] of files.entries()) {
            const id = queueItems[index].id;

            try {
                if (!SUPPORTED_ATTACHMENT_TYPES.includes(rawFile.type)) {
                    throw new Error('Only JPG, PNG, WEBP, GIF, or PDF files are allowed.');
                }
                if (rawFile.size > MAX_ATTACHMENT_BYTES) {
                    throw new Error(`${rawFile.name} is larger than 6MB.`);
                }

                setQueueItem(id, { status: 'processing', progress: 20 });
                const file = rawFile.type.startsWith('image/')
                    ? await compressImageIfNeeded(rawFile)
                    : rawFile;
                if (file.size > MAX_ATTACHMENT_BYTES) {
                    throw new Error(`${file.name} is larger than 6MB.`);
                }

                prepared.push({
                    id,
                    file,
                    name: file.name,
                    size: file.size
                });
                setQueueItem(id, { status: 'ready', progress: 35, name: file.name, size: file.size });
            } catch (error) {
                const message = error?.message || 'Failed to process file.';
                setUploadError(message);
                setQueueItem(id, { status: 'error', message, progress: 100 });
            }
        }

        if (prepared.length) {
            setNewFiles((prev) => [...prev, ...prepared]);
        }
    };

    const handleFileInputChange = async (event) => {
        const files = Array.from(event.target.files || []);
        await prepareFiles(files);
        event.target.value = '';
    };

    const handleFileDrop = async (event) => {
        event.preventDefault();
        setDragActive(false);
        const files = Array.from(event.dataTransfer.files || []);
        await prepareFiles(files);
    };

    const removeQueuedFile = (id) => {
        setUploadQueue((prev) => prev.filter((item) => item.id !== id));
        setNewFiles((prev) => prev.filter((item) => item.id !== id));
    };

    const expensesInDateRange = useMemo(() => {
        return expenses.filter((expense) => {
            const d = parseDateSafe(expense.date);
            if (!d) return false;
            if (!dateRange?.from || !dateRange?.to) return true;
            return isWithinInterval(d, { start: dateRange.from, end: dateRange.to });
        });
    }, [expenses, dateRange]);

    const typeOptions = useMemo(() => {
        const counts = {};
        expensesInDateRange.forEach((e) => {
            const type = e.type || 'Other';
            counts[type] = (counts[type] || 0) + 1;
        });
        const merged = [...new Set([...(expenseTypes || []), ...Object.keys(counts)])];
        return merged.map((type) => ({
            value: type,
            label: type,
            count: counts[type] || 0
        })).sort((a, b) => b.count - a.count);
    }, [expensesInDateRange, expenseTypes]);

    const createdByOptions = useMemo(() => {
        const counts = {};
        expensesInDateRange.forEach((expense) => {
            const createdBy = expense.createdBy || 'System';
            counts[createdBy] = (counts[createdBy] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([value, count]) => ({ value, label: value, count }))
            .sort((a, b) => b.count - a.count);
    }, [expensesInDateRange]);

    const filteredExpenses = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return expensesInDateRange.filter((expense) => {
            const matchesType = selectedTypes.length === 0 || selectedTypes.includes(expense.type);
            const createdBy = expense.createdBy || 'System';
            const matchesCreatedBy = selectedCreatedBy.length === 0 || selectedCreatedBy.includes(createdBy);
            if (!matchesType) return false;
            if (!matchesCreatedBy) return false;
            if (!query) return true;

            const text = [
                expense.type,
                expense.campaign,
                expense.notes,
                expense.link,
                Array.isArray(expense.tags) ? expense.tags.join(' ') : expense.tags
            ].join(' ').toLowerCase();
            return text.includes(query);
        });
    }, [expensesInDateRange, selectedTypes, selectedCreatedBy, searchTerm]);

    const sortedExpenses = useMemo(() => {
        const getValue = (expense, key) => {
            if (key === 'date') return parseDateSafe(expense.date)?.getTime() || 0;
            if (key === 'amountIQD') return Number(expense.amountIQD || 0);
            return String(expense[key] || '').toLowerCase();
        };
        return [...filteredExpenses].sort((a, b) => {
            const av = getValue(a, sortConfig.column);
            const bv = getValue(b, sortConfig.column);
            if (av === bv) return 0;
            const compare = av > bv ? 1 : -1;
            return sortConfig.direction === 'asc' ? compare : -compare;
        });
    }, [filteredExpenses, sortConfig]);

    const visibleExpenses = useMemo(
        () => sortedExpenses.slice(0, displayLimit),
        [sortedExpenses, displayLimit]
    );

    const totalSpend = useMemo(
        () => filteredExpenses.reduce((sum, expense) => sum + Number(expense.amountIQD || 0), 0),
        [filteredExpenses]
    );

    const hasActiveFilters = useMemo(() => (
        selectedTypes.length > 0 ||
        selectedCreatedBy.length > 0 ||
        searchTerm.trim().length > 0 ||
        dayKey(dateRange?.from) !== dayKey(defaultRange?.from) ||
        dayKey(dateRange?.to) !== dayKey(defaultRange?.to)
    ), [selectedTypes, selectedCreatedBy, searchTerm, dateRange, defaultRange]);

    const spendByType = useMemo(() => {
        const totals = {};
        filteredExpenses.forEach((expense) => {
            const type = expense.type || 'Other';
            totals[type] = (totals[type] || 0) + Number(expense.amountIQD || 0);
        });
        return Object.entries(totals).sort((a, b) => b[1] - a[1]);
    }, [filteredExpenses]);

    const spendByCampaign = useMemo(() => {
        const totals = {};
        filteredExpenses.forEach((expense) => {
            const campaign = expense.campaign?.trim() || 'Unassigned';
            totals[campaign] = (totals[campaign] || 0) + Number(expense.amountIQD || 0);
        });
        return Object.entries(totals).sort((a, b) => b[1] - a[1]);
    }, [filteredExpenses]);

    const resetForm = () => {
        setForm(defaultForm);
        setNewFiles([]);
        setUploadQueue([]);
        setUploadError('');
        setShowValidationErrors(false);
        setEditingExpenseId(null);
    };

    const openCreateModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const openEditModal = (expense) => {
        setEditingExpenseId(expense._id);
        setShowValidationErrors(false);
        setForm({
            date: format(parseDateSafe(expense.date) || new Date(), 'yyyy-MM-dd'),
            type: expense.type || 'Other',
            socialPlatform: expense.socialPlatform || '',
            amountIQD: String(expense.amountIQD || ''),
            link: expense.link || '',
            campaign: expense.campaign || '',
            tags: Array.isArray(expense.tags) ? expense.tags.join(', ') : (expense.tags || ''),
            notes: expense.notes || '',
            attachments: Array.isArray(expense.attachments) ? expense.attachments : []
        });
        setNewFiles([]);
        setUploadQueue([]);
        setUploadError('');
        setIsModalOpen(true);
    };

    const handleSort = (column) => {
        setSortConfig((prev) => {
            if (prev.column !== column) return { column, direction: 'asc' };
            return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        });
    };

    const handleRequestDelete = (expense) => {
        setExpenseToDelete(expense);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!expenseToDelete?._id) return;
        deleteExpense(expenseToDelete._id);
        setExpenseToDelete(null);
        setIsDeleteModalOpen(false);
    };

    const removeAttachmentFromForm = (index) => {
        setForm((prev) => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const uploadNewFiles = async (files) => {
        if (!files.length) return [];
        const uid = authUser?.uid || 'anonymous';
        const uploads = [];

        for (const fileEntry of files) {
            const file = fileEntry.file;
            const queueId = fileEntry.id;
            if (!file || !SUPPORTED_ATTACHMENT_TYPES.includes(file.type)) {
                setQueueItem(queueId, { status: 'error', message: 'Unsupported file type.', progress: 100 });
                throw new Error('Only JPG, PNG, WEBP, GIF, or PDF files are allowed.');
            }
            if (file.size > MAX_ATTACHMENT_BYTES) {
                setQueueItem(queueId, { status: 'error', message: 'File exceeds 6MB.', progress: 100 });
                throw new Error(`${file.name} is larger than 6MB.`);
            }

            setQueueItem(queueId, { status: 'uploading', progress: 40, message: '' });
            const safeName = file.name.replace(/[^\w.\-]/g, '_');
            const path = `expenses/${uid}/${Date.now()}_${safeName}`;
            const storageRef = ref(storage, path);
            const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });

            const url = await new Promise((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const ratio = snapshot.totalBytes > 0 ? snapshot.bytesTransferred / snapshot.totalBytes : 0;
                        const progress = 40 + Math.round(ratio * 60);
                        setQueueItem(queueId, { progress: Math.min(100, progress) });
                    },
                    (error) => {
                        setQueueItem(queueId, { status: 'error', message: error?.message || 'Upload failed.', progress: 100 });
                        reject(error);
                    },
                    async () => {
                        try {
                            const uploadedUrl = await getDownloadURL(uploadTask.snapshot.ref);
                            setQueueItem(queueId, { status: 'done', progress: 100 });
                            resolve(uploadedUrl);
                        } catch (error) {
                            setQueueItem(queueId, { status: 'error', message: 'Failed to finalize upload.', progress: 100 });
                            reject(error);
                        }
                    }
                );
            });

            uploads.push({
                name: file.name,
                url,
                path,
                contentType: file.type,
                size: file.size
            });
        }
        return uploads;
    };

    const handleSaveExpense = async (e) => {
        e.preventDefault();
        setShowValidationErrors(true);
        if (hasFormErrors) {
            addToast(Object.values(formErrors)[0], 'error');
            return;
        }
        if (uploadQueue.some((item) => item.status === 'error')) {
            addToast('Please remove failed attachments and re-upload.', 'error');
            return;
        }

        setUploadError('');
        setSaving(true);
        try {
            const amount = Number.parseInt(form.amountIQD, 10);
            const uploaded = await uploadNewFiles(newFiles);
            const payload = {
                date: new Date(`${form.date}T12:00:00`).toISOString(),
                type: form.type,
                socialPlatform: SOCIAL_PLATFORM_TYPES.has(form.type) ? (form.socialPlatform || 'Facebook') : '',
                amountIQD: amount,
                link: form.link.trim(),
                campaign: form.campaign.trim(),
                tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
                notes: form.notes.trim(),
                attachments: [...form.attachments, ...uploaded]
            };

            if (editingExpenseId) {
                await updateExpense({ _id: editingExpenseId, ...payload });
            } else {
                await addExpense(payload);
            }
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            setUploadError(error?.message || 'Failed to upload attachments.');
            addToast(error?.message || 'Failed to save expense', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Layout title={t('expenses.title')}>
            <div className="flex flex-col gap-4 mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex gap-3 w-full items-center justify-between flex-wrap">
                    <div className="flex gap-3 items-center flex-wrap">
                        <button
                            onClick={openCreateModal}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 text-white rounded-xl font-bold transition-all bg-accent shadow-accent active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            <span>{t('expenses.newExpense')}</span>
                        </button>

                        <button
                            onClick={() => {
                                if (sortedExpenses.length === 0) return addToast(t('common.noDataToExport'), 'info');
                                exportExpensesToCSV(sortedExpenses);
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold transition-all shadow-lg hover:bg-green-700"
                        >
                            <Download className="w-5 h-5" />
                            <span className="sm:hidden">CSV</span>
                            <span className="hidden sm:inline">{t('common.exportCSV')}</span>
                        </button>

                        <button
                            onClick={() => setIsTypeManagerOpen(true)}
                            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-700"
                        >
                            {t('expenses.addType')}
                        </button>
                    </div>

                    <div className="hidden sm:flex items-center gap-3">
                        {hasActiveFilters && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSelectedTypes([]);
                                        setSelectedCreatedBy([]);
                                        setDateRange(defaultRange);
                                    }}
                                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-all border border-slate-200 dark:border-slate-700"
                                >
                                    {t('common.clearFilters')}
                                </button>
                            )}
                        <RowLimitDropdown limit={displayLimit} onChange={setDisplayLimit} />
                        <div className="shrink-0 whitespace-nowrap flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-bold text-slate-500">
                                <span className="text-slate-900 dark:text-white">{visibleExpenses.length}</span> {t('common.of', { defaultValue: 'of' })} <span className="text-slate-900 dark:text-white">{filteredExpenses.length}</span> {t('expenses.title')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex sm:hidden gap-2 items-center w-full">
                    <RowLimitDropdown limit={displayLimit} onChange={setDisplayLimit} />
                    <div className="shrink-0 whitespace-nowrap flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-500">
                            <span className="text-slate-900 dark:text-white">{visibleExpenses.length}</span> {t('common.of', { defaultValue: 'of' })} <span className="text-slate-900 dark:text-white">{filteredExpenses.length}</span> {t('expenses.title')}
                        </span>
                    </div>
                </div>

                <div className="flex gap-3 w-full flex-wrap lg:flex-nowrap items-center">
                    <div className="relative order-last w-full sm:order-none sm:min-w-[220px] sm:flex-1 lg:flex-none lg:w-[320px] h-[44px]">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('expenses.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="ps-10 pe-4 py-0 h-full w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/10 transition-all font-bold text-sm text-slate-700 dark:text-white"
                        />
                    </div>

                    <div className="h-[44px] flex-shrink-0">
                        <DateRangePicker
                            range={dateRange}
                            onRangeChange={setDateRange}
                            brandColor={brand.color}
                        />
                    </div>

                    <FilterDropdown
                        title="Type"
                        options={typeOptions}
                        selectedValues={selectedTypes}
                        onChange={setSelectedTypes}
                        icon={Tag}
                        showSearch={false}
                    />

                    <FilterDropdown
                        title={t('common.createdBy')}
                        options={createdByOptions}
                        selectedValues={selectedCreatedBy}
                        onChange={setSelectedCreatedBy}
                        icon={User}
                        showSearch={false}
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
                <div className="min-w-0 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-2.5 sm:p-4">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{t('expenses.totalSpend')}</p>
                    <p className="truncate text-sm sm:text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(totalSpend)}</p>
                </div>
                <div className="min-w-0 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-2.5 sm:p-4">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{t('expenses.topType')}</p>
                    <p className="truncate text-sm sm:text-xl font-black text-slate-900 dark:text-white">{spendByType[0]?.[0] || 'N/A'}</p>
                    <p className="truncate text-[11px] sm:text-sm text-slate-500">{formatCurrency(spendByType[0]?.[1] || 0)}</p>
                </div>
                <div className="min-w-0 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-2.5 sm:p-4">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{t('expenses.topCampaign')}</p>
                    <p className="truncate text-sm sm:text-xl font-black text-slate-900 dark:text-white">{spendByCampaign[0]?.[0] || 'N/A'}</p>
                    <p className="truncate text-[11px] sm:text-sm text-slate-500">{formatCurrency(spendByCampaign[0]?.[1] || 0)}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                {!isMobileView && (
                    <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">
                                {[
                                    ['date', t('expenses.table.date')],
                                    ['type', t('expenses.table.type')],
                                    ['campaign', t('expenses.table.campaign')],
                                    ['link', t('expenses.table.link')],
                                    ['amountIQD', t('expenses.table.amountIQD')],
                                    ['createdBy', t('common.createdBy')]
                                ].map(([column, label]) => (
                                    <th
                                        key={column}
                                        onClick={() => handleSort(column)}
                                        className="px-6 py-4 cursor-pointer select-none"
                                    >
                                        <div className="flex items-center gap-2">
                                            {label}
                                            {sortConfig.column === column && (
                                                <span className="text-accent">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                                <th className="px-6 py-4">{t('expenses.table.attachments')}</th>
                                <th className="px-6 py-4 text-end">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {visibleExpenses.map((expense) => (
                                <tr key={expense._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40">
                                    <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {parseDateSafe(expense.date) ? format(parseDateSafe(expense.date), 'yyyy MMM dd') : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">{expense.type || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">{expense.campaign || '-'}</td>
                                    <td className="px-6 py-4 text-sm">
                                        {expense.link ? (
                                            <a href={expense.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent font-semibold hover:underline">
                                                Open <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(expense.amountIQD || 0)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">{expense.createdBy || 'System'}</td>
                                    <td className="px-6 py-4 text-sm">
                                        {Array.isArray(expense.attachments) && expense.attachments.length > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                {expense.attachments.slice(0, 2).map((attachment, idx) => (
                                                    <a
                                                        key={`${expense._id}-${idx}`}
                                                        href={attachment.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-accent hover:underline truncate max-w-[180px]"
                                                    >
                                                        {attachment.name || `Attachment ${idx + 1}`}
                                                    </a>
                                                ))}
                                                {expense.attachments.length > 2 && (
                                                    <span className="text-xs text-slate-500">+{expense.attachments.length - 2} more</span>
                                                )}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(expense)}
                                                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleRequestDelete(expense)}
                                                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {visibleExpenses.length === 0 && (
                                <tr>
                                    <td colSpan="9" className="px-6 py-12 text-center text-slate-400">
                                        {t('expenses.noExpenses')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    </div>
                )}

                {isMobileView && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {visibleExpenses.map((expense) => (
                        <div key={expense._id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                                        {parseDateSafe(expense.date) ? format(parseDateSafe(expense.date), 'yyyy MMM dd') : '-'}
                                    </p>
                                    <p className="text-base font-black text-slate-900 dark:text-white">{expense.type || 'Other'}</p>
                                    <p className="text-sm text-slate-500">{expense.campaign || 'No campaign'}</p>
                                    <p className="text-xs text-slate-400">{t('common.createdBy')}: {expense.createdBy || 'System'}</p>
                                </div>
                                <p className="text-base font-black text-slate-900 dark:text-white">{formatCurrency(expense.amountIQD || 0)}</p>
                            </div>

                            {expense.link && (
                                <a href={expense.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent text-sm font-semibold">
                                    Open link <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}

                            {Array.isArray(expense.attachments) && expense.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {expense.attachments.map((attachment, idx) => (
                                        <a
                                            key={`${expense._id}-mobile-${idx}`}
                                            href={attachment.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-200"
                                        >
                                            {attachment.name || `File ${idx + 1}`}
                                        </a>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2">
                                <button onClick={() => openEditModal(expense)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleRequestDelete(expense)}
                                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {visibleExpenses.length === 0 && (
                        <div className="px-6 py-10 text-center text-slate-400">{t('expenses.noExpenses')}</div>
                    )}
                    </div>
                )}
            </div>

            {isTypeManagerOpen && (
                <ExpenseTypeManagerModal
                    expenseTypes={expenseTypes}
                    expenses={expenses}
                    onSaveTypes={saveExpenseTypes}
                    onClose={() => setIsTypeManagerOpen(false)}
                />
            )}

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setExpenseToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title={t('common.delete')}
                message={t('common.confirmDelete')}
            />

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-2 sm:p-4 custom-scrollbar">
                    <div
                        ref={expenseDialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="expense-modal-title"
                        tabIndex={-1}
                        className="my-4 flex max-h-[92vh] w-full max-w-[980px] flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
                    >
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h3 id="expense-modal-title" className="text-xl font-black text-slate-800 dark:text-white">
                                {editingExpenseId ? t('expenses.editExpense') : t('expenses.newExpense')}
                            </h3>
                            <button type="button" aria-label={t('common.close') || 'Close'} onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">X</button>
                        </div>
                        <form onSubmit={handleSaveExpense} className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 lg:px-8 pt-7 sm:pt-8 pb-6 sm:pb-8 space-y-5 sm:space-y-6 custom-scrollbar">
                            {((showValidationErrors && hasFormErrors) || uploadError) && (
                                <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold">
                                    {uploadError || Object.values(formErrors)[0]}
                                </div>
                            )}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                                <div className="space-y-2">
                                    <AppDatePicker
                                        value={form.date}
                                        onChange={(nextDate) => setForm((prev) => ({ ...prev, date: nextDate }))}
                                        ariaLabel={t('expenses.table.date')}
                                        placeholder={t('expenses.table.date')}
                                        maxDate={new Date()}
                                        allowClear
                                        showToday
                                        hasError={Boolean(showValidationErrors && formErrors.date)}
                                    />
                                    <input type="hidden" value={form.date} required readOnly />
                                    {showValidationErrors && formErrors.date && <p className="text-[10px] font-semibold text-red-500">{formErrors.date}</p>}
                                </div>

                                <div className="space-y-2">
                                    <SearchableSelect
                                        title="Type"
                                        options={expenseTypes.map((type) => ({ value: type, label: type }))}
                                        selectedValue={form.type}
                                        onChange={(value) => setForm((prev) => ({
                                            ...prev,
                                            type: value,
                                            socialPlatform: SOCIAL_PLATFORM_TYPES.has(value) ? (prev.socialPlatform || 'Facebook') : ''
                                        }))}
                                        icon={Tag}
                                        showSearch={false}
                                    />
                                    {showValidationErrors && formErrors.type && <p className="text-[10px] font-semibold text-red-500">{formErrors.type}</p>}
                                </div>
                                <div className="space-y-1">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={form.amountIQD}
                                        onKeyDown={preventInvalidIntegerKey}
                                        onChange={(e) => setForm((prev) => ({ ...prev, amountIQD: sanitizePositiveIntegerInput(e.target.value) }))}
                                        aria-invalid={Boolean(showValidationErrors && formErrors.amountIQD)}
                                        aria-label="Amount in IQD"
                                        className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-900 ${
                                            showValidationErrors && formErrors.amountIQD
                                                ? 'border-red-500 text-red-500 ring-4 ring-red-500/10'
                                                : 'border-slate-200 dark:border-slate-700'
                                        }`}
                                        placeholder="Amount in IQD"
                                        required
                                    />
                                    {showValidationErrors && formErrors.amountIQD && <p className="text-[10px] font-semibold text-red-500">{formErrors.amountIQD}</p>}
                                </div>
                                <div className="space-y-1">
                                    <input type="text" value={form.campaign} onChange={(e) => setForm((prev) => ({ ...prev, campaign: e.target.value }))} aria-label="Campaign" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" placeholder="Campaign" />
                                </div>
                                {SOCIAL_PLATFORM_TYPES.has(form.type) && (
                                    <div className="space-y-2">
                                        <SearchableSelect
                                            title="Platform"
                                            options={[
                                                { value: 'Facebook', label: 'Facebook' },
                                                { value: 'Instagram', label: 'Instagram' },
                                                { value: 'Tiktok', label: 'Tiktok' }
                                            ]}
                                            selectedValue={form.socialPlatform || 'Facebook'}
                                            onChange={(value) => setForm((prev) => ({ ...prev, socialPlatform: value }))}
                                            icon={Tag}
                                            showSearch={false}
                                        />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Link2 className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="url"
                                            value={form.link}
                                            onChange={(e) => setForm((prev) => ({ ...prev, link: e.target.value }))}
                                            aria-invalid={Boolean(showValidationErrors && formErrors.link)}
                                            aria-label="Link URL"
                                            className={`w-full ps-9 pe-3 py-2.5 rounded-xl border bg-white dark:bg-slate-900 ${
                                                showValidationErrors && formErrors.link
                                                    ? 'border-red-500 text-red-500 ring-4 ring-red-500/10'
                                                    : 'border-slate-200 dark:border-slate-700'
                                            }`}
                                            placeholder="https://..."
                                            required
                                        />
                                    </div>
                                    {showValidationErrors && formErrors.link && <p className="text-[10px] font-semibold text-red-500">{formErrors.link}</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label
                                    onDragEnter={(event) => {
                                        event.preventDefault();
                                        setDragActive(true);
                                    }}
                                    onDragOver={(event) => {
                                        event.preventDefault();
                                        setDragActive(true);
                                    }}
                                    onDragLeave={(event) => {
                                        event.preventDefault();
                                        if (event.currentTarget.contains(event.relatedTarget)) return;
                                        setDragActive(false);
                                    }}
                                    onDrop={handleFileDrop}
                                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                                        dragActive
                                            ? 'border-accent bg-accent/5'
                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                                    }`}
                                >
                                    <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                                        {newFiles.length > 0 ? `${newFiles.length} file(s) ready` : 'Upload receipts or invoices (image/PDF)'}
                                    </span>
                                    <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-200">Browse</span>
                                    <input type="file" accept={SUPPORTED_ATTACHMENT_TYPES.join(',')} multiple onChange={handleFileInputChange} aria-label="Choose files" className="hidden" />
                                </label>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Drag & drop supported. Max 6MB per file.</p>

                                {uploadQueue.length > 0 && (
                                    <div className="space-y-2 max-h-32 overflow-y-auto pe-1 custom-scrollbar">
                                        {uploadQueue.map((item) => (
                                            <div key={item.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{item.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-slate-400">{formatBytes(item.size)}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeQueuedFile(item.id)}
                                                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500"
                                                        >
                                                            x
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${item.status === 'error' ? 'bg-red-500' : 'bg-accent'}`}
                                                        style={{ width: `${item.progress || 0}%` }}
                                                    />
                                                </div>
                                                {item.message && (
                                                    <p className="mt-1 text-[10px] font-semibold text-red-500">{item.message}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {form.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {form.attachments.map((attachment, idx) => (
                                            <span key={`form-att-${idx}`} className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs">
                                                <a href={attachment.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{attachment.name || `File ${idx + 1}`}</a>
                                                <button type="button" onClick={() => removeAttachmentFromForm(idx)} className="text-red-500">x</button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <textarea rows={3} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} aria-label="Notes" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 resize-none" placeholder="Notes" />
                            <div className="sticky bottom-0 pt-4 pb-2 border-t border-slate-100 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
                                <button type="submit" disabled={saving || uploadQueue.some((item) => item.status === 'error')} className="w-full px-5 py-3 rounded-xl text-white font-bold bg-accent shadow-accent disabled:opacity-60">{saving ? 'Saving...' : (editingExpenseId ? t('expenses.updateExpense') : t('expenses.createExpense'))}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Expenses;
