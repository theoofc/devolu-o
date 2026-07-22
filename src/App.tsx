import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Package,
  User as UserIcon,
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Box,
  RotateCcw,
  X,
  Search,
  ChevronRight,
  ClipboardList,
  Check,
  Edit2,
  Download,
  Calendar,
  Save,
  Camera,
  Tag,
  Layers,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  LogIn,
  LogOut,
  FileText,
  MessageSquare,
  Send,
  Shield,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { ReturnRecord, ReturnFormState, User, Requisition, UserRole } from "./types";
import { TratativaCard } from "./components/TratativaCard";

// Base64 SVGs to simulate 3 default product return photos for quick-testing
const TEST_PHOTOS = [
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300' fill='%2318181b'><rect width='400' height='300' rx='12' fill='%2318181b' stroke='%233f3f46' stroke-width='2'/><path d='M100,100 L300,100 L300,200 L100,200 Z' stroke='%23a1a1aa' stroke-width='2' fill='none'/><path d='M100,100 L200,150 L300,100' stroke='%233b82f6' stroke-width='2' fill='none'/><text x='50%25' y='80%25' dominant-baseline='middle' text-anchor='middle' fill='%23e4e4e7' font-family='sans-serif' font-size='12'>Foto 1: Caixa/Embalagem Danificada</text></svg>",
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300' fill='%2318181b'><rect width='400' height='300' rx='12' fill='%2318181b' stroke='%233f3f46' stroke-width='2'/><circle cx='200' cy='150' r='50' stroke='%23ef4444' stroke-width='2' fill='none'/><path d='M160,150 L240,150' stroke='%23ef4444' stroke-width='2'/><text x='50%25' y='80%25' dominant-baseline='middle' text-anchor='middle' fill='%23e4e4e7' font-family='sans-serif' font-size='12'>Foto 2: Defeito Estético no Produto</text></svg>",
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300' fill='%2318181b'><rect width='400' height='300' rx='12' fill='%2318181b' stroke='%233f3f46' stroke-width='2'/><path d='M150,80 L250,80 L250,180 L150,180 Z' stroke='%2310b981' stroke-width='2' fill='none'/><path d='M170,120 L230,120' stroke='%2310b981' stroke-width='2'/><path d='M170,140 L210,140' stroke='%2310b981' stroke-width='2'/><text x='50%25' y='80%25' dominant-baseline='middle' text-anchor='middle' fill='%23e4e4e7' font-family='sans-serif' font-size='12'>Foto 3: Etiqueta de Lacre/Código de Barras</text></svg>"
];

// Helper to compress uploaded images to lightweight crisp JPEGs
function compressImage(file: File, maxDimension = 1000, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => resolve(event.target?.result as string);
    };
    reader.onerror = () => resolve("");
  });
}

