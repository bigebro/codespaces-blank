export interface ShiftLogInput {
  id: string;
  character_role?: string;
  start_time: string;
  end_time?: string | null;
  daily_tasks_checklist?: any;
  pos_z_image_url?: string | null;
}

export interface WorkerProfileInput {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string;
  salary_type?: string | null;
  base_rate?: number | null;
}

export function calculateStaffPayroll(
  shifts: ShiftLogInput[],
  profiles: WorkerProfileInput[]
) {
  const staffHoursMap: Record<
    string,
    { role: string; totalMinutes: number; shiftCount: number }
  > = {};

  shifts.forEach((shift) => {
    if (shift.start_time && shift.end_time) {
      const workerKey = shift.character_role || "Ажилтан";
      const start = new Date(shift.start_time).getTime();
      const end = new Date(shift.end_time).getTime();
      const durationMins = Math.max(0, Math.floor((end - start) / (1000 * 60)));

      if (!staffHoursMap[workerKey]) {
        staffHoursMap[workerKey] = {
          role: workerKey,
          totalMinutes: 0,
          shiftCount: 0,
        };
      }
      staffHoursMap[workerKey].totalMinutes += durationMins;
      staffHoursMap[workerKey].shiftCount += 1;
    }
  });

  return Object.keys(staffHoursMap).map((worker) => {
    const data = staffHoursMap[worker];
    const matchedProfile = profiles.find(
      (p) =>
        (p.full_name && worker.includes(p.full_name)) ||
        (p.email && worker.includes(p.email.split("@")[0]))
    );

    const isFixed = matchedProfile?.salary_type === "fixed";
    const rate = Number(matchedProfile?.base_rate) || (isFixed ? 1_200_000 : 6500);

    const hoursDecimal = Math.round((data.totalMinutes / 60) * 10) / 10;
    const baseSalary = isFixed ? Math.round(rate) : Math.round(hoursDecimal * rate);

    const ndshDeduction = Math.round(baseSalary * 0.115);
    const employerNdsh = Math.round(baseSalary * 0.125);
    const hhoatRaw = Math.round((baseSalary - ndshDeduction) * 0.1);
    const hhoatDeduction = Math.max(0, hhoatRaw - 30_000);
    const netTakeHome = baseSalary - ndshDeduction - hhoatDeduction;

    return {
      worker_name: worker,
      shift_count: data.shiftCount,
      total_hours: hoursDecimal,
      salary_type: isFixed ? "fixed" : "hourly",
      hourly_rate: rate,
      base_salary: baseSalary,
      ndsh_deduction: ndshDeduction,
      employer_ndsh: employerNdsh,
      hhoat_deduction: hhoatDeduction,
      net_take_home: netTakeHome,
    };
  });
}

export function compileWorkerFraudMatrix(inventoryLogs: any[]) {
  const matrix: Record<
    string,
    { totalIncidents: number; totalLossAmount: number; incidents: any[] }
  > = {};

  inventoryLogs.forEach((log) => {
    if (
      log.incident_type === "previous_shift_damage" &&
      log.reported_against_worker
    ) {
      const worker = log.reported_against_worker.trim();
      if (!matrix[worker]) {
        matrix[worker] = { totalIncidents: 0, totalLossAmount: 0, incidents: [] };
      }
      const loss = Math.abs(Number(log.total_cost) || 0);
      matrix[worker].totalIncidents += 1;
      matrix[worker].totalLossAmount += loss;
      matrix[worker].incidents.push({
        date: log.date,
        reporter: log.worker_name,
        notes: log.notes,
        loss_amount: loss,
      });
    }
  });

  return matrix;
}