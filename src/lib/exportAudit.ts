import * as XLSX from 'xlsx';

export function exportAuditExcel(
  analyticsData: any,
  clientName: string,
  startDate: string,
  endDate: string
) {
  if (!analyticsData) {
    alert("Экспортлох дата олдсонгүй.");
    return;
  }

  const fin = analyticsData.financial_ladder || {};
  const tax = analyticsData.tax_summary || { simplified_1pct: 0, estimated_vat_10pct: 0 };
  const cash = analyticsData.cashflow_summary || { net_cash_balance: 0, owner_draws: 0 };
  const ym = startDate.substring(0, 7);

  // =========================================================================
  // 1. ХУУДАС 1: ОРЛОГО ҮР ДҮНГИЙН АЛБАН ЁСНЫ ТАЙЛАН (P&L)
  // =========================================================================
  const pnlData: any[][] = [
    ["ОРЛОГО ҮР ДҮНГИЙН АЛБАН ЁСНЫ ТАЙЛАН (МТА & Сангийн Яам)"],
    [`Байгууллагын нэр: ${clientName}`],
    [`Тайлант хугацаа: ${startDate} - ${endDate}`],
    [],
    ["[ E-TAX.MTA.MN ТАТВАРЫН ТАЙЛАНД ШИВЭХ БЭЛЭН ДҮН ]", "", ""],
    ["1. Тайлант сарын нийт борлуулалтын орлого (ТТ-02А)", `${Math.round(fin.revenue || 0).toLocaleString()} ₮`, "100.0%"],
    ["2. Хялбаршуулсан ААНОАТ (1% татвар)", `${Math.round(tax.simplified_1pct || (fin.revenue * 0.01) || 0).toLocaleString()} ₮`, "1.0%"],
    ["3. Эзний хувийн хэрэглээ / Таталт (Draws)", `${Math.round(cash.owner_draws || 0).toLocaleString()} ₮`, "-"],
    [],
    ["ДАНСНЫ ДУГААР БА ЗАРДЛЫН НЭР", "ДҮН (₮)", "ОРЛОГОД ЭЗЛЭХ %"],
    ["I. ҮНДСЭН ҮЙЛ АЖИЛЛАГААНЫ ОРЛОГО", `${Math.round(fin.revenue || 0).toLocaleString()} ₮`, "100.0%"],
    [],
    ["II. БОРЛУУЛСАН БҮТЭЭГДЭХҮҮНИЙ ӨРТӨГ (COGS)", `${Math.round(fin.actual_cogs || 0).toLocaleString()} ₮`, fin.revenue > 0 ? `${((fin.actual_cogs / fin.revenue) * 100).toFixed(2)}%` : "0%"],
    ["   - Онолын өртөг (Жороор гарсан хүнс)", `${Math.round(fin.theo_cogs || 0).toLocaleString()} ₮`, fin.revenue > 0 ? `${((fin.theo_cogs / fin.revenue) * 100).toFixed(2)}%` : "0%"],
    ["   - Бодит хаягдал / Шалтгаангүй зөрүү", `${Math.round(analyticsData.total_waste_loss || 0).toLocaleString()} ₮`, fin.revenue > 0 ? `${((analyticsData.total_waste_loss / fin.revenue) * 100).toFixed(2)}%` : "0%"],
    [],
    ["III. БОХИР АШИГ (GROSS PROFIT)", `${Math.round((fin.revenue - fin.actual_cogs) || 0).toLocaleString()} ₮`, fin.gross_margin || "0%"],
    [],
    ["IV. ҮЙЛ АЖИЛЛАГААНЫ ЗАРДАЛ (OPEX)", `${Math.round(fin.opex || 0).toLocaleString()} ₮`, fin.revenue > 0 ? `${((fin.opex / fin.revenue) * 100).toFixed(2)}%` : "0%"]
  ];

  // Бүх OPEX жижиг зардлуудыг тооцоолсон хувьтай нь цэвэрхэн нэмэх
  (analyticsData.opex_details || []).forEach((item: any) => {
    const cost = Math.round(item.cost || 0);
    const pct = fin.revenue > 0 ? `${((cost / fin.revenue) * 100).toFixed(2)}%` : "-";
    pnlData.push([`   • ${item.item}`, `${cost.toLocaleString()} ₮`, pct]);
  });

  pnlData.push(
    [],
    ["V. ТАТВАРЫН ӨМНӨХ АШИГ / (АЛДАГДАЛ) (EBIT)", `${Math.round(fin.ebit || 0).toLocaleString()} ₮`, fin.revenue > 0 ? `${((fin.ebit / fin.revenue) * 100).toFixed(2)}%` : "0%"],
    ["VI. ХЯЛБАРШУУЛСАН ААНОАТ (1%)", `${Math.round(tax.simplified_1pct || (fin.revenue * 0.01) || 0).toLocaleString()} ₮`, "1.0%"],
    ["VII. ЦЭВЭР АШИГ / (АЛДАГДАЛ)", `${Math.round(fin.net_profit || 0).toLocaleString()} ₮`, fin.net_margin || "0%"],
    [],
    ["[ БУСАД ҮЗҮҮЛЭЛТҮҮД ]", "", ""],
    ["• Ажлын бүтээмж (Efficiency)", analyticsData.efficiency || "0%", "-"],
    ["• Кассын Бэлэн Мөнгөний Бодит Үлдэгдэл", `${Math.round(cash.net_cash_balance || 0).toLocaleString()} ₮`, "-"]
  );

  const wsPnl = XLSX.utils.aoa_to_sheet(pnlData);
  // Баганын өргөнийг тэгшилж зайтай болгох
  wsPnl['!cols'] = [{ wch: 55 }, { wch: 22 }, { wch: 18 }];

  // =========================================================================
  // 2. ХУУДАС 2: ХАЯГДАЛ & ЗӨРҮҮНИЙ АУДИТ
  // =========================================================================
  const wasteHeader = [
    ["№", "ТҮҮХИЙ ЭДИЙН НЭР", "ХАЯГДЛЫН ХЭМЖЭЭ (ЗӨРҮҮ)", "НЭГЖ", "НЭГЖИЙН ӨРТӨГ (₮)", "САНХҮҮГИЙН АЛДАГДАЛ (₮)"]
  ];

  const wasteRows = (analyticsData.wasted_only || []).map((w: any, idx: number) => [
    idx + 1,
    w.name,
    w.gap,
    w.unit,
    `${parseFloat(w.price).toLocaleString()} ₮`,
    `${Math.round(w.impact).toLocaleString()} ₮`
  ]);

  wasteRows.push(
    [],
    ["", "НИЙТ САНХҮҮГИЙН АЛДАГДАЛ", "", "", "", `${Math.round(analyticsData.total_waste_loss || 0).toLocaleString()} ₮`]
  );

  const wsWaste = XLSX.utils.aoa_to_sheet([...wasteHeader, ...wasteRows]);
  wsWaste['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 25 }, { wch: 10 }, { wch: 20 }, { wch: 25 }];

  // =========================================================================
  // 3. ХУУДАС 3: АГУУЛАХЫН БҮХ 125 ТҮҮХИЙ ЭДИЙН ТЭНЦЭЛ
  // =========================================================================
  const invHeader = [
    ["№", "БАРААНЫ НЭР", "НЭГЖ", "НЭГЖИЙН ҮНЭ", "БОДИТ ҮЛДЭГДЭЛ", "ХЭВИЙН НӨӨЦ (PAR)", "ЗӨВЛӨХ ЗАХИАЛГА", "АЛДАГДАЛ (₮)"]
  ];

  const invRows = (analyticsData.all_inventory_data || []).map((i: any, idx: number) => [
    idx + 1,
    i.name,
    i.unit,
    `${parseFloat(i.price).toLocaleString()} ₮`,
    `${i.live_stock} ${i.unit}`,
    `${i.par_level} ${i.unit}`,
    `${i.suggested_order} ${i.unit}`,
    i.impact ? `${Math.round(i.impact).toLocaleString()} ₮` : "-"
  ]);

  const wsInv = XLSX.utils.aoa_to_sheet([...invHeader, ...invRows]);
  wsInv['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 8 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];

  // =========================================================================
  // 4. ЭКСПОРТЛОХ
  // =========================================================================
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsPnl, "Орлого_Үр_Дүн");
  XLSX.utils.book_append_sheet(wb, wsWaste, "Хаягдлын_Аудит");
  XLSX.utils.book_append_sheet(wb, wsInv, "Агуулахын_Тэнцэл");

  const fileName = `Санхүүгийн_Тайлан_${clientName.replace(/\s+/g, '')}_${ym}.xlsx`;
  XLSX.writeFile(wb, fileName);
}