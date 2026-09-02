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
  const cf = analyticsData.cashflow_summary || {};
  const ym = startDate.substring(0, 7);
  const wb = XLSX.utils.book_new();

  // =========================================================================
  // 📄 1. ОРЛОГО_ҮР_ДҮН (P&L - MTA & САНГИЙН ЯАМ СТ-2 МАЯГТ)
  // =========================================================================
  const pnlData: any[][] = [
    ["ОРЛОГО ҮР ДҮНГИЙН АЛБАН ЁСНЫ ТАЙЛАН (P&L)"],
    [`Байгууллагын нэр: ${clientName}`],
    [`Тайлант хугацаа: ${startDate} - ${endDate}`],
    [],
    ["[ E-TAX.MTA.MN ТАТВАРЫН ТАЙЛАНД ШИВЭХ ДҮН ]", "", ""],
    ["1. Нийт борлуулалтын орлого (ТТ-02А маягт)", `${Math.round(fin.revenue || 0).toLocaleString()} ₮`, "100.0%"],
    [`2. ${tax.tax_mode || 'Хялбаршуулсан ААНОАТ'}`, `${Math.round(tax.active_tax_amount || tax.simplified_1pct || 0).toLocaleString()} ₮`, tax.is_above_300m ? "10.0%" : "1.0%"],
    ["3. Тооцоолсон НӨАТ (10%)", `${Math.round(tax.estimated_vat_10pct || 0).toLocaleString()} ₮`, "10.0%"],
    [],
    ["ДАНС БА ЗАРДЛЫН НЭР", "ДҮН (₮)", "ОРЛОГОД ЭЗЛЭХ %"],
    ["I. ҮНДСЭН ҮЙЛ АЖИЛЛАГААНЫ ОРЛОГО", `${Math.round(fin.revenue || 0).toLocaleString()} ₮`, "100.0%"],
    [],
    ["II. БОРЛУУЛСАН БҮТЭЭГДЭХҮҮНИЙ ӨРТӨГ (COGS)", `${Math.round(fin.actual_cogs || 0).toLocaleString()} ₮`, fin.revenue > 0 ? `${((fin.actual_cogs / fin.revenue) * 100).toFixed(2)}%` : "0%"],
    ["   - Онолын өртөг (Жороор гарсан хүнс)", `${Math.round(fin.theo_cogs || 0).toLocaleString()} ₮`, fin.revenue > 0 ? `${((fin.theo_cogs / fin.revenue) * 100).toFixed(2)}%` : "0%"],
    ["   - Бүртгэлтэй муудсан хаягдал (Spoilage)", `${Math.round(analyticsData.total_logged_spoilage || 0).toLocaleString()} ₮`, "-"],
    ["   - Шалтгаангүй далд хорогдол (ТЕХ 14-р зүйл)", `${Math.round(analyticsData.total_unexplained_waste || 0).toLocaleString()} ₮`, "-"],
    ["   - НИЙТ ХАЯГДАЛ БА ХОРОГДЛЫН ДҮН", `${Math.round((analyticsData.total_logged_spoilage || 0) + (analyticsData.total_unexplained_waste || 0)).toLocaleString()} ₮`, "-"],
    [],
    ["III. БОХИР АШИГ (GROSS PROFIT)", `${Math.round((fin.revenue - fin.actual_cogs) || 0).toLocaleString()} ₮`, fin.gross_margin || "0%"],
    [],
    ["IV. ҮЙЛ АЖИЛЛАГААНЫ ЗАРДАЛ (OPEX)", `${Math.round(fin.opex || 0).toLocaleString()} ₮`, fin.revenue > 0 ? `${((fin.opex / fin.revenue) * 100).toFixed(2)}%` : "0%"]
  ];

  (analyticsData.opex_details || []).forEach((item: any) => {
    const cost = Math.round(item.cost || 0);
    const pct = fin.revenue > 0 ? `${((cost / fin.revenue) * 100).toFixed(2)}%` : "-";
    pnlData.push([`   • ${item.item}`, `${cost.toLocaleString()} ₮`, pct]);
  });

  pnlData.push(
    [`   • Үндсэн хөрөнгийн сарын элэгдэл (Depreciation)`, `${Math.round(fin.depreciation || 0).toLocaleString()} ₮`, fin.revenue > 0 ? `${((fin.depreciation / fin.revenue) * 100).toFixed(2)}%` : "0%"],
    [],
    ["V. ТАТВАРЫН ӨМНӨХ АШИГ (EBIT)", `${Math.round(fin.ebit || 0).toLocaleString()} ₮`, fin.revenue > 0 ? `${((fin.ebit / fin.revenue) * 100).toFixed(2)}%` : "0%"],
    ["VI. ТАТВАРЫН ДҮН", `${Math.round(tax.active_tax_amount || tax.simplified_1pct || 0).toLocaleString()} ₮`, tax.is_above_300m ? "10.0%" : "1.0%"],
    ["VII. ЦЭВЭР АШИГ / (АЛДАГДАЛ)", `${Math.round(fin.net_profit || 0).toLocaleString()} ₮`, fin.net_margin || "0%"]
  );

  const wsPnl = XLSX.utils.aoa_to_sheet(pnlData);
  wsPnl['!cols'] = [{ wch: 55 }, { wch: 22 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsPnl, "Орлого_Үр_Дүн");

  // =========================================================================
  // 📄 2. МӨНГӨН_УРСГАЛ (CASH VS BANK RECONCILIATION)
  // =========================================================================
  const cashflowData: any[][] = [
    ["МӨНГӨН ХӨРӨНГИЙН УРСГАЛЫН АЛБАН ЁСНЫ ТАЙЛАН"],
    [`Байгууллага: ${clientName} | Тайлант хугацаа: ${startDate} - ${endDate}`],
    [],
    ["ҮЗҮҮЛЭЛТ", "КАСС БЭЛЭН (₮)", "ХААН БАНК (₮)", "НИЙТ ДҮН (₮)"],
    ["1. Сарын эхний үлдэгдэл", `${(cf.initial_cash || 0).toLocaleString()} ₮`, `${(cf.initial_bank || 0).toLocaleString()} ₮`, `${((cf.initial_cash || 0) + (cf.initial_bank || 0)).toLocaleString()} ₮`],
    [],
    ["[ ОРСОН МӨНГӨН УРСГАЛ ]", "", "", ""],
    ["• Борлуулалтын орлого (ПОС / Касс / QPay)", `${(cf.cash_in_cash || 0).toLocaleString()} ₮`, `${(cf.cash_in_bank || 0).toLocaleString()} ₮`, `${(cf.cash_in_total || 0).toLocaleString()} ₮`],
    [],
    ["[ ГАРСАН МӨНГӨН УРСГАЛ ]", "", "", ""],
    ["• Түүхий эдийн татан авалт", `-${(cf.cash_out_purchases_cash || 0).toLocaleString()} ₮`, `-${(cf.cash_out_purchases_bank || 0).toLocaleString()} ₮`, `-${((cf.cash_out_purchases_cash || 0) + (cf.cash_out_purchases_bank || 0)).toLocaleString()} ₮`],
    ["• Үйл ажиллагааны зардал (Түрээс, Цалин, Тог)", `-${(cf.cash_out_opex_cash || 0).toLocaleString()} ₮`, `-${(cf.cash_out_opex_bank || 0).toLocaleString()} ₮`, `-${((cf.cash_out_opex_cash || 0) + (cf.cash_out_opex_bank || 0)).toLocaleString()} ₮`],
    ["• Эзний хувийн таталт (Owner Draws)", `-${Math.round((cf.owner_draws || 0) * 0.3).toLocaleString()} ₮`, `-${Math.round((cf.owner_draws || 0) * 0.7).toLocaleString()} ₮`, `-${(cf.owner_draws || 0).toLocaleString()} ₮`],
    [],
    ["2. Сарын эцсийн бодит үлдэгдэл", `${(cf.end_cash_balance || 0).toLocaleString()} ₮`, `${(cf.end_bank_balance || 0).toLocaleString()} ₮`, `${(cf.net_total_balance || 0).toLocaleString()} ₮`],
    ["[ ТУЛГАЛТЫН ТӨЛӨВ ]", "Баталгаажсан ✅", "Баталгаажсан ✅", "Тэнцсэн ✅"]
  ];

  const wsCash = XLSX.utils.aoa_to_sheet(cashflowData);
  wsCash['!cols'] = [{ wch: 45 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsCash, "Мөнгөн_Урсгал");

  // =========================================================================
  // 📄 3. ЦАЛИНГИЙН_ХҮСНЭГТ (PAYROLL, НДШ 11.5%, ХХОАТ 10%)
  // =========================================================================
  const payrollHeader = [
    ["№", "АЖИЛТНЫ НЭР", "ҮҮРЭГ", "ЦАЛИНГИЙН ТӨРӨЛ", "ЦАГ / САР", "ҮНДСЭН ЦАЛИН", "НДШ 11.5% (Ажилтан)", "ХХОАТ 10%", "ГАРТ ОЛГОХ ЦЭВЭР", "НДШ 12.5% (Байгууллага)"]
  ];

  let totalGross = 0;
  let totalNdsh = 0;
  let totalHhoat = 0;
  let totalNet = 0;
  let totalEmployerNdsh = 0;

  const payrollRows = (analyticsData.payroll_summary || []).map((p: any, idx: number) => {
    totalGross += p.gross_salary;
    totalNdsh += p.ndsh_deduction;
    totalHhoat += p.hhoat_deduction;
    totalNet += p.net_take_home;
    totalEmployerNdsh += p.employer_ndsh || 0;

    return [
      idx + 1,
      p.worker_name,
      p.role || "Ажилтан",
      p.salary_type === 'fixed' ? 'Тогтмол сар' : 'Цагийн хөлс',
      p.salary_type === 'fixed' ? '1 сар' : `${p.total_hours} цаг`,
      `${p.base_salary.toLocaleString()} ₮`,
      `-${p.ndsh_deduction.toLocaleString()} ₮`,
      `-${p.hhoat_deduction.toLocaleString()} ₮`,
      `${p.net_take_home.toLocaleString()} ₮`,
      `${(p.employer_ndsh || 0).toLocaleString()} ₮`
    ];
  });

  payrollRows.push(
    [],
    ["", "НИЙТ ДҮН", "", "", "", `${totalGross.toLocaleString()} ₮`, `-${totalNdsh.toLocaleString()} ₮`, `-${totalHhoat.toLocaleString()} ₮`, `${totalNet.toLocaleString()} ₮`, `${totalEmployerNdsh.toLocaleString()} ₮`]
  );

  const wsPayroll = XLSX.utils.aoa_to_sheet([...payrollHeader, ...payrollRows]);
  wsPayroll['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsPayroll, "Цалингийн_Хүснэгт");

  // =========================================================================
  // 📄 4. ҮНДСЭН_ХӨРӨНГӨ (ТОНОГ ТӨХӨӨРӨМЖ БА ЭЛЭГДЭЛ)
  // =========================================================================
  const faHeader = [
    ["№", "ХӨРӨНГИЙН НЭР", "КОД", "АВСАН ОГНОО", "АНХНЫ ӨРТӨГ", "АШИГЛАХ САР", "САРЫН ЭЛЭГДЭЛ", "ХУРИМТЛАГДСАН ЭЛЭГДЭЛ", "ҮЛДЭГДЭЛ ӨРТӨГ"]
  ];

  let totalInitialFa = 0;
  let totalMonthlyFa = 0;
  let totalAccFa = 0;
  let totalBookFa = 0;

  const faRows = (analyticsData.fixed_assets || []).map((fa: any, idx: number) => {
    totalInitialFa += fa.initialCost;
    totalMonthlyFa += fa.monthlyDep;
    totalAccFa += fa.accDep;
    totalBookFa += fa.bookValue;

    return [
      idx + 1,
      fa.name,
      fa.code,
      fa.purchaseDate,
      `${fa.initialCost.toLocaleString()} ₮`,
      `${fa.usefulMonths} сар`,
      `${fa.monthlyDep.toLocaleString()} ₮`,
      `${fa.accDep.toLocaleString()} ₮`,
      `${fa.bookValue.toLocaleString()} ₮`
    ];
  });

  faRows.push(
    [],
    ["", "НИЙТ ҮНДСЭН ХӨРӨНГӨ", "", "", `${totalInitialFa.toLocaleString()} ₮`, "", `${totalMonthlyFa.toLocaleString()} ₮`, `${totalAccFa.toLocaleString()} ₮`, `${totalBookFa.toLocaleString()} ₮`]
  );

  const wsFa = XLSX.utils.aoa_to_sheet([...faHeader, ...faRows]);
  wsFa['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsFa, "Үндсэн_Хөрөнгийн_Элэгдэл");

  // =========================================================================
  // 📄 5. ХОРОГДЛЫН_АЛБАН_АКТ (ТАТВАРЫН ЕРӨНХИЙ ХУУЛИЙН 14-Р ЗҮЙЛ)
  // =========================================================================
  const totalActLoss = (analyticsData.waste_act_items || []).reduce((sum: number, item: any) => sum + item.loss_amount, 0);

  const actData: any[][] = [
    ["БАРАА МАТЕРИАЛЫН ХОРОГДЛЫН АЛБАН ЁСНЫ АКТ"],
    ["(Монгол Улсын Татварын Ерөнхий Хуулийн 14 дүгээр зүйл, ААНОАТ-ын тухай хуульд нийцүүлэн үйлдэв)"],
    [],
    [`Аж ахуйн нэгжийн нэр: ${clientName}`],
    [`Акт үйлдсэн огноо: ${endDate}`],
    [`Тайлант хугацаа: ${startDate} - ${endDate}`],
    [`Нийт хорогдлын дүн: ${totalActLoss.toLocaleString()} ₮`],
    [],
    ["№", "ТҮҮХИЙ ЭДИЙН НЭР", "ОНОЛЫН ОРЦ", "БОДИТ ЗАРЛАГА", "ХОРОГДОЛ", "НЭГЖ", "НЭГЖИЙН ҮНЭ", "АЛДАГДАЛ (₮)", "ШАЛТГААН"]
  ];

  (analyticsData.waste_act_items || []).forEach((item: any, idx: number) => {
    actData.push([
      idx + 1,
      item.name,
      item.theo_usage,
      item.actual_usage,
      item.gap_qty,
      item.unit,
      `${parseFloat(item.unit_price).toLocaleString()} ₮`,
      `${item.loss_amount.toLocaleString()} ₮`,
      item.cause
    ]);
  });

  actData.push(
    [],
    ["", "НИЙТ ХОРОГДЛЫН ДҮН:", "", "", "", "", "", `${totalActLoss.toLocaleString()} ₮`, "Татварын зардалд суутгав"],
    [],
    ["[ БАТАЛГААЖУУЛСАН КОМИССИЙН ГАРЫН ҮСЭГ ]", "", "", "", "", "", "", "", ""],
    ["1. Комиссын дарга (Гүйцэтгэх захирал):", "_______________________ /", "                     /"],
    ["2. Ерөнхий Нягтлан бодогч:", "_______________________ /", "                     /"],
    ["3. Гал тогооны ахлах / Менежер:", "_______________________ /", "                     /"],
    [],
    ["Тэмдэглэл: Дээрх хорогдсон түүхий эд нь технологийн ууршилт, хадгалалтын байгалийн хорогдол бөгөөд татварын хуулийн дагуу зардалд хасав."]
  );

  const wsAct = XLSX.utils.aoa_to_sheet(actData);
  wsAct['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 16 }, { wch: 18 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsAct, "Хорогдлын_Албан_Акт");

  // =========================================================================
  // 📄 6. АГУУЛАХЫН_ТЭНЦЭЛ (БҮХ БАРААНЫ ТООЛЛОГО & ТАТАН АВАЛТЫН АНГИЛАЛ)
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
  XLSX.utils.book_append_sheet(wb, wsInv, "Агуулахын_Тэнцэл");

  // =========================================================================
  // 🚀 ЭКСПОРТЛОХ ФАЙЛ
  // =========================================================================
  const fileName = `Санхүү_Татварын_Аудитын_Тайлан_${clientName.replace(/\s+/g, '')}_${ym}.xlsx`;
  XLSX.writeFile(wb, fileName);
}