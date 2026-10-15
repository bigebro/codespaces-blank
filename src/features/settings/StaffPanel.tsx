// src/features/settings/StaffPanel.tsx
"use client";
import React from "react";

interface StaffPanelProps {
  activeClient: string;
  workersList: any[];
  companyRoles: any[];
  loading: boolean;
  setLoading: (l: boolean) => void;
  fetchDatabaseData: (client?: string) => Promise<void>;
}

export default function StaffPanel({
  activeClient,
  workersList,
  companyRoles,
  loading,
  setLoading,
  fetchDatabaseData,
}: StaffPanelProps) {
  return (
    <div className="space-y-6">
      {/* 🔗 Урилгын линк хуулах хэсэг */}
      {/* ➕ Салбартаа шинэ ажилтан бүртгэх форм */}
      {/* 🏷️ 1. Албан тушаал / Үүрэг үүсгэх */}
      {/* 👥 2. Ажилтнуудад үүрэг оноох хүснэгт */}
    </div>
  );
}