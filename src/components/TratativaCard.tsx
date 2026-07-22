import React, { useState, useEffect } from "react";
import { Tag, Box, Layers, Save, Check, Image as ImageIcon, ZoomIn, FileText, MessageSquare } from "lucide-react";
import type { ReturnRecord } from "../types";

interface TratativaCardProps {
  record: ReturnRecord;
  onSave: (id: string, supplierCode: string, productName: string, quantity: number) => Promise<void>;
  onSelect: (record: ReturnRecord) => void;
  isSelected: boolean;
  onPreviewImage?: (src: string) => void;
  onRequestRequisition?: (record: ReturnRecord) => void;
  requisitionCount?: number;
  hasPendingRequisition?: boolean;
  hasAnsweredRequisition?: boolean;
  canEdit?: boolean;
}

export const TratativaCard: React.FC<TratativaCardProps> = ({
  record,
  onSave,
  onSelect,
  isSelected,
  onPreviewImage,
  onRequestRequisition,
  requisitionCount = 0,
  hasPendingRequisition = false,
  hasAnsweredRequisition = false,
  canEdit = true
}) => {
  const [supplierCode, setSupplierCode] = useState(record.supplierCode || "");
  const [productName, setProductName] = useState(record.productName || "");
  const [quantity, setQuantity] = useState(record.quantity || 1);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setSupplierCode(record.supplierCode || "");
    setProductName(record.productName || "");
    setQuantity(record.quantity || 1);
  }, [record]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canEdit) return;
    setIsSaving(true);
    await onSave(record.id, supplierCode, productName, quantity);
    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const isFilled = Boolean(productName.trim() && supplierCode.trim());

  return (
    <div
      onClick={() => onSelect(record)}
      className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-3 cursor-pointer ${
        isSelected
          ? "bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
          : "bg-[#0A0B0E] hover:bg-[#161920] border-[#262A31]"
      }`}
    >
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-start gap-3">
          <div
            onClick={(e) => {
              if (record.images && record.images.length > 0 && onPreviewImage) {
                e.stopPropagation();
                onPreviewImage(record.images[0]);
              }
            }}
            className="w-11 h-11 rounded-lg border border-[#262A31] overflow-hidden shrink-0 bg-[#121418] flex items-center justify-center relative group cursor-pointer"
            title="Clique para expandir foto"
          >
            {record.images && record.images.length > 0 ? (
              <>
                <img
                  src={record.images[0]}
                  alt="Item"
                  className="w-full h-full object-cover transition-transform duration-300 ease-out hover:scale-125"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-amber-400">
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
              <span className="text-[10px] text-zinc-500">
                {new Date(record.createdAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            </div>
            <div className="text-xs text-zinc-300 mt-0.5">
              <span className="text-zinc-500 font-medium">Cliente:</span> {record.clientName}{" "}
              <span className="mx-1 text-zinc-600">|</span>{" "}
              <span className="text-zinc-500 font-medium">Item:</span>{" "}
              <span className="font-mono text-[11px] text-indigo-300">{record.itemCode}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onRequestRequisition && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRequestRequisition(record);
              }}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer"
              title="Criar ou ver requisições deste item"
            >
              <FileText size={12} className="text-indigo-400" />
              <span>Requisição</span>
              {requisitionCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                  hasPendingRequisition
                    ? "bg-amber-500 text-black animate-pulse"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}>
                  {requisitionCount}
                </span>
              )}
            </button>
          )}

          <span
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${
              isFilled
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            }`}
          >
            {isFilled ? "✓ Tratativa Preenchida" : "⚠️ Tratativa Pendente"}
          </span>
        </div>
      </div>

      {/* Form Fields for Tratativa */}
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleFormSubmit}
        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#121418] p-3 rounded-lg border border-[#262A31] mt-1"
      >
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Tag size={10} /> Cód. do Fornecedor
          </label>
          <input
            type="text"
            disabled={!canEdit}
            value={supplierCode}
            onChange={(e) => setSupplierCode(e.target.value)}
            placeholder="Ex: FORN-1029"
            className="w-full bg-[#0A0B0E] border border-[#262A31] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md px-2.5 py-1.5 text-xs text-white font-mono placeholder-zinc-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Box size={10} /> Nome do Produto
          </label>
          <input
            type="text"
            disabled={!canEdit}
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Ex: Bloco 100 peças"
            className="w-full bg-[#0A0B0E] border border-[#262A31] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Layers size={10} /> Qtd. Separada
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              disabled={!canEdit}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 bg-[#0A0B0E] border border-[#262A31] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md px-2.5 py-1.5 text-xs text-white font-mono transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {canEdit && (
              <button
                type="submit"
                disabled={isSaving}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  savedSuccess
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                    : "bg-amber-500 hover:bg-amber-400 text-black active:scale-[0.98]"
                }`}
              >
                {isSaving ? (
                  <span className="text-[11px]">Salvando...</span>
                ) : savedSuccess ? (
                  <>
                    <Check size={13} />
                    <span>Salvo!</span>
                  </>
                ) : (
                  <>
                    <Save size={13} />
                    <span>Salvar</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Cause description snippet */}
      {record.causeDescription && (
        <p className="text-[11px] text-zinc-400 italic bg-[#0A0B0E]/60 px-2.5 py-1 rounded border border-[#262A31]/50 line-clamp-1">
          "{record.causeDescription}"
        </p>
      )}
    </div>
  );
};
