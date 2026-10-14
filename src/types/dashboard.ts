// src/types/dashboard.ts

export interface AutoPilotChange {
  id: string;
  productId: string;
  productName: string;
  type: 'NAME_MERGE' | 'PRICE_UPDATE' | 'VARIANT_ADDED' | 'NEW_PRODUCT'; 
  oldName: string;
  newName: string;
  oldPrice: number;
  newPrice: number;
  oldCategory: string;
  reverted: boolean;
}