export default function App() {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [deletedReturns, setDeletedReturns] = useState<ReturnRecord[]>([]);
  const [viewTab, setViewTab] = useState<"active" | "tratativa" | "deleted">("active");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(""); // Format "YYYY-MM"
  const [sealedFilter, setSealedFilter] = useState<"all" | "sealed" | "open">("all");
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>(""); // Filter in Tratativa tab
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("current_user");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Requisitions State
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [selectedReqReturn, setSelectedReqReturn] = useState<ReturnRecord | null>(null);
  const [reqMessage, setReqMessage] = useState("");
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);
  const [showInboxModal, setShowInboxModal] = useState(false);
  const [gustavoAnswerMap, setGustavoAnswerMap] = useState<{ [reqId: string]: string }>({});
  const [isAnsweringReqId, setIsAnsweringReqId] = useState<string | null>(null);

  // Delete Confirmation Modal States
  const [deleteConfirmReturn, setDeleteConfirmReturn] = useState<ReturnRecord | null>(null);
  const [permanentDeleteConfirmReturn, setPermanentDeleteConfirmReturn] = useState<ReturnRecord | null>(null);
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState<boolean>(false);

  // User Permissions Helpers
  const role = currentUser?.role;
  const canDelete = role === "admin";
  const canAddReturn = role === "admin";
  const canEdit = role === "admin" || role === "felipe" || role === "administrativo";
  const canCreateReq = Boolean(currentUser);
  const canRespondReq = role === "admin";

  const isViewAllowed = (tab: "active" | "tratativa" | "deleted") => {
    if (!currentUser) return false;
    if (role === "admin") return true;
    if (role === "felipe") return tab === "active" || tab === "tratativa";
    if (role === "fernanda") return tab === "active";
    if (role === "administrativo") return tab === "active" || tab === "tratativa";
    return false;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editCameraInputRef = useRef<HTMLInputElement>(null);

  // Edit Mode States
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{
    itemCode: string;
    clientName: string;
    isSealed: boolean;
    causeDescription: string;
    images: string[];
    supplierCode?: string;
    productName?: string;
    quantity?: number;
  }>({
    itemCode: "",
    clientName: "",
    isSealed: true,
    causeDescription: "",
    images: [],
    supplierCode: "",
    productName: "",
    quantity: 1
  });

  // Form State
  const [form, setForm] = useState<ReturnFormState>({
    itemCode: "",
    clientName: "",
    isSealed: true,
    causeDescription: "",
    supplierCode: "",
    productName: "",
    quantity: 1
  });

  // Loaded photos as base64 strings
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Load data & set up real-time auto-polling every 3s
  useEffect(() => {
    fetchReturns();
    fetchDeletedReturns();
    fetchRequisitions();

    const interval = setInterval(() => {
      fetchReturns();
      fetchDeletedReturns();
      fetchRequisitions();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchRequisitions = async () => {
    try {
      const res = await fetch("/api/requisitions");
      if (res.ok) {
        const data = await res.json();
        setRequisitions(data);
      }
    } catch (err) {
      console.warn("Falha ao buscar requisições:", err);
    }
  };

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    const userToSubmit = customUser !== undefined ? customUser : loginUsername;
    const passToSubmit = customPass !== undefined ? customPass : loginPassword;

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userToSubmit, password: passToSubmit })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        localStorage.setItem("current_user", JSON.stringify(data.user));
        if (data.user.role === "fernanda") setViewTab("active");
        setLoginUsername("");
        setLoginPassword("");
      } else {
        setLoginError(data.error || "Usuário ou senha incorretos.");
      }
    } catch (err) {
      setLoginError("Erro ao conectar com o servidor.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("current_user");
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqReturn || !reqMessage.trim() || !currentUser) return;

    setIsSubmittingReq(true);
    try {
      const res = await fetch("/api/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnId: selectedReqReturn.id,
          itemCode: selectedReqReturn.itemCode,
          clientName: selectedReqReturn.clientName,
          createdBy: currentUser.name,
          message: reqMessage.trim()
        })
      });

      if (res.ok) {
        setReqMessage("");
        await fetchRequisitions();
      }
    } catch (err) {
      console.error("Erro ao enviar requisição:", err);
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleAnswerRequisition = async (reqId: string) => {
    const answerText = gustavoAnswerMap[reqId];
    if (!answerText || !answerText.trim() || !currentUser) return;

    setIsAnsweringReqId(reqId);
    try {
      const res = await fetch(`/api/requisitions/${reqId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: answerText.trim(),
          answeredBy: currentUser.name
        })
      });

      if (res.ok) {
        setGustavoAnswerMap((prev) => ({ ...prev, [reqId]: "" }));
        await fetchRequisitions();
      }
    } catch (err) {
      console.error("Erro ao enviar resposta:", err);
    } finally {
      setIsAnsweringReqId(null);
    }
  };

  const fetchReturns = async (retries = 5, delay = 500) => {
    try {
      const response = await fetch("/api/returns");
      if (response.ok) {
        const data = await response.json();
        setReturns(data);
      } else {
        if (retries > 0) {
          setTimeout(() => fetchReturns(retries - 1, delay * 1.5), delay);
        }
      }
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => fetchReturns(retries - 1, delay * 1.5), delay);
      } else {
        console.warn("Devoluções indisponíveis no servidor no momento.", err);
      }
    }
  };

  const fetchDeletedReturns = async (retries = 5, delay = 500) => {
    try {
      const response = await fetch("/api/deleted-returns");
      if (response.ok) {
        const data = await response.json();
        setDeletedReturns(data);
      } else {
        if (retries > 0) {
          setTimeout(() => fetchDeletedReturns(retries - 1, delay * 1.5), delay);
        }
      }
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => fetchDeletedReturns(retries - 1, delay * 1.5), delay);
      } else {
        console.warn("Lixeira indisponível no servidor no momento.", err);
      }
    }
  };

  // Restore a deleted return from trash back to active list
  const handleRestoreReturn = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/deleted-returns/${id}/restore`, {
        method: "POST"
      });
      if (response.ok) {
        await fetchReturns();
        await fetchDeletedReturns();
        if (selectedReturn?.id === id) {
          setSelectedReturn(null);
        }
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao restaurar devolução.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao restaurar devolução.");
    } finally {
      setIsLoading(false);
    }
  };

  // Permanently delete a single item from trash
  const handlePermanentlyDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/deleted-returns/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setDeletedReturns((prev) => prev.filter((r) => r.id !== id));
        if (selectedReturn?.id === id) {
          setSelectedReturn(null);
        }
        setPermanentDeleteConfirmReturn(null);
      } else {
        const data = await response.json();
        setErrorMsg(data.error || "Erro ao excluir permanentemente o item.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro ao conectar com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  // Purge all items from trash
  const handlePurgeTrash = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/deleted-returns/purge", {
        method: "POST"
      });
      if (response.ok) {
        setDeletedReturns([]);
        if (selectedReturn && deletedReturns.some((r) => r.id === selectedReturn.id)) {
          setSelectedReturn(null);
        }
        setPurgeConfirmOpen(false);
      } else {
        const data = await response.json();
        setErrorMsg(data.error || "Erro ao esvaziar a lixeira.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro de conexão ao esvaziar a lixeira.");
    } finally {
      setIsLoading(false);
    }
  };

  // Memoized available months computed from real return records
  const availableMonths = React.useMemo(() => {
    const monthsMap: Record<string, string> = {};
    returns.forEach((r) => {
      if (!r.createdAt) return;
      const date = new Date(r.createdAt);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      
      const name = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
      monthsMap[key] = formattedName;
    });
    return Object.entries(monthsMap).sort((a, b) => b[0].localeCompare(a[0]));
  }, [returns]);

  // Product summary aggregation for Tratativa tab (groups violated packages by product)
  const productSummary = useMemo(() => {
    const violated = returns.filter((r) => !r.isSealed);
    const map = new Map<string, {
      productName: string;
      supplierCodes: string[];
      totalQuantity: number;
      packageCount: number;
    }>();

    violated.forEach((r) => {
      const pName = (r.productName && r.productName.trim()) ? r.productName.trim() : "Sem Nome Definido";
      const existing = map.get(pName) || {
        productName: pName,
        supplierCodes: [],
        totalQuantity: 0,
        packageCount: 0
      };

      if (r.supplierCode && r.supplierCode.trim() && !existing.supplierCodes.includes(r.supplierCode.trim())) {
        existing.supplierCodes.push(r.supplierCode.trim());
      }

      existing.totalQuantity += (r.quantity || 1);
      existing.packageCount += 1;
      map.set(pName, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [returns]);

  // Handle Edit Action Setup
  const handleStartEditing = (record: ReturnRecord) => {
    setEditForm({
      itemCode: record.itemCode,
      clientName: record.clientName,
      isSealed: record.isSealed,
      causeDescription: record.causeDescription,
      images: record.images || [],
      supplierCode: record.supplierCode || "",
      productName: record.productName || "",
      quantity: record.quantity || 1
    });
    setIsEditing(true);
  };

  // Quick save for Tratativa fields (Supplier code, product name, quantity)
  const handleSaveTratativaItem = async (
    id: string,
    supplierCode: string,
    productName: string,
    quantity: number
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/returns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierCode: supplierCode.trim(),
          productName: productName.trim(),
          quantity: Number(quantity) || 1
        })
      });

      if (response.ok) {
        const updatedRecord = await response.json();
        setReturns((prev) => prev.map((r) => (r.id === id ? updatedRecord : r)));
        if (selectedReturn?.id === id) {
          setSelectedReturn(updatedRecord);
        }
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao salvar tratativa no servidor.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao salvar a tratativa.");
    } finally {
      setIsLoading(false);
    }
  };

  // Update a return record via backend PUT API
  const handleUpdateReturn = async (id: string) => {
    if (!editForm.itemCode.trim() && !editForm.clientName.trim()) {
      alert("É necessário preencher o código do item ou o nome do cliente.");
      return;
    }
    if (!editForm.causeDescription.trim()) {
      alert("É necessário preencher a descrição da causa.");
      return;
    }
    if (editForm.images.length < 3) {
      alert("É necessário manter pelo menos 3 fotos na vistoria.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/returns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        const updatedRecord = await response.json();
        setReturns((prev) => prev.map((r) => (r.id === id ? updatedRecord : r)));
        setSelectedReturn(updatedRecord);
        setIsEditing(false);
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao salvar alterações no servidor.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao salvar alterações.");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a return record (moves to trash)
  const handleDeleteReturn = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/returns/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setReturns((prev) => prev.filter((r) => r.id !== id));
        if (selectedReturn?.id === id) {
          setSelectedReturn(null);
        }
        setIsEditing(false);
        setDeleteConfirmReturn(null);
        await fetchDeletedReturns();
      } else {
        const data = await response.json();
        setErrorMsg(data.error || "Erro ao excluir devolução do servidor.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro de conexão ao excluir devolução.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to trigger direct client download of a base64 string image
  const handleDownloadPhoto = (base64Data: string, index: number, returnId: string) => {
    try {
      const isSvg = base64Data.startsWith("data:image/svg");
      const extension = isSvg ? "svg" : "jpg";
      const link = document.createElement("a");
      link.href = base64Data;
      link.download = `devolucao_${returnId}_foto_${index + 1}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erro ao baixar foto:", err);
      alert("Erro ao realizar o download do arquivo de imagem.");
    }
  };

  // Helper to trigger download of all photos inside a ZIP file within a random folder name
  const handleDownloadAllAsZip = async (record: ReturnRecord) => {
    if (!record.images || record.images.length === 0) {
      alert("Não há imagens disponíveis para download.");
      return;
    }

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Create a folder with a random alphanumeric string to fulfill the requirement
      const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
      const folderName = `VISTORIA_${record.id}_${randomString}`;
      const folder = zip.folder(folderName);

      if (!folder) {
        throw new Error("Falha ao criar diretório temporário no arquivo ZIP.");
      }

      // Process and add all base64 images to the folder
      record.images.forEach((base64Data, idx) => {
        const matches = base64Data.match(/^data:image\/([a-zA-Z+0-9]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const extension = matches[1] === "svg+xml" ? "svg" : matches[1];
          const rawBase64 = matches[2];
          folder.file(`foto_${idx + 1}.${extension}`, rawBase64, { base64: true });
        } else {
          // Plain XML SVGs or other fallback format handling
          if (base64Data.startsWith("data:image/svg+xml;utf8,")) {
            const svgContent = decodeURIComponent(base64Data.split("data:image/svg+xml;utf8,")[1]);
            folder.file(`foto_${idx + 1}.svg`, svgContent);
          } else {
            folder.file(`foto_${idx + 1}.jpg`, base64Data);
          }
        }
      });

      // Generate zip and trigger user download
      const content = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Revoke URL to prevent memory leaks
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (err) {
      console.error("Erro ao criar pacote ZIP:", err);
      alert("Erro ao gerar o arquivo ZIP compactado.");
    }
  };

  // Simulate returns data in 1 click
  const handleSimulateTest = (type: "defeito" | "arrependimento") => {
    if (type === "defeito") {
      setForm({
        itemCode: "ECOM-98231",
        clientName: "Rodrigo Mendonça",
        isSealed: false,
        causeDescription: "O produto apresenta marcas de uso na carcaça. A embalagem foi violada durante o transporte.",
        supplierCode: "FORN-8821",
        productName: "Bloco 100 peças",
        quantity: 10
      });
    } else {
      setForm({
        itemCode: "VEST-44120",
        clientName: "Mariana Alencar",
        isSealed: true,
        causeDescription: "Cliente desistiu da compra por arrependimento de tamanho. O casaco ficou muito largo nos ombros e ela optou pelo estorno direto do valor.",
        supplierCode: "",
        productName: "",
        quantity: 1
      });
    }
    setUploadedImages(TEST_PHOTOS);
    setErrorMsg(null);
  };

  // Handle image files select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    for (const file of fileList) {
      try {
        const compressedBase64 = await compressImage(file as File);
        if (compressedBase64) {
          setUploadedImages((prev) => [...prev, compressedBase64]);
        }
      } catch (err) {
        console.error("Erro ao processar imagem:", err);
      }
    }

    // Reset input values to allow selecting same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  // Handle edit image files select
  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    for (const file of fileList) {
      try {
        const compressedBase64 = await compressImage(file as File);
        if (compressedBase64) {
          setEditForm((prev) => ({
            ...prev,
            images: [...prev.images, compressedBase64]
          }));
        }
      } catch (err) {
        console.error("Erro ao processar imagem na edição:", err);
      }
    }

    // Reset input values to allow selecting same file again if needed
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
    if (editCameraInputRef.current) {
      editCameraInputRef.current.value = "";
    }
  };

  // Remove photo from selection
  const removeUploadedImage = (indexToRemove: number) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Clear Form
  const clearForm = () => {
    setForm({
      itemCode: "",
      clientName: "",
      isSealed: true,
      causeDescription: "",
      supplierCode: "",
      productName: "",
      quantity: 1
    });
    setUploadedImages([]);
    setErrorMsg(null);
  };

  // Reset database (for dev sandbox testing)
  const handleResetDatabase = async () => {
    if (confirm("Deseja realmente limpar todo o histórico de devoluções?")) {
      try {
        const res = await fetch("/api/returns/reset", { method: "POST" });
        if (res.ok) {
          setReturns([]);
          setSelectedReturn(null);
        }
      } catch (err) {
        console.error("Falha ao resetar banco:", err);
      }
    }
  };

  // Submit return registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!canAddReturn) {
      setErrorMsg("Apenas administradores (Gustavo) têm permissão para registrar novas devoluções.");
      return;
    }

    // Validate Item Code or Client Name
    if (!form.itemCode.trim() && !form.clientName.trim()) {
      setErrorMsg("Você precisa fornecer o Código do Item ou o Nome do Cliente.");
      return;
    }

    // Validate Description
    if (!form.causeDescription.trim()) {
      setErrorMsg("Por favor, descreva brevemente a causa da devolução.");
      return;
    }

    // Validate 3 photos minimum
    if (uploadedImages.length < 3) {
      setErrorMsg(`Por favor, adicione no mínimo 3 fotos para vistoria física (Enviadas: ${uploadedImages.length}/3).`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemCode: form.itemCode.trim(),
          clientName: form.clientName.trim(),
          isSealed: form.isSealed,
          causeDescription: form.causeDescription.trim(),
          images: uploadedImages,
          supplierCode: form.supplierCode?.trim() || "",
          productName: form.productName?.trim() || "",
          quantity: form.quantity || 1
        })
      });

      if (response.ok) {
        const newReturn = await response.json();
        setReturns((prev) => [newReturn, ...prev]);
        setSelectedReturn(newReturn); // Open detailed view instantly for high-productivity audit
        clearForm();
      } else {
        const data = await response.json();
        setErrorMsg(data.error || "Houve uma falha ao enviar os dados para registro.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro de conexão com o servidor. Verifique a rede e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filtering returns (search by package code/id, item code, or client name, filter by month & status)
  const filteredReturns = returns.filter((r) => {
    // 1. Sealed / Open status filter
    if (sealedFilter === "sealed" && !r.isSealed) return false;
    if (sealedFilter === "open" && r.isSealed) return false;

    // 2. Month filter if selected
    if (selectedMonth && r.createdAt) {
      const date = new Date(r.createdAt);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      if (key !== selectedMonth) return false;
    }

    // 3. Search query filter
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (r.id && r.id.toLowerCase().includes(query)) ||
      (r.itemCode && r.itemCode.toLowerCase().includes(query)) ||
      (r.clientName && r.clientName.toLowerCase().includes(query)) ||
      (r.causeDescription && r.causeDescription.toLowerCase().includes(query))
    );
  });

  // Filtering deleted returns for trash view
  const filteredDeletedReturns = deletedReturns.filter((r) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (r.id && r.id.toLowerCase().includes(query)) ||
      (r.itemCode && r.itemCode.toLowerCase().includes(query)) ||
      (r.clientName && r.clientName.toLowerCase().includes(query)) ||
      (r.causeDescription && r.causeDescription.toLowerCase().includes(query))
    );
  });

  // Calculate pending requisitions for badge
  const pendingRequisitionsCount = requisitions.filter((r) => r.status === "Pendente").length;

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#E0E0E0] flex font-sans relative" id="app_root">
      
      {/* LOGIN OVERLAY SCREEN IF NOT LOGGED IN */}
      {!currentUser && (
        <div className="fixed inset-0 z-50 bg-[#0A0B0E]/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121418] border border-[#262A31] rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Shield size={24} />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Acesso ao Sistema Logístico</h1>
              <p className="text-xs text-zinc-400">Insira suas credenciais para acessar os módulos de devoluções.</p>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={(e) => handleLogin(e)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <UserIcon size={14} className="text-zinc-500" /> Usuário
                </label>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Seu usuário"
                  className="w-full bg-[#0A0B0E] border border-[#262A31] focus:border-indigo-500 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Lock size={14} className="text-zinc-500" /> Senha
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full bg-[#0A0B0E] border border-[#262A31] focus:border-indigo-500 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 mt-1"
              >
                {isLoggingIn ? (
                  <span>Entrando...</span>
                ) : (
                  <>
                    <LogIn size={15} />
                    <span>Entrar no Sistema</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Navigation Sidebar */}
      <aside className="w-64 bg-[#121418] border-r border-[#262A31] hidden md:flex flex-col shrink-0">
        <div className="p-8">
          <h1 className="text-2xl font-light tracking-tighter text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.6)]"></span>
            Devoluções
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {isViewAllowed("active") && (
            <button
              onClick={() => {
                setViewTab("active");
                setSearchQuery("");
                setSelectedMonth("");
                setSealedFilter("all");
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors cursor-pointer ${
                viewTab === "active"
                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-medium"
                  : "text-zinc-400 hover:text-white hover:bg-[#1A1D24] border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Box size={18} />
                <span>Devoluções Ativas</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#1A1D24] text-zinc-400 font-mono">
                {returns.length}
              </span>
            </button>
          )}

          {isViewAllowed("tratativa") && (
            <button
              onClick={() => {
                setViewTab("tratativa");
                setSearchQuery("");
                setSelectedMonth("");
                setSealedFilter("all");
                setSelectedProductFilter("");
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors cursor-pointer ${
                viewTab === "tratativa"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20 font-medium"
                  : "text-zinc-400 hover:text-white hover:bg-[#1A1D24] border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-amber-500" />
                <span>Área de Tratativa</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold">
                {returns.filter(r => !r.isSealed).length}
              </span>
            </button>
          )}

          {isViewAllowed("deleted") && (
            <button
              onClick={() => {
                setViewTab("deleted");
                setSearchQuery("");
                setSelectedMonth("");
                setSealedFilter("all");
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors cursor-pointer ${
                viewTab === "deleted"
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20 font-medium"
                  : "text-zinc-400 hover:text-white hover:bg-[#1A1D24] border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Trash2 size={18} />
                <span>Área de Excluídos</span>
              </div>
              {deletedReturns.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-mono font-bold">
                  {deletedReturns.length}
                </span>
              )}
            </button>
          )}
          
          <div className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-6">Filtros Rápidos</div>
          
          <button 
            onClick={() => {
              setViewTab("active");
              setSealedFilter(sealedFilter === "sealed" ? "all" : "sealed");
            }}
            className={`w-full flex items-center gap-2 px-4 py-2 text-left rounded-lg text-xs transition-colors cursor-pointer ${
              viewTab === "active" && sealedFilter === "sealed" 
                ? "text-indigo-400 bg-indigo-500/5 border border-indigo-500/10" 
                : "text-zinc-400 hover:text-white hover:bg-[#1A1D24] border-transparent"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Itens Lacrados ({returns.filter(r => r.isSealed).length})
          </button>

          <button 
            onClick={() => {
              setViewTab("active");
              setSealedFilter(sealedFilter === "open" ? "all" : "open");
            }}
            className={`w-full flex items-center gap-2 px-4 py-2 text-left rounded-lg text-xs transition-colors cursor-pointer ${
              viewTab === "active" && sealedFilter === "open" 
                ? "text-indigo-400 bg-indigo-500/5 border border-indigo-500/10" 
                : "text-zinc-400 hover:text-white hover:bg-[#1A1D24] border-transparent"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Embalagens Violadas ({returns.filter(r => !r.isSealed).length})
          </button>
        </nav>
        
        {/* Reset database button in sidebar (Only Admin) */}
        {role === "admin" && (
          <div className="p-4 border-t border-[#262A31]">
            {returns.length > 0 && (
              <button
                onClick={handleResetDatabase}
                className="w-full px-3 py-2 rounded-lg border border-zinc-800 hover:bg-[#1C1F26] text-xs text-zinc-500 hover:text-rose-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw size={13} />
                Limpar Todos os Registros
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header */}
        <header className="h-16 border-b border-[#262A31] flex items-center justify-between px-6 sm:px-10 bg-[#0D0F13] shrink-0">
          <span className="text-xs sm:text-sm text-gray-400 font-light flex items-center gap-2">
            Início <ChevronRight size={12} className="text-zinc-600" /> Registro & Pesquisa de Devoluções
          </span>
          {currentUser && (
            <div className="flex items-center gap-3">
              {/* Gustavo Requisitions Inbox Button */}
              {canRespondReq && (
                <button
                  type="button"
                  onClick={() => setShowInboxModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer relative"
                  title="Ver Central de Requisições"
                >
                  <MessageSquare size={14} className="text-indigo-400" />
                  <span>Requisições</span>
                  {pendingRequisitionsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
                      {pendingRequisitionsCount}
                    </span>
                  )}
                </button>
              )}

              {/* User Profile Badge */}
              <div className="flex items-center gap-2 bg-[#121418] border border-[#262A31] px-3 py-1.5 rounded-xl">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black ${
                  role === "admin" ? "bg-indigo-400" :
                  role === "felipe" ? "bg-amber-400" :
                  role === "fernanda" ? "bg-emerald-400" : "bg-purple-400"
                }`}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-white leading-tight">{currentUser.name}</span>
                  <span className="text-[9px] text-zinc-400 capitalize">{role}</span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                title="Sair do sistema"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </header>


        {/* Content Area */}
        <div className="flex-1 p-4 sm:p-8 flex flex-col gap-6 max-w-7xl w-full mx-auto">
          
          {/* Main Info Strip for small screens / actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#262A31] md:hidden">
            <div>
              <h1 className="text-xl font-bold text-white">
                Controle de Devoluções
              </h1>
              <p className="text-xs text-zinc-400">Sistema de Recebimento & Logística Reversa</p>
            </div>
            {returns.length > 0 && (
              <button
                onClick={handleResetDatabase}
                className="px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-[#1A1D24] text-xs text-zinc-400 transition-colors flex items-center gap-1.5"
                title="Limpar Histórico"
              >
                <RotateCcw size={13} />
                Limpar Banco
              </button>
            )}
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="dashboard_grid">
            
            {/* Left Column: Form Section (Only shown if user has permission to create returns and not in tratativa view) */}
            {canAddReturn && viewTab !== "tratativa" && (
              <section className="lg:col-span-5 bg-[#121418] border border-[#262A31] rounded-2xl p-5 sm:p-6 flex flex-col gap-5" id="form_section">
                <div className="flex justify-between items-center border-b border-[#262A31] pb-3">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <ClipboardList size={16} className="text-indigo-400" />
                    Novo Registro de Recebimento
                  </h2>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Manual</span>
                </div>

              {/* Simulated fast buttons for seamless developer sandbox testing */}
              <div className="bg-[#0A0B0E] p-3 rounded-xl border border-[#262A31] flex flex-col gap-2">
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Simulador de Entrada Rápida (Testes):</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateTest("defeito")}
                    className="px-2.5 py-1.5 rounded bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-[11px] text-rose-300 font-medium transition-all text-left flex flex-col justify-between cursor-pointer"
                    id="simulate_defect_button"
                  >
                    <span className="text-[10px] text-rose-400/70 font-normal">Caso 1</span>
                    <span>Item Aberto / Defeito</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateTest("arrependimento")}
                    className="px-2.5 py-1.5 rounded bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/30 text-[11px] text-emerald-300 font-medium transition-all text-left flex flex-col justify-between cursor-pointer"
                    id="simulate_change_mind_button"
                  >
                    <span className="text-[10px] text-emerald-400/70 font-normal">Caso 2</span>
                    <span>Item Lacrado / Estoque</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4" id="returns_form">
                
                {/* Client and Code fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] uppercase text-zinc-400 font-semibold tracking-wider flex items-center gap-1">
                      <Package size={12} className="text-zinc-500" />
                      Cód. Item
                    </label>
                    <input
                      type="text"
                      value={form.itemCode}
                      onChange={(e) => setForm({ ...form, itemCode: e.target.value })}
                      placeholder="Ex: #4592"
                      className="w-full bg-[#0A0B0E] border border-[#262A31] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 transition-all font-mono"
                      id="input_item_code"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] uppercase text-zinc-400 font-semibold tracking-wider flex items-center gap-1">
                      <UserIcon size={12} className="text-zinc-500" />
                      Cliente
                    </label>
                    <input
                      type="text"
                      value={form.clientName}
                      onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                      placeholder="Ex: João Silva"
                      className="w-full bg-[#0A0B0E] border border-[#262A31] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 transition-all"
                      id="input_client_name"
                    />
                  </div>
                </div>

                {/* Toggle lacrado / aberto */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase text-zinc-400 font-semibold tracking-wider">
                    Estado da Embalagem
                  </label>
                  <div className="flex gap-2 p-1 bg-[#0A0B0E] rounded-lg border border-[#262A31]" id="sealed_toggle_container">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, isSealed: true })}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        form.isSealed
                          ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                      id="toggle_sealed_yes"
                    >
                      Lacrado
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, isSealed: false })}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        !form.isSealed
                          ? "bg-amber-600/90 text-white shadow-lg shadow-amber-600/10"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                      id="toggle_sealed_no"
                    >
                      Aberto / Violado
                    </button>
                  </div>
                </div>

                {/* Optional Tratativa Fields when package is violated */}
                {!form.isSealed && (
                  <div className="p-3 bg-[#0A0B0E] rounded-xl border border-amber-500/30 flex flex-col gap-2.5" id="form_tratativa_section">
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                      <AlertTriangle size={13} />
                      <span>Tratativa de Embalagem Violada</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase text-zinc-400 font-semibold">Cód. Fornecedor</label>
                        <input
                          type="text"
                          value={form.supplierCode || ""}
                          onChange={(e) => setForm({ ...form, supplierCode: e.target.value })}
                          placeholder="Ex: FORN-1029"
                          className="w-full bg-[#121418] border border-[#262A31] focus:border-amber-500 rounded px-2.5 py-1.5 text-xs text-white font-mono placeholder-zinc-600"
                          id="input_form_supplier_code"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase text-zinc-400 font-semibold">Nome do Produto</label>
                        <input
                          type="text"
                          value={form.productName || ""}
                          onChange={(e) => setForm({ ...form, productName: e.target.value })}
                          placeholder="Ex: Bloco 100 peças"
                          className="w-full bg-[#121418] border border-[#262A31] focus:border-amber-500 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-600"
                          id="input_form_product_name"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase text-zinc-400 font-semibold">Qtd. Separada</label>
                        <input
                          type="number"
                          min="1"
                          value={form.quantity || 1}
                          onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full bg-[#121418] border border-[#262A31] focus:border-amber-500 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                          id="input_form_quantity"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Description Causa */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase text-zinc-400 font-semibold tracking-wider">
                    Relato do Problema ou Causa da Devolução
                  </label>
                  <textarea
                    value={form.causeDescription}
                    onChange={(e) => setForm({ ...form, causeDescription: e.target.value })}
                    placeholder="Descreva detalhadamente as condições de recebimento do pacote..."
                    rows={3}
                    className="w-full bg-[#0A0B0E] border border-[#262A31] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 transition-all resize-none font-light"
                    id="textarea_cause_description"
                  />
                </div>

                {/* 3 Photos minimum component */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] uppercase text-zinc-400 font-semibold tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-zinc-500" />
                      Fotos do Pacote / Produto (Mínimo de 3)
                    </label>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                        uploadedImages.length >= 3
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                      id="photos_counter"
                    >
                      {uploadedImages.length} adicionadas
                    </span>
                  </div>

                  {/* Dropzone with Drag and Drop Support */}
                  <div
                    className="border border-dashed border-[#262A31] bg-[#0A0B0E] rounded-xl p-5 flex flex-col items-center justify-center gap-4 transition-all"
                    id="drag_drop_zone"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      multiple
                      accept="image/*"
                      className="hidden"
                      id="file_input"
                    />
                    <input
                      type="file"
                      ref={cameraInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      id="camera_input"
                    />
                    <div className="text-center flex flex-col items-center gap-1.5">
                      <div className="p-2 rounded-lg bg-[#121418] border border-[#262A31] text-indigo-400">
                        <Camera size={18} />
                      </div>
                      <p className="text-xs font-semibold text-zinc-300">Anexar fotos da vistoria</p>
                      <p className="text-[10px] text-zinc-500">Selecione pelo menos 3 imagens do pacote/produto</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm justify-center">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex-1 py-2 px-3 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        id="btn_take_photo"
                      >
                        <Camera size={13} />
                        <span>Tirar Foto (Câmera)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-2 px-3 bg-[#121418] border border-[#262A31] hover:border-zinc-700 hover:bg-[#1A1D24] text-zinc-300 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        id="btn_select_gallery"
                      >
                        <Upload size={13} className="text-zinc-400" />
                        <span>Escolher da Galeria</span>
                      </button>
                    </div>
                  </div>

                  {/* Previews */}
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-1" id="image_previews_grid">
                      {uploadedImages.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setLightboxImage(img);
                            setLightboxZoom(1);
                          }}
                          className="relative aspect-square rounded-xl border border-[#262A31] overflow-hidden group cursor-pointer bg-[#0A0B0E]"
                          title="Clique para ver imagem ampliada"
                        >
                          <img
                            src={img}
                            alt={`Upload ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 ease-out hover:scale-125"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none text-indigo-400">
                            <ZoomIn size={16} />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeUploadedImage(idx);
                            }}
                            className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-md transition-colors cursor-pointer z-10"
                            title="Remover Foto"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadedImages.length < 3 && (
                    <p className="text-[10px] text-rose-400 flex items-center gap-1 mt-0.5" id="photo_warning">
                      <AlertTriangle size={11} /> Faltam {3 - uploadedImages.length} fotos para atingir o requisito mínimo.
                    </p>
                  )}
                </div>

                {/* Error Box */}
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex gap-2 items-start" id="form_error_box">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Submit / Action buttons */}
                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={clearForm}
                    className="px-3 py-2 rounded-lg border border-[#262A31] hover:bg-[#1A1D24] text-xs text-zinc-400 font-medium transition-colors cursor-pointer"
                    id="clear_form_button"
                  >
                    Limpar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || uploadedImages.length < 3}
                    className={`flex-1 py-3.5 rounded-xl text-xs font-semibold text-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isLoading || uploadedImages.length < 3
                        ? "bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed"
                        : "bg-white hover:bg-gray-200 active:scale-[0.98]"
                    }`}
                    id="submit_return_button"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-3 w-3 text-black" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Registrando...
                      </>
                    ) : (
                      <>
                        Registrar Devolução
                        <Check size={14} />
                      </>
                    )}
                  </button>
                </div>

              </form>

            </section>
            )}

            {/* Right Column: List & Inspection View */}
            <section className={`${(viewTab === "tratativa" || !canAddReturn) ? "lg:col-span-12" : "lg:col-span-7"} bg-[#121418] border border-[#262A31] rounded-2xl p-5 sm:p-6 flex flex-col gap-5`} id="history_section">
              
              {/* View Tab Selector Header */}
              <div className="flex items-center justify-between border-b border-[#262A31] pb-3 gap-2 flex-wrap">
                <div className="flex items-center gap-2 p-1 bg-[#0A0B0E] rounded-xl border border-[#262A31]">
                  {isViewAllowed("active") && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewTab("active");
                        setSelectedReturn(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        viewTab === "active"
                          ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Box size={14} />
                      <span>Devoluções Ativas ({returns.length})</span>
                    </button>
                  )}

                  {isViewAllowed("tratativa") && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewTab("tratativa");
                        setSelectedReturn(null);
                        setSelectedProductFilter("");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        viewTab === "tratativa"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <AlertTriangle size={14} className="text-amber-500" />
                      <span>Área de Tratativa ({returns.filter(r => !r.isSealed).length})</span>
                    </button>
                  )}

                  {isViewAllowed("deleted") && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewTab("deleted");
                        setSelectedReturn(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        viewTab === "deleted"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Trash2 size={14} />
                      <span>Excluídos / Lixeira ({deletedReturns.length})</span>
                    </button>
                  )}
                </div>

                {viewTab === "deleted" && deletedReturns.length > 0 && canDelete && (
                  <button
                    type="button"
                    onClick={handlePurgeTrash}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Esvaziar Lixeira</span>
                  </button>
                )}
              </div>

              {/* View Tab = "active" Content */}
              {viewTab === "active" ? (
                <>
                  {/* Search and Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-white">
                        Histórico de Recebimentos Ativos
                      </h2>
                      <p className="text-[10px] text-zinc-400">Total: {returns.length} devoluções cadastradas</p>
                    </div>

                    {/* Search & Filter Row */}
                    <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto items-stretch sm:items-center">
                      
                      {/* Month Filter Dropdown */}
                      <div className="relative" id="month_filter_container">
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="w-full bg-[#0A0B0E] border border-[#262A31] focus:border-indigo-500 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white placeholder-zinc-500 transition-all font-light appearance-none cursor-pointer h-[32px] min-w-[130px]"
                          id="month_filter_select"
                        >
                          <option value="">Todos os meses</option>
                          {availableMonths.map(([key, name]) => (
                            <option key={key} value={key}>{name}</option>
                          ))}
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                          <Calendar size={12} />
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div className="relative w-full sm:w-64" id="search_bar_container">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Pesquisar por pacote, item, cliente..."
                          className="w-full bg-[#0A0B0E] border border-[#262A31] focus:border-indigo-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 transition-all font-light h-[32px]"
                          title="Pesquise por código do pacote, código do item ou nome do cliente"
                          id="search_input"
                        />
                      </div>

                    </div>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-3 gap-3" id="quick_stats">
                    <div className="bg-[#0A0B0E] p-3 rounded-xl border border-[#262A31] flex flex-col gap-1">
                      <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Total Registrado</span>
                      <span className="text-lg font-semibold text-indigo-400 font-mono">
                        {returns.length}
                      </span>
                      <span className="text-[9px] text-zinc-500">Devoluções</span>
                    </div>
                    <div className="bg-[#0A0B0E] p-3 rounded-xl border border-[#262A31] flex flex-col gap-1">
                      <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Itens Lacrados</span>
                      <span className="text-lg font-semibold text-emerald-400 font-mono">
                        {returns.filter(r => r.isSealed).length}
                      </span>
                      <span className="text-[9px] text-zinc-500">
                        {returns.length ? Math.round((returns.filter(r => r.isSealed).length / returns.length) * 100) : 0}% do total
                      </span>
                    </div>
                    <div className="bg-[#0A0B0E] p-3 rounded-xl border border-[#262A31] flex flex-col gap-1">
                      <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Embalagem Aberta</span>
                      <span className="text-lg font-semibold text-amber-500 font-mono">
                        {returns.filter(r => !r.isSealed).length}
                      </span>
                      <span className="text-[9px] text-zinc-500">
                        {returns.length ? Math.round((returns.filter(r => !r.isSealed).length / returns.length) * 100) : 0}% do total
                      </span>
                    </div>
                  </div>

                  {/* Active Returns List */}
                  <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1" id="returns_list">
                    {filteredReturns.length === 0 ? (
                      <div className="text-center py-12 bg-[#0A0B0E] border border-[#262A31] rounded-xl flex flex-col items-center justify-center gap-3">
                        <div className="p-3 bg-[#121418] rounded-full text-zinc-600 border border-[#262A31]">
                          <Package size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-400">Nenhuma devolução encontrada</p>
                          <p className="text-xs text-zinc-600 mt-0.5">Use a barra de pesquisa acima ou registre um novo caso.</p>
                        </div>
                      </div>
                    ) : (
                      filteredReturns.map((record) => {
                        const isSelected = selectedReturn?.id === record.id;
                        const dateString = new Date(record.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit"
                        });

                        const recommendedAction = record.isSealed 
                          ? "Retornar ao estoque de novos" 
                          : "Encaminhar para vistoria / assistência técnica";

                        const actionStyles = record.isSealed
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/10 border-amber-500/20 text-amber-400";

                        return (
                          <div
                            key={record.id}
                            onClick={() => setSelectedReturn(record)}
                            className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                              isSelected
                                ? "bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                                : "bg-[#0A0B0E] hover:bg-[#161920] border-[#262A31]"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                onClick={(e) => {
                                  if (record.images && record.images.length > 0) {
                                    e.stopPropagation();
                                    setLightboxImage(record.images[0]);
                                    setLightboxZoom(1);
                                  }
                                }}
                                className="w-11 h-11 rounded-lg border border-[#262A31] overflow-hidden shrink-0 bg-[#121418] flex items-center justify-center relative group cursor-pointer"
                                title="Clique para ver imagem ampliada"
                              >
                                {record.images && record.images.length > 0 ? (
                                  <>
                                    <img
                                      src={record.images[0]}
                                      alt="Item"
                                      className="w-full h-full object-cover transition-transform duration-300 ease-out hover:scale-125"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-indigo-400">
                                      <ZoomIn size={14} />
                                    </div>
                                  </>
                                ) : (
                                  <ImageIcon size={16} className="text-zinc-600" />
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-white font-mono">{record.id}</span>
                                  <span className="text-[10px] text-zinc-500">{dateString}</span>
                                </div>
                                
                                <div className="text-xs mt-1 text-zinc-300">
                                  <span className="font-medium text-zinc-400">Cliente:</span> {record.clientName}
                                  <span className="mx-1.5 text-zinc-600">|</span>
                                  <span className="font-medium text-zinc-400">Item:</span> <span className="font-mono text-[11px]">{record.itemCode}</span>
                                </div>

                                <div className="flex items-center gap-1.5 mt-2">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                                    record.isSealed 
                                      ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                                      : "bg-amber-500/5 border-amber-500/10 text-amber-400"
                                  }`}>
                                    {record.isSealed ? "✓ Embalagem Lacrada" : "✗ Embalagem Aberta"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-start sm:items-end gap-1.5 text-xs shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#262A31]/60">
                              <span className="text-[10px] text-zinc-500">Destinação Logística</span>
                              <div className="flex items-center gap-2 flex-wrap">
                                {(() => {
                                  const recordReqs = requisitions.filter((req) => req.returnId === record.id);
                                  const hasPendingReq = recordReqs.some((req) => req.status === "Pendente");
                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedReqReturn(record);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                                      title="Solicitar informações ou enviar requisição"
                                    >
                                      <FileText size={12} className="text-indigo-400" />
                                      <span>Requisição</span>
                                      {recordReqs.length > 0 && (
                                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                          hasPendingReq
                                            ? "bg-amber-500 text-black animate-pulse"
                                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        }`}>
                                          {recordReqs.length}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })()}

                                <div className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${actionStyles}`}>
                                  {recommendedAction}
                                </div>

                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirmReturn(record);
                                    }}
                                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                                    title="Mover para os Excluídos"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : viewTab === "tratativa" ? (
                /* View Tab = "tratativa" Content */
                <>
                  {/* Tratativa Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Área de Tratativa — Embalagens Violadas
                      </h2>
                      <p className="text-[10px] text-zinc-400">
                        Gestão de fornecedores, produtos e contagem separada de itens com embalagem violada.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar pacote, produto..."
                        className="w-full bg-[#0A0B0E] border border-[#262A31] focus:border-amber-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 transition-all font-light h-[32px]"
                        id="search_input_tratativa"
                      />
                    </div>
                  </div>

                  {/* Product Summary & Aggregation Panel */}
                  <div className="bg-[#0A0B0E] border border-[#262A31] p-3.5 rounded-xl flex flex-col gap-3" id="tratativa_product_summary">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers size={14} className="text-amber-400" />
                        <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                          Resumo por Produto ({productSummary.length} {productSummary.length === 1 ? "Produto" : "Produtos"})
                        </span>
                      </div>
                      {selectedProductFilter && (
                        <button
                          type="button"
                          onClick={() => setSelectedProductFilter("")}
                          className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <X size={12} />
                          Limpar Filtro
                        </button>
                      )}
                    </div>

                    {/* Product Cards Row / Grid */}
                    {productSummary.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic py-2 text-center">
                        Nenhuma embalagem violada cadastrada até o momento.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {productSummary.map((group) => {
                          const isSelected = selectedProductFilter === group.productName;
                          return (
                            <button
                              key={group.productName}
                              type="button"
                              onClick={() =>
                                setSelectedProductFilter(isSelected ? "" : group.productName)
                              }
                              className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                                isSelected
                                  ? "bg-amber-500/20 border-amber-500/50 shadow-md shadow-amber-500/10"
                                  : "bg-[#121418] hover:bg-[#1A1D24] border-[#262A31]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                                  {group.productName}
                                </span>
                                <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  {group.totalQuantity} un.
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                                <span>
                                  Cód. Fornecedor:{" "}
                                  <strong className="text-zinc-200">
                                    {group.supplierCodes.length > 0
                                      ? group.supplierCodes.join(", ")
                                      : "Sem Cód."}
                                  </strong>
                                </span>
                                <span>
                                  {group.packageCount} {group.packageCount === 1 ? "pacote" : "pacotes"}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Filtered Packages for Tratativa */}
                  <div className="flex flex-col gap-3 max-h-[520px] overflow-y-auto pr-1" id="tratativa_packages_list">
                    {(() => {
                      const violatedReturns = returns.filter((r) => {
                        if (r.isSealed) return false;
                        if (selectedProductFilter) {
                          const pName = (r.productName && r.productName.trim()) ? r.productName.trim() : "Sem Nome Definido";
                          if (pName !== selectedProductFilter) return false;
                        }
                        const query = searchQuery.toLowerCase().trim();
                        if (!query) return true;
                        return (
                          (r.id && r.id.toLowerCase().includes(query)) ||
                          (r.itemCode && r.itemCode.toLowerCase().includes(query)) ||
                          (r.clientName && r.clientName.toLowerCase().includes(query)) ||
                          (r.supplierCode && r.supplierCode.toLowerCase().includes(query)) ||
                          (r.productName && r.productName.toLowerCase().includes(query)) ||
                          (r.causeDescription && r.causeDescription.toLowerCase().includes(query))
                        );
                      });

                      if (violatedReturns.length === 0) {
                        return (
                          <div className="text-center py-12 bg-[#0A0B0E] border border-[#262A31] rounded-xl flex flex-col items-center justify-center gap-3">
                            <div className="p-3 bg-[#121418] rounded-full text-zinc-600 border border-[#262A31]">
                              <AlertTriangle size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-zinc-400">
                                {selectedProductFilter
                                  ? `Nenhum pacote violado encontrado para "${selectedProductFilter}"`
                                  : "Nenhum pacote violado registrado"}
                              </p>
                              <p className="text-xs text-zinc-600 mt-0.5">
                                Cadastre novos laudos marcados como "Aberto / Violado" para tratativa.
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return violatedReturns.map((record) => {
                        const recordReqs = requisitions.filter((req) => req.returnId === record.id);
                        const hasPendingReq = recordReqs.some((req) => req.status === "Pendente");
                        return (
                          <TratativaCard
                            key={record.id}
                            record={record}
                            onSave={handleSaveTratativaItem}
                            onSelect={setSelectedReturn}
                            isSelected={selectedReturn?.id === record.id}
                            canEdit={canEdit}
                            onRequestRequisition={(r) => setSelectedReqReturn(r)}
                            requisitionCount={recordReqs.length}
                            hasPendingRequisition={hasPendingReq}
                            onPreviewImage={(src) => {
                              setLightboxImage(src);
                              setLightboxZoom(1);
                            }}
                          />
                        );
                      });
                    })()}
                  </div>
                </>
              ) : (
                /* View Tab = "deleted" Content */
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                        <Trash2 size={16} />
                        Área de Devoluções Excluídas
                      </h2>
                      <p className="text-[10px] text-zinc-400">Histórico de laudos removidos com opção de restauração</p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar itens excluídos..."
                        className="w-full bg-[#0A0B0E] border border-[#262A31] focus:border-rose-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 transition-all font-light h-[32px]"
                      />
                    </div>
                  </div>

                  {/* Deleted Returns List */}
                  <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1" id="deleted_returns_list">
                    {filteredDeletedReturns.length === 0 ? (
                      <div className="text-center py-12 bg-[#0A0B0E] border border-[#262A31] rounded-xl flex flex-col items-center justify-center gap-3">
                        <div className="p-3 bg-[#121418] rounded-full text-zinc-600 border border-[#262A31]">
                          <Trash2 size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-400">A lixeira está vazia</p>
                          <p className="text-xs text-zinc-600 mt-0.5">Nenhum laudo de devolução foi movido para os excluídos.</p>
                        </div>
                      </div>
                    ) : (
                      filteredDeletedReturns.map((record) => {
                        const isSelected = selectedReturn?.id === record.id;
                        const dateString = new Date(record.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit"
                        });
                        const deletedDateString = record.deletedAt ? new Date(record.deletedAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit"
                        }) : null;

                        return (
                          <div
                            key={record.id}
                            onClick={() => setSelectedReturn(record)}
                            className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                              isSelected
                                ? "bg-rose-500/10 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                                : "bg-[#0A0B0E] hover:bg-[#161920] border-[#262A31]"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg border border-[#262A31] overflow-hidden shrink-0 bg-[#121418] flex items-center justify-center">
                                {record.images && record.images.length > 0 ? (
                                  <img
                                    src={record.images[0]}
                                    alt="Item"
                                    className="w-full h-full object-cover opacity-60"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <ImageIcon size={16} className="text-zinc-600" />
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-rose-300 font-mono">{record.id}</span>
                                  <span className="text-[10px] text-zinc-500">Criado: {dateString}</span>
                                </div>
                                
                                <div className="text-xs mt-1 text-zinc-300">
                                  <span className="font-medium text-zinc-400">Cliente:</span> {record.clientName}
                                  <span className="mx-1.5 text-zinc-600">|</span>
                                  <span className="font-medium text-zinc-400">Item:</span> <span className="font-mono text-[11px]">{record.itemCode}</span>
                                </div>

                                {deletedDateString && (
                                  <div className="text-[10px] text-rose-400/80 mt-1 flex items-center gap-1 font-mono">
                                    <Clock size={11} /> Excluído em: {deletedDateString}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#262A31]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestoreReturn(record.id);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                                title="Restaurar para devoluções ativas"
                              >
                                <RotateCcw size={12} />
                                <span>Restaurar</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPermanentDeleteConfirmReturn(record);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                                title="Excluir Definitivamente"
                              >
                                <Trash2 size={12} />
                                <span>Excluir Definitivamente</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}

              {/* Inspection Details View (Expanded Panel if selected) */}
              <AnimatePresence>
                {selectedReturn && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="bg-[#0A0B0E] p-5 rounded-xl border border-[#262A31] mt-3 flex flex-col gap-4 relative"
                    id="expanded_audit_panel"
                  >
                    
                    {/* Top Right Buttons Row */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      {deletedReturns.some(r => r.id === selectedReturn.id) ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRestoreReturn(selectedReturn.id)}
                            className="px-2.5 py-1 rounded-lg text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
                            title="Restaurar Devolução"
                          >
                            <RotateCcw size={12} />
                            <span>Restaurar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPermanentDeleteConfirmReturn(selectedReturn)}
                            className="px-2.5 py-1 rounded-lg text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
                            title="Excluir Definitivamente"
                          >
                            <Trash2 size={12} />
                            <span>Excluir Definitivamente</span>
                          </button>
                        </>
                      ) : !isEditing ? (
                        <>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleStartEditing(selectedReturn)}
                              className="px-2.5 py-1 rounded-lg text-zinc-300 hover:text-indigo-400 hover:bg-[#121418] border border-[#262A31] hover:border-indigo-500/30 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-medium"
                              title="Editar Devolução"
                            >
                              <Edit2 size={12} className="text-zinc-400 hover:text-indigo-400" />
                              <span>Editar</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmReturn(selectedReturn);
                              }}
                              className="px-2.5 py-1 rounded-lg text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
                              title="Excluir Registro"
                            >
                              <Trash2 size={12} className="text-rose-400" />
                              <span>Mover p/ Excluídos</span>
                            </button>
                          )}
                        </>
                      ) : null}
                      
                      <button
                        onClick={() => {
                          setSelectedReturn(null);
                          setIsEditing(false);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-[#121418] border border-transparent hover:border-[#262A31] transition-colors cursor-pointer"
                        title="Fechar Inspeção"
                        id="close_inspection_button"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 border-b border-[#262A31] pb-3 pr-40">
                      <ClipboardList size={16} className="text-indigo-400 shrink-0" />
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          {isEditing ? "Editar Laudo de Recebimento" : "Laudo de Recebimento de Pacote"}: <span className="font-mono text-indigo-400">{selectedReturn.id}</span>
                        </h3>
                        <p className="text-[10px] text-zinc-500">
                          {isEditing ? "Modificando dados do registro físico local" : "Verificação operacional de recebimento físico"}
                        </p>
                      </div>
                    </div>

                    {isEditing ? (
                      /* EDIT MODE LAYOUT */
                      <div className="flex flex-col gap-4 text-xs">
                        
                        {/* Name and Item Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Nome do Cliente</label>
                            <input
                              type="text"
                              value={editForm.clientName}
                              onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                              className="w-full bg-[#121418] border border-[#262A31] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white transition-all outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Código do Item</label>
                            <input
                              type="text"
                              value={editForm.itemCode}
                              onChange={(e) => setEditForm({ ...editForm, itemCode: e.target.value })}
                              className="w-full bg-[#121418] border border-[#262A31] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white font-mono transition-all outline-none"
                            />
                          </div>
                        </div>

                        {/* Packaging Status Toggle */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Estado da Embalagem</label>
                          <div className="flex gap-2 p-1 bg-[#121418] rounded-lg border border-[#262A31] max-w-xs">
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, isSealed: true })}
                              className={`flex-1 py-1 px-3 rounded text-xs font-medium transition-all cursor-pointer ${
                                editForm.isSealed
                                  ? "bg-indigo-500 text-white"
                                  : "text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              Lacrado
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, isSealed: false })}
                              className={`flex-1 py-1 px-3 rounded text-xs font-medium transition-all cursor-pointer ${
                                !editForm.isSealed
                                  ? "bg-amber-600/90 text-white"
                                  : "text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              Aberto
                            </button>
                          </div>
                        </div>

                        {/* Occurrence description */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Relato da Ocorrência</label>
                          <textarea
                            value={editForm.causeDescription}
                            onChange={(e) => setEditForm({ ...editForm, causeDescription: e.target.value })}
                            rows={3}
                            className="w-full bg-[#121418] border border-[#262A31] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white transition-all resize-none outline-none font-light leading-relaxed"
                          />
                        </div>

                        {/* Photos Management in Edit Mode */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                            Vistoria Fotográfica ({editForm.images.length}/3 mín)
                          </label>
                          <p className="text-[9px] text-zinc-500 mb-1">
                            Você pode remover fotos, mas deve reter um mínimo de 3 para conformidade física.
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {editForm.images.map((img, idx) => (
                              <div key={idx} className="aspect-video rounded-lg border border-[#262A31] overflow-hidden relative bg-[#121418] group">
                                <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editForm.images.length <= 3) {
                                      alert("Para manter a conformidade do registro, são necessárias pelo menos 3 imagens de vistoria.");
                                      return;
                                    }
                                    setEditForm({
                                      ...editForm,
                                      images: editForm.images.filter((_, i) => i !== idx)
                                    });
                                  }}
                                  className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-rose-400 hover:text-rose-300 transition-all cursor-pointer text-[10px] font-medium"
                                >
                                  <Trash2 size={12} className="mb-1" />
                                  Remover Foto
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Add Photo triggers in Edit Mode */}
                          <div className="flex flex-col sm:flex-row gap-2 mt-2">
                            <input
                              type="file"
                              ref={editFileInputRef}
                              onChange={handleEditFileChange}
                              multiple
                              accept="image/*"
                              className="hidden"
                              id="edit_file_input"
                            />
                            <input
                              type="file"
                              ref={editCameraInputRef}
                              onChange={handleEditFileChange}
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              id="edit_camera_input"
                            />
                            <button
                              type="button"
                              onClick={() => editCameraInputRef.current?.click()}
                              className="flex-1 py-1.5 px-3 bg-[#121418] border border-[#262A31] hover:border-zinc-700 hover:bg-[#1A1D24] text-zinc-300 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Camera size={12} className="text-zinc-400" />
                              <span>Tirar Foto (Câmera)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => editFileInputRef.current?.click()}
                              className="flex-1 py-1.5 px-3 bg-[#121418] border border-[#262A31] hover:border-zinc-700 hover:bg-[#1A1D24] text-zinc-300 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Upload size={12} className="text-zinc-400" />
                              <span>Adicionar da Galeria</span>
                            </button>
                          </div>
                        </div>

                        {/* Form Buttons */}
                        <div className="flex justify-end gap-2 border-t border-[#262A31] pt-3 mt-1">
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-1.5 rounded-lg border border-[#262A31] hover:bg-[#121418] text-xs text-zinc-400 font-medium transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateReturn(selectedReturn.id)}
                            className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-xs text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Save size={12} />
                            Salvar Alterações
                          </button>
                        </div>

                      </div>
                    ) : (
                      /* READ-ONLY VIEW MODE LAYOUT */
                      <>
                        {/* General details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="flex flex-col gap-1 bg-[#121418] p-2.5 rounded-lg border border-[#262A31]">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Dados Cadastrais</span>
                            <p className="text-zinc-200"><strong>Cliente:</strong> {selectedReturn.clientName}</p>
                            <p className="text-zinc-200"><strong>Código Item:</strong> <span className="font-mono">{selectedReturn.itemCode}</span></p>
                            <p className="text-zinc-200"><strong>Lacre da Embalagem:</strong> {selectedReturn.isSealed ? "✓ Intacto (Lacrado)" : "✗ Violado (Aberto)"}</p>
                          </div>

                          <div className="flex flex-col gap-1 bg-[#121418] p-2.5 rounded-lg border border-[#262A31]">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Controle Físico</span>
                            <p className="text-zinc-200"><strong>Registrado em:</strong> {new Date(selectedReturn.createdAt).toLocaleString("pt-BR")}</p>
                            <p className="text-zinc-200"><strong>Fotos anexadas:</strong> {selectedReturn.images?.length || 0} imagens</p>
                          </div>
                        </div>

                        {/* Tratativa Information Card if open package */}
                        {(!selectedReturn.isSealed || selectedReturn.productName || selectedReturn.supplierCode) && (
                          <div className="bg-[#121418] p-3 rounded-lg border border-amber-500/30 text-xs text-zinc-300 flex flex-col gap-1.5">
                            <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                              <AlertTriangle size={12} />
                              Tratativa de Embalagem Violada
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-0.5">
                              <div>
                                <span className="text-[10px] text-zinc-500 block">Código Fornecedor:</span>
                                <strong className="font-mono text-white">{selectedReturn.supplierCode || "Não Informado"}</strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 block">Nome do Produto:</span>
                                <strong className="text-white">{selectedReturn.productName || "Não Informado"}</strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 block">Quantidade Separada:</span>
                                <strong className="font-mono text-amber-400">{selectedReturn.quantity || 1} un.</strong>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Cause description */}
                        <div className="bg-[#121418] p-3 rounded-lg border border-[#262A31] text-xs text-zinc-300">
                          <span className="text-[10px] text-zinc-500 font-medium block mb-1 uppercase tracking-wider">Relato da Ocorrência</span>
                          <p className="font-light leading-relaxed">"{selectedReturn.causeDescription}"</p>
                        </div>

                        {/* Pictures Grid with Download Hover Options */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center bg-[#0A0B0E] p-2 rounded-lg border border-[#262A31] mb-1">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Vistoria Fotográfica</span>
                              <span className="text-[9px] text-zinc-500 italic">Passe o mouse na imagem para baixar individualmente</span>
                            </div>
                            {selectedReturn.images && selectedReturn.images.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleDownloadAllAsZip(selectedReturn)}
                                className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white hover:text-white rounded-lg transition-all flex items-center gap-1.5 text-[10px] font-bold cursor-pointer shadow-lg shadow-indigo-500/10 shrink-0"
                                title="Baixar todas as fotos compactadas em .ZIP"
                              >
                                <Download size={12} />
                                <span>Baixar todas (.ZIP)</span>
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2" id="inspection_photos_grid">
                            {selectedReturn.images?.map((img, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setLightboxImage(img);
                                  setLightboxZoom(1);
                                }}
                                className="aspect-video rounded-lg border border-[#262A31] overflow-hidden relative bg-[#121418] group cursor-pointer"
                                title="Clique para ver imagem ampliada"
                              >
                                <img
                                  src={img}
                                  alt={`Vistoria ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-300 ease-out"
                                  referrerPolicy="no-referrer"
                                />
                                
                                {/* Photo Hover Actions - Ampliar & Download */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5 p-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLightboxImage(img);
                                      setLightboxZoom(1);
                                    }}
                                    className="p-1.5 bg-zinc-900/90 hover:bg-zinc-950 text-amber-400 rounded-lg border border-zinc-800 transition-all flex items-center gap-1 text-[10px] font-medium cursor-pointer shadow-md"
                                    title="Ampliar Foto"
                                  >
                                    <ZoomIn size={12} />
                                    <span>Ampliar</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadPhoto(img, idx, selectedReturn.id);
                                    }}
                                    className="p-1.5 bg-zinc-900/90 hover:bg-zinc-950 text-white hover:text-indigo-400 rounded-lg border border-zinc-800 transition-all flex items-center gap-1 text-[10px] font-medium cursor-pointer shadow-md"
                                    title="Baixar Foto"
                                  >
                                    <Download size={11} />
                                  </button>
                                </div>

                                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[8px] text-zinc-300 font-mono pointer-events-none">
                                  Foto #{idx + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Recommended destination box based on status */}
                        <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-xl flex flex-col gap-2" id="ai_recommendation_box">
                          <div className="flex items-center gap-2 text-indigo-400">
                            <Package size={16} />
                            <span className="text-xs font-bold uppercase tracking-widest">Procedimento Operacional Padrão</span>
                          </div>

                          <div className="text-sm font-semibold text-white bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-lg font-mono flex justify-between items-center">
                            <span>{selectedReturn.isSealed ? "Retornar ao estoque de novos" : "Encaminhar para vistoria / assistência técnica"}</span>
                          </div>

                          <div className="text-xs text-zinc-300 flex flex-col gap-1 mt-1">
                            <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">Justificativa de Destinação:</span>
                            <p className="leading-relaxed font-light text-zinc-400">
                              {selectedReturn.isSealed 
                                ? "Como a embalagem do item encontra-se lacrada de fábrica, o produto retém seu valor comercial completo e pode ser reintegrado ao estoque ativo de vendas sem necessidade de recondicionamento." 
                                : "A embalagem foi aberta ou violada pelo remetente. Conforme a política de logística reversa, o item deve passar por uma triagem física e testes funcionais antes de qualquer decisão de descarte ou reembalagem."}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                  </motion.div>
                )}
              </AnimatePresence>

            </section>

          </div>

          {/* Footer */}
          <footer className="mt-auto pt-6 border-t border-[#262A31] text-center text-[10px] text-zinc-600 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div>
              &copy; 2026 Devoluções ERP. Todos os direitos reservados.
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Foco em Alta Produtividade, Agilidade & Organização
            </div>
          </footer>

        </div>
      </main>

      {/* Fullscreen Lightbox Modal for Photo Inspection */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6"
            id="lightbox_modal"
          >
            {/* Lightbox Top Control Bar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl flex items-center justify-between bg-[#121418] border border-[#262A31] px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md z-10"
            >
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className="text-amber-400" />
                <span className="text-xs sm:text-sm font-semibold text-white">Visualização da Fotografia</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLightboxZoom((prev) => Math.max(0.5, prev - 0.25))}
                  className="p-1.5 rounded-lg bg-[#0A0B0E] hover:bg-[#1C1F26] text-zinc-300 border border-[#262A31] transition-colors cursor-pointer"
                  title="Reduzir Zoom (-)"
                  id="btn_zoom_out"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-mono text-amber-400 min-w-[45px] text-center font-bold">
                  {Math.round(lightboxZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxZoom((prev) => Math.min(3, prev + 0.25))}
                  className="p-1.5 rounded-lg bg-[#0A0B0E] hover:bg-[#1C1F26] text-zinc-300 border border-[#262A31] transition-colors cursor-pointer"
                  title="Aumentar Zoom (+)"
                  id="btn_zoom_in"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxZoom(1)}
                  className="px-2 py-1 text-[11px] font-mono rounded-lg bg-[#0A0B0E] hover:bg-[#1C1F26] text-zinc-300 border border-[#262A31] transition-colors cursor-pointer"
                  title="Restaurar Tamanho Original"
                  id="btn_zoom_reset"
                >
                  Reset
                </button>

                <a
                  href={lightboxImage}
                  download="foto-vistoria.jpg"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors cursor-pointer ml-2 flex items-center gap-1 text-xs px-2.5 font-medium shadow-md shadow-indigo-500/20"
                  title="Baixar Foto"
                  id="btn_download_lightbox"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Baixar</span>
                </a>

                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer ml-1"
                  title="Fechar (Esc)"
                  id="btn_close_lightbox"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Main Image Stage */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex-1 w-full max-w-5xl flex items-center justify-center overflow-auto p-4 my-2 relative"
            >
              <img
                src={lightboxImage}
                alt="Fotografia em Tamanho Real"
                style={{ transform: `scale(${lightboxZoom})` }}
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl transition-transform duration-200 ease-out border border-[#262A31]"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Bottom Info Bar */}
            <div className="text-[11px] text-zinc-400 font-light flex items-center gap-2 bg-[#0A0B0E]/90 px-3.5 py-1.5 rounded-full border border-[#262A31]">
              <span>Clique fora ou pressione ESC para fechar sem baixar</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REQUISITION CREATION MODAL */}
      <AnimatePresence>
        {selectedReqReturn && (
          <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#121418] border border-[#262A31] rounded-2xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[#262A31] pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="text-indigo-400" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-white">Nova Requisição / Solicitação</h3>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      Pacote: {selectedReqReturn.id} | Item: {selectedReqReturn.itemCode}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReqReturn(null);
                    setReqMessage("");
                  }}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1C1F26] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Item Summary Card */}
              <div className="bg-[#0A0B0E] p-3 rounded-xl border border-[#262A31] flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg border border-[#262A31] overflow-hidden bg-[#121418] shrink-0 flex items-center justify-center">
                  {selectedReqReturn.images && selectedReqReturn.images.length > 0 ? (
                    <img src={selectedReqReturn.images[0]} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon size={18} className="text-zinc-600" />
                  )}
                </div>
                <div className="flex flex-col text-xs font-light">
                  <span className="text-zinc-200 font-semibold">{selectedReqReturn.clientName}</span>
                  <span className="text-zinc-400 text-[11px] font-mono">{selectedReqReturn.productName || "Produto sem nome"}</span>
                  <span className={`text-[10px] font-semibold mt-1 ${selectedReqReturn.isSealed ? "text-emerald-400" : "text-amber-400"}`}>
                    {selectedReqReturn.isSealed ? "✓ Embalagem Lacrada" : "✗ Embalagem Violada"}
                  </span>
                </div>
              </div>

              {/* Existing Requisitions History */}
              {(() => {
                const existing = requisitions.filter((r) => r.returnId === selectedReqReturn.id);
                if (existing.length === 0) return null;
                return (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Histórico de Solicitações para este Item ({existing.length}):
                    </span>
                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                      {existing.map((req) => (
                        <div key={req.id} className="p-3 bg-[#0A0B0E] rounded-xl border border-[#262A31] flex flex-col gap-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-indigo-400">{req.requesterName} ({req.requesterRole})</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                              req.status === "Pendente" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          <p className="text-zinc-300 bg-[#121418] p-2 rounded-lg border border-[#262A31] text-[11px] italic">
                            "{req.message}"
                          </p>
                          {req.answer && (
                            <div className="mt-1 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[11px] text-indigo-300">
                              <strong>Resposta de Gustavo:</strong> {req.answer}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Message Input & Quick Preset Buttons */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Mensagem / Solicitação para Gustavo:</span>
                  <span className="text-[10px] font-normal text-zinc-500">Enviar requisição</span>
                </label>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setReqMessage("Favor enviar fotos adicionais da embalagem e etiqueta.")}
                    className="px-2 py-1 bg-[#0A0B0E] hover:bg-[#1C1F26] border border-[#262A31] rounded-lg text-[10px] text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    + Solicitar Fotos
                  </button>
                  <button
                    type="button"
                    onClick={() => setReqMessage("Favor verificar status da aprovação do fornecedor.")}
                    className="px-2 py-1 bg-[#0A0B0E] hover:bg-[#1C1F26] border border-[#262A31] rounded-lg text-[10px] text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    + Solicitar Fornecedor
                  </button>
                  <button
                    type="button"
                    onClick={() => setReqMessage("Solicito autorização para reclassificação deste item.")}
                    className="px-2 py-1 bg-[#0A0B0E] hover:bg-[#1C1F26] border border-[#262A31] rounded-lg text-[10px] text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    + Reclassificação
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={reqMessage}
                  onChange={(e) => setReqMessage(e.target.value)}
                  placeholder="Escreva sua solicitação com detalhes aqui..."
                  className="w-full bg-[#0A0B0E] border border-[#262A31] focus:border-indigo-500 rounded-xl p-3 text-xs text-white placeholder-zinc-600 outline-none transition-all resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262A31]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReqReturn(null);
                    setReqMessage("");
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0A0B0E] hover:bg-[#1C1F26] text-zinc-400 hover:text-white border border-[#262A31] text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!reqMessage.trim() || isSubmittingReq}
                  onClick={handleCreateRequisition}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <Send size={14} />
                  <span>{isSubmittingReq ? "Enviando..." : "Enviar Requisição"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GUSTAVO INBOX REQUISITIONS MODAL */}
      <AnimatePresence>
        {showInboxModal && (
          <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#121418] border border-[#262A31] rounded-2xl p-6 shadow-2xl flex flex-col gap-5 max-h-[85vh]"
            >
              <div className="flex items-center justify-between border-b border-[#262A31] pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-indigo-400" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-white">Central de Requisições dos Usuários</h3>
                    <p className="text-[10px] text-zinc-400">
                      Painel exclusivo de Gustavo para responder solicitações de colaboradores.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInboxModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1C1F26] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Requisitions List */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
                {requisitions.length === 0 ? (
                  <div className="text-center py-12 bg-[#0A0B0E] border border-[#262A31] rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-500">
                    <CheckCircle size={32} className="text-zinc-600" />
                    <p className="text-xs font-medium">Nenhuma requisição pendente no sistema.</p>
                  </div>
                ) : (
                  requisitions.map((req) => {
                    const reqDate = new Date(req.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    });
                    const isAnswering = isAnsweringReqId === req.id;
                    const currentAnswer = gustavoAnswerMap[req.id] || "";

                    return (
                      <div
                        key={req.id}
                        className={`p-4 rounded-xl border text-left flex flex-col gap-3 transition-all ${
                          req.status === "Pendente"
                            ? "bg-[#0A0B0E] border-amber-500/30"
                            : "bg-[#0A0B0E]/60 border-[#262A31]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{req.requesterName}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#121418] border border-[#262A31] text-zinc-400 capitalize">
                              {req.requesterRole}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">Pacote: {req.returnId}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500">{reqDate}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              req.status === "Pendente"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}>
                              {req.status}
                            </span>
                          </div>
                        </div>

                        <div className="bg-[#121418] p-3 rounded-xl border border-[#262A31] text-xs text-zinc-200">
                          <span className="text-[10px] font-semibold text-zinc-500 block uppercase tracking-wider mb-1">
                            Mensagem do Usuário:
                          </span>
                          "{req.message}"
                        </div>

                        {req.answer ? (
                          <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 text-xs text-indigo-200">
                            <span className="text-[10px] font-semibold text-indigo-400 block uppercase tracking-wider mb-1">
                              Sua Resposta (Gustavo):
                            </span>
                            {req.answer}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 pt-1 border-t border-[#262A31]">
                            {isAnswering ? (
                              <div className="flex flex-col gap-2">
                                <textarea
                                  rows={2}
                                  value={currentAnswer}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setGustavoAnswerMap((prev) => ({ ...prev, [req.id]: val }));
                                  }}
                                  placeholder="Digite a resposta oficial para esta requisição..."
                                  className="w-full bg-[#121418] border border-indigo-500/50 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all resize-none"
                                />
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsAnsweringReqId(null);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!currentAnswer.trim()}
                                    onClick={() => handleAnswerRequisition(req.id)}
                                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Send size={12} />
                                    <span>Responder</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAnsweringReqId(req.id);
                                }}
                                className="self-end px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Send size={12} />
                                <span>Responder Requisição</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal: Move Return to Trash */}
      <AnimatePresence>
        {deleteConfirmReturn && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#121418] border border-[#262A31] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 relative"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Mover Devolução para Excluídos</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">{deleteConfirmReturn.id}</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed bg-[#0A0B0E] p-3 rounded-xl border border-[#262A31]">
                Tem certeza que deseja mover o laudo <strong className="text-white font-mono">{deleteConfirmReturn.id}</strong> (Cliente: <strong className="text-white">{deleteConfirmReturn.clientName || "N/A"}</strong>, Item: <strong className="text-white font-mono">{deleteConfirmReturn.itemCode || "N/A"}</strong>) para a Área de Excluídos (Lixeira)?
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#262A31]">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmReturn(null)}
                  className="px-4 py-2 rounded-xl bg-[#1A1D24] hover:bg-[#262A31] text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleDeleteReturn(deleteConfirmReturn.id)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-lg shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Excluindo...</span>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Mover para Excluídos</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal: Permanent Delete */}
      <AnimatePresence>
        {permanentDeleteConfirmReturn && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#121418] border border-[#262A31] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 relative"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Excluir Definitivamente</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">{permanentDeleteConfirmReturn.id}</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed bg-[#0A0B0E] p-3 rounded-xl border border-[#262A31]">
                Atenção: Deseja realmente excluir <strong className="text-rose-400 font-bold">PERMANENTEMENTE</strong> a devolução <strong className="text-white font-mono">{permanentDeleteConfirmReturn.id}</strong>? Esta ação não poderá ser desfeita.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#262A31]">
                <button
                  type="button"
                  onClick={() => setPermanentDeleteConfirmReturn(null)}
                  className="px-4 py-2 rounded-xl bg-[#1A1D24] hover:bg-[#262A31] text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handlePermanentlyDelete(permanentDeleteConfirmReturn.id)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-lg shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Excluindo...</span>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Excluir Definitivamente</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal: Purge Trash */}
      <AnimatePresence>
        {purgeConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#121418] border border-[#262A31] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 relative"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Esvaziar Lixeira de Devoluções</h3>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed bg-[#0A0B0E] p-3 rounded-xl border border-[#262A31]">
                Deseja realmente esvaziar toda a Lixeira de Devoluções? Todos os laudos excluídos serão removidos definitivamente.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#262A31]">
                <button
                  type="button"
                  onClick={() => setPurgeConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1A1D24] hover:bg-[#262A31] text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handlePurgeTrash}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-lg shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Esvaziando...</span>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Esvaziar Toda a Lixeira</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
