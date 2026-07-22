export interface ReturnRecord {
  id: string;
  itemCode: string;
  clientName: string;
  isSealed: boolean;
  causeDescription: string;
  images: string[]; // base64 strings
  createdAt: string;
  deletedAt?: string;

  // Tratativa (Embalagens Violadas) fields
  supplierCode?: string;
  productName?: string;
  quantity?: number;
}

export interface ReturnFormState {
  itemCode: string;
  clientName: string;
  isSealed: boolean;
  causeDescription: string;
  images?: string[];
  supplierCode?: string;
  productName?: string;
  quantity?: number;
}

export type UserRole = "admin" | "felipe" | "fernanda" | "administrativo";

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password?: string;
}

export interface Requisition {
  id: string;
  returnId: string;
  itemCode?: string;
  clientName?: string;
  createdBy: string;
  requesterName?: string;
  requesterRole?: string;
  createdAt: string;
  message: string;
  status: "Pendente" | "Respondida";
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
}
