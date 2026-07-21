// --- Real-Time Data Store ---
let socket;
try {
    socket = io();
} catch(e) {
    console.error("Socket.IO failed to initialize. App will run in local-only mode.", e);
    socket = {
        on: () => {},
        emit: () => {}
    }; // Dummy object to prevent further crashes
}

let staffList = [];
let shops = [];
let payments = [];
let techPayouts = [];
let eodDistributions = [];
let currentUser = null;
let adminWallet = { balance: 0, pendingTech: 0, pendingDelivery: 0, deliveryReserve: 0 };
let commissionSettings = { admin: 60, delivery: 40, tech: 10 };
let dailyAttendance = {}; 
let attendanceHistory = {}; // YYYY-MM-DD -> { staffId: status }
let pendingAudit = null;
let ceoSalariesPaid = [];
let absenteeDeductions = [];
let walletTransfers = [];
let dailySalaryReports = [];
let auditorSignature = null;
let emiCreditsHistory = [];
let ceoLowPayThreshold = 380;
let cibilLoanCutoff = 150;
let dailyDeliveries = {}; // staffId -> orderCount
let leaveRequests = []; // All leave requests
let otpLogs = []; // OTP submissions
let idCards = []; // Staff ID Cards
let lastAttendanceDate = ''; // YYYY-MM-DD
let officialAnnouncements = [];

let loanApplications = []; // Loan Management
let staffComplaints = []; // Complaints Management
let barcodeAttendanceLogs = []; // Barcode Attendance
let ceoDigitalSignature = ""; 
let omSignature = null;
let fmSignature = null;
let mdSignature = null;
let agencyTimings = { checkInStart: '09:00', checkInEnd: '10:30', checkOutStart: '18:00', checkOutEnd: '20:00', halfDayMinutes: 240 }; // Configurable Timings

// Listen for initial state from MongoDB on connection
let appInitialized = false;

function handleInitialState(state) {
    appInitialized = true;
    if (Object.keys(state).length > 0) {
        staffList = state.staffList || [];
        shops = state.shops || [];
        payments = state.payments || [];
        techPayouts = state.techPayouts || [];
        eodDistributions = state.eodDistributions || [];
        adminWallet = state.adminWallet || { balance: 0, pendingTech: 0, pendingDelivery: 0, deliveryReserve: 0 };
        commissionSettings = state.commissionSettings || { admin: 60, delivery: 40, tech: 10 };
        dailyAttendance = state.dailyAttendance || {};
        attendanceHistory = state.attendanceHistory || {};
        pendingAudit = state.pendingAudit || null;
        ceoSalariesPaid = state.ceoSalariesPaid || [];
        absenteeDeductions = state.absenteeDeductions || [];
        walletTransfers = state.walletTransfers || [];
    dailySalaryReports = state.dailySalaryReports || [];
    auditorSignature = state.auditorSignature || null;
        emiCreditsHistory = state.emiCreditsHistory || [];
        ceoLowPayThreshold = state.ceoLowPayThreshold || 380;
        cibilLoanCutoff = state.cibilLoanCutoff || 150;
        dailyDeliveries = state.dailyDeliveries || {};
        leaveRequests = state.leaveRequests || [];
        otpLogs = state.otpLogs || [];
        if (state.idCards) idCards = state.idCards;
        if (state.loanApplications) loanApplications = state.loanApplications;
        if (state.staffComplaints) staffComplaints = state.staffComplaints;
        if (state.barcodeAttendanceLogs) barcodeAttendanceLogs = state.barcodeAttendanceLogs;
        if (state.agencyTimings) agencyTimings = state.agencyTimings;
        if (state.ceoDigitalSignature !== undefined) ceoDigitalSignature = state.ceoDigitalSignature;
        if (state.omSignature !== undefined) omSignature = state.omSignature;
        if (state.fmSignature !== undefined) fmSignature = state.fmSignature;
        if (state.mdSignature !== undefined) mdSignature = state.mdSignature;
        if (state.officialAnnouncements !== undefined) officialAnnouncements = state.officialAnnouncements;
        lastAttendanceDate = state.lastAttendanceDate || '';
    } else {
        // Cloud is empty. Automatically check local storage to migrate.
        const localStaff = JSON.parse(localStorage.getItem('aura_staff')) || [];
        const localShops = JSON.parse(localStorage.getItem('aura_shops')) || [];
        const localPayments = JSON.parse(localStorage.getItem('aura_payments')) || [];
        const localTechPayouts = JSON.parse(localStorage.getItem('aura_tech_payouts')) || [];
        const localEodDistributions = JSON.parse(localStorage.getItem('aura_eod_distributions')) || [];
        const localAdminWallet = JSON.parse(localStorage.getItem('aura_admin_wallet')) || { balance: 0, pendingTech: 0, pendingDelivery: 0, deliveryReserve: 0 };
        const localCommissionSettings = JSON.parse(localStorage.getItem('aura_commission_settings')) || { admin: 60, delivery: 40, tech: 10 };
        const localDailyAttendance = JSON.parse(localStorage.getItem('aura_daily_attendance')) || {};
        const localAttendanceHistory = JSON.parse(localStorage.getItem('aura_attendance_history')) || {};
        const localPendingAudit = JSON.parse(localStorage.getItem('aura_pending_audit')) || null;
        const localCeoSalaries = JSON.parse(localStorage.getItem('aura_ceo_salaries')) || [];
        const localAbsenteeDeductions = JSON.parse(localStorage.getItem('aura_absentee_deductions')) || [];
        const localWalletTransfers = JSON.parse(localStorage.getItem('aura_wallet_transfers')) || [];
        const localEmiCredits = JSON.parse(localStorage.getItem('aura_emi_credits')) || [];
        const localCeoLowPay = JSON.parse(localStorage.getItem('aura_ceo_lowpay_threshold')) || 380;
        const localCibilLoanCutoff = JSON.parse(localStorage.getItem('aura_cibil_loan_cutoff')) || 150;
        const localDailyDeliveries = JSON.parse(localStorage.getItem('aura_daily_deliveries')) || {};
        const localLeaveReqs = JSON.parse(localStorage.getItem('aura_leave_requests')) || [];
        const localOtpLogs = JSON.parse(localStorage.getItem('aura_otp_logs')) || [];
        const localIdCards = JSON.parse(localStorage.getItem('aura_id_cards')) || [];
        const localLoanApps = JSON.parse(localStorage.getItem('aura_loan_applications')) || [];
        const localStaffComplaints = JSON.parse(localStorage.getItem('aura_staff_complaints')) || [];
        const localBarcodeLogs = JSON.parse(localStorage.getItem('aura_barcode_logs')) || [];
        const localAgencyTimings = JSON.parse(localStorage.getItem('aura_agency_timings')) || { checkInStart: '09:00', checkInEnd: '10:30', checkOutStart: '18:00', checkOutEnd: '20:00', halfDayMinutes: 240 };
        ceoDigitalSignature = localStorage.getItem('aura_ceo_signature') || "";
        omSignature = JSON.parse(localStorage.getItem('aura_om_sig')) || null;
        fmSignature = JSON.parse(localStorage.getItem('aura_fm_sig')) || null;
        mdSignature = JSON.parse(localStorage.getItem('aura_md_sig')) || null;
        officialAnnouncements = JSON.parse(localStorage.getItem('aura_official_announcements')) || [];
        lastAttendanceDate = localStorage.getItem('aura_last_attendance_date') || '';
        const localDailySalaryReports = JSON.parse(localStorage.getItem('aura_daily_salary_reports')) || [];
        const localAuditorSig = JSON.parse(localStorage.getItem('aura_auditor_sig')) || null;
        
        if (localStaff.length > 0) {
            console.log("Cloud is empty. Automatically migrating local data to cloud.");
            staffList = localStaff;
            shops = localShops;
            payments = localPayments;
            techPayouts = localTechPayouts;
            eodDistributions = localEodDistributions;
            adminWallet = localAdminWallet;
            commissionSettings = localCommissionSettings;
            dailyAttendance = localDailyAttendance;
            attendanceHistory = localAttendanceHistory;
            pendingAudit = localPendingAudit;
            ceoSalariesPaid = localCeoSalaries;
            absenteeDeductions = localAbsenteeDeductions;
            walletTransfers = localWalletTransfers;
            emiCreditsHistory = localEmiCredits;
            ceoLowPayThreshold = localCeoLowPay;
            dailyDeliveries = localDailyDeliveries;
            leaveRequests = localLeaveReqs;
            otpLogs = localOtpLogs;
            idCards = localIdCards;
            loanApplications = localLoanApps;
            staffComplaints = localStaffComplaints;
            barcodeAttendanceLogs = localBarcodeLogs;
            agencyTimings = localAgencyTimings;
            dailySalaryReports = localDailySalaryReports;
            auditorSignature = localAuditorSig;
            
            saveData(); // Push to MongoDB immediately
        }
    }
    checkAndResetDailyData();
    initApp(); // Start the app once data is loaded
}

socket.on('initialState', handleInitialState);

// Offline fallback for local testing
setTimeout(() => {
    if (!appInitialized) {
        console.warn("Backend socket server unreachable. Falling back to local offline mode.");
        handleInitialState({});
    }
}, 1500);

// Listen for real-time updates from other computers
socket.on('stateUpdated', (state) => {
    staffList = state.staffList || [];
    shops = state.shops || [];
    payments = state.payments || [];
    techPayouts = state.techPayouts || [];
    eodDistributions = state.eodDistributions || [];
    adminWallet = state.adminWallet || { balance: 0, pendingTech: 0, pendingDelivery: 0, deliveryReserve: 0 };
    commissionSettings = state.commissionSettings || { admin: 60, delivery: 40, tech: 10 };
    dailyAttendance = state.dailyAttendance || {};
    attendanceHistory = state.attendanceHistory || {};
    pendingAudit = state.pendingAudit || null;
    ceoSalariesPaid = state.ceoSalariesPaid || [];
    absenteeDeductions = state.absenteeDeductions || [];
    walletTransfers = state.walletTransfers || [];
    dailySalaryReports = state.dailySalaryReports || [];
    auditorSignature = state.auditorSignature || null;
    emiCreditsHistory = state.emiCreditsHistory || [];
    ceoLowPayThreshold = state.ceoLowPayThreshold || 380;
    cibilLoanCutoff = state.cibilLoanCutoff || 150;
    dailyDeliveries = state.dailyDeliveries || {};
    leaveRequests = state.leaveRequests || [];
    otpLogs = state.otpLogs || [];
    idCards = state.idCards || [];
    loanApplications = state.loanApplications || [];
    barcodeAttendanceLogs = state.barcodeAttendanceLogs || [];
    agencyTimings = state.agencyTimings || { checkInStart: '09:00', checkInEnd: '10:30', checkOutStart: '18:00', checkOutEnd: '20:00', halfDayMinutes: 240 };
    lastAttendanceDate = state.lastAttendanceDate || '';
    officialAnnouncements = state.officialAnnouncements || [];

    // Re-sync currentUser from the updated staffList so earnings/loans are always fresh
    if (typeof window.rehydrateSignatures === 'function') window.rehydrateSignatures();
    if (currentUser) {
        const updatedUser = staffList.find(s => s.id === currentUser.id);
        if (updatedUser) {
            // Repair or preserve the mapped internal role
            let mappedRole = currentUser.role;
            if (['Managing Director (MD)', 'Finance Manager', 'Operations Manager', 'Auditor', 'Webcam Staff'].includes(updatedUser.role)) {
                if (updatedUser.role === 'Managing Director (MD)') mappedRole = 'md';
                if (updatedUser.role === 'Finance Manager') mappedRole = 'finance';
                if (updatedUser.role === 'Operations Manager') mappedRole = 'operations';
                if (updatedUser.role === 'Auditor') mappedRole = 'auditor';
                if (updatedUser.role === 'Webcam Staff') mappedRole = 'webcam';
            }
            
            const isAdmin = currentUser.isAdmin;
            const originalRole = currentUser.originalRole;
            currentUser = { ...updatedUser, role: mappedRole, isAdmin, originalRole };
            sessionStorage.setItem('aura_session', JSON.stringify(currentUser));
        }

        if (document.getElementById('staff-dashboard') && document.getElementById('staff-dashboard').classList.contains('active')) {
            refreshStaffData();
        }
        if (currentUser.isAdmin || ['ceo', 'md', 'finance', 'auditor', 'operations'].includes(currentUser.role)) {
            refreshAdminData();
            if (typeof window.renderCEOComplaints === 'function') window.renderCEOComplaints();
            if (typeof window.renderCEOAnnouncements === 'function') window.renderCEOAnnouncements();
        }
    }
});

// Helper: Save Data to Cloud
const saveData = () => {
    const fullState = {
        staffList, shops, payments, techPayouts, eodDistributions,
        adminWallet, commissionSettings, dailyAttendance, pendingAudit,
        ceoSalariesPaid, absenteeDeductions, walletTransfers, emiCreditsHistory, ceoLowPayThreshold, cibilLoanCutoff, dailyDeliveries,
        attendanceHistory,
        leaveRequests,
        otpLogs,
        idCards,
        loanApplications,
        staffComplaints,
        barcodeAttendanceLogs,
        agencyTimings,
        ceoDigitalSignature,
        omSignature,
        fmSignature,
        mdSignature,
        omSignature,
        fmSignature,
        mdSignature,
        lastAttendanceDate,
        dailySalaryReports,
        auditorSignature,
        officialAnnouncements
    };
    socket.emit('updateState', fullState);
    
    // Fallback save to localStorage just in case
    localStorage.setItem('aura_staff', JSON.stringify(staffList));
    localStorage.setItem('aura_shops', JSON.stringify(shops));
    localStorage.setItem('aura_payments', JSON.stringify(payments));
    localStorage.setItem('aura_tech_payouts', JSON.stringify(techPayouts));
    localStorage.setItem('aura_eod_distributions', JSON.stringify(eodDistributions));
    localStorage.setItem('aura_admin_wallet', JSON.stringify(adminWallet));
    localStorage.setItem('aura_commission_settings', JSON.stringify(commissionSettings));
    localStorage.setItem('aura_daily_attendance', JSON.stringify(dailyAttendance));
    localStorage.setItem('aura_pending_audit', JSON.stringify(pendingAudit));
    localStorage.setItem('aura_ceo_salaries', JSON.stringify(ceoSalariesPaid));
    localStorage.setItem('aura_absentee_deductions', JSON.stringify(absenteeDeductions));
    localStorage.setItem('aura_wallet_transfers', JSON.stringify(walletTransfers));
    localStorage.setItem('aura_emi_credits', JSON.stringify(emiCreditsHistory));
    localStorage.setItem('aura_ceo_lowpay_threshold', JSON.stringify(ceoLowPayThreshold));
    localStorage.setItem('aura_cibil_loan_cutoff', JSON.stringify(cibilLoanCutoff));
    localStorage.setItem('aura_daily_deliveries', JSON.stringify(dailyDeliveries));
    localStorage.setItem('aura_attendance_history', JSON.stringify(attendanceHistory));
    localStorage.setItem('aura_leave_requests', JSON.stringify(leaveRequests));
    localStorage.setItem('aura_otp_logs', JSON.stringify(otpLogs));
    localStorage.setItem('aura_id_cards', JSON.stringify(idCards));
    localStorage.setItem('aura_loan_applications', JSON.stringify(loanApplications));
    localStorage.setItem('aura_staff_complaints', JSON.stringify(staffComplaints));
    localStorage.setItem('aura_barcode_logs', JSON.stringify(barcodeAttendanceLogs));
    localStorage.setItem('aura_agency_timings', JSON.stringify(agencyTimings));
    localStorage.setItem('aura_ceo_signature', ceoDigitalSignature);
    localStorage.setItem('aura_om_sig', JSON.stringify(omSignature));
    localStorage.setItem('aura_fm_sig', JSON.stringify(fmSignature));
    localStorage.setItem('aura_md_sig', JSON.stringify(mdSignature));
    localStorage.setItem('aura_last_attendance_date', lastAttendanceDate);
    localStorage.setItem('aura_daily_salary_reports', JSON.stringify(dailySalaryReports));
    localStorage.setItem('aura_auditor_sig', JSON.stringify(auditorSignature));
    localStorage.setItem('aura_official_announcements', JSON.stringify(officialAnnouncements));
};

// Periodically check for new day
const checkAndResetDailyData = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    let shouldReset = false;
    if (lastAttendanceDate && lastAttendanceDate !== todayStr) {
        shouldReset = true;
    } else if (!lastAttendanceDate) {
        const hasAttendanceData = Object.keys(dailyAttendance).length > 0;
        const hasHistoryToday = attendanceHistory[todayStr] && Object.keys(attendanceHistory[todayStr]).length > 0;
        if (hasAttendanceData && !hasHistoryToday) {
            shouldReset = true;
        }
    }

    if (shouldReset) {
        dailyAttendance = {};
        dailyDeliveries = {};
        lastAttendanceDate = todayStr;
        saveData();
        
        if (typeof window.rehydrateSignatures === 'function') window.rehydrateSignatures();
        if (currentUser) {
            if (['md', 'operations', 'webcam'].includes(currentUser.role)) {
                refreshAdminData();
            } else if (currentUser.role === 'finance') {
                // do nothing for now
            } else {
                if (typeof refreshStaffData === 'function') refreshStaffData();
            }
        }
    } else if (!lastAttendanceDate) {
        lastAttendanceDate = todayStr;
        saveData();
    }
};

setInterval(checkAndResetDailyData, 60000); // Check every minute

// Helper: Generate ID
const generateId = (prefix) => prefix + Math.floor(Math.random() * 10000).toString().padStart(4, '0');

// Helper: Toast
const showToast = (message) => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// --- DOM Elements ---
const screens = {
    auth: document.getElementById('auth-screen'),
    admin: document.getElementById('admin-dashboard'),
    staff: document.getElementById('staff-dashboard')
};

// --- Navigation & Routing ---
const showScreen = (screenName) => {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
    
    if(screenName === 'admin') {
        applyRBAC();
        refreshAdminData();
    }
    if(screenName === 'staff') {
        if(window.closeStaffModules) window.closeStaffModules();
        refreshStaffData();
    }
};

const applyRBAC = () => {
    if (!currentUser || !currentUser.isAdmin) return;
    
    const role = currentUser.role;
    
    // Define tab permissions    // RBAC Map
    const permissions = {
        superadmin: ['admin-register', 'admin-shops', 'admin-assign', 'admin-attendance', 'admin-payments', 'admin-reports', 'admin-leaves', 'admin-idcards', 'admin-loans', 'admin-md', 'admin-ceo'],
        ceo: ['admin-ceo', 'admin-register', 'admin-shops', 'admin-assign', 'admin-attendance', 'admin-payments', 'admin-reports', 'admin-leaves', 'admin-idcards', 'admin-loans'],
        md: ['admin-md', 'admin-shops', 'admin-assign', 'admin-attendance', 'admin-payments', 'admin-reports', 'admin-leaves', 'admin-idcards', 'admin-loans'],
        finance: ['admin-register', 'admin-loans', 'admin-payments'],
        operations: ['admin-assign', 'admin-attendance', 'admin-leaves', 'admin-idcards'],
        auditor: ['admin-reports'],
        webcam: ['admin-attendance']
    };
    
    const allowedTabs = permissions[role] || [];
    
    // Hide/Show Analytics
    const analyticsPanel = document.getElementById('analytics-overview');
    if(analyticsPanel) {
        analyticsPanel.style.display = (role === 'superadmin' || role === 'ceo' || role === 'md') ? 'block' : 'none';
    }
    
    // Hide/Show Nav Buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target) {
            if(allowedTabs.includes(btn.dataset.target)) {
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'none';
            }
        }
    });
    
    // Hide/Show Section Content and automatically click the first allowed tab
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    if(allowedTabs.length > 0) {
        const firstAllowed = allowedTabs[0];
        document.getElementById(firstAllowed).classList.add('active');
        const activeBtn = document.querySelector(`.nav-btn[data-target="${firstAllowed}"]`);
        if(activeBtn) activeBtn.classList.add('active');
    }
    
    // Hide manager roles in registration form if not CEO
    document.querySelectorAll('.manager-role-option').forEach(opt => {
        if(role === 'ceo') {
            opt.style.display = '';
            opt.disabled = false;
        } else {
            opt.style.display = 'none';
            opt.disabled = true;
        }
    });
    
    // Show back to staff button if manager
    const backBtn = document.getElementById('btn-back-to-staff');
    if (backBtn) {
        backBtn.style.display = currentUser && currentUser.originalRole ? 'inline-block' : 'none';
    }
};

// --- Attendance Logic ---
const renderAttendanceTable = () => {
    const tbody = document.getElementById('attendance-list-tbody');
    if(!tbody) return;
    
    if(staffList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #94a3b8;">No staff registered yet.</td></tr>`;
        return;
    }
    
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, -1);
    const todayStr = localISOTime.split('T')[0];

    tbody.innerHTML = staffList.map(staff => {
        // Check if staff has an approved leave for today
        const isOnLeaveToday = leaveRequests.some(lr => {
            if (lr.staffId !== staff.id || lr.status !== 'Approved') return false;
            return todayStr >= lr.startDate && todayStr <= lr.endDate;
        });

        let attData = dailyAttendance[staff.id];
        if (typeof attData === 'string') {
            attData = { status: attData, checkIn: null, checkOut: null, hours: null };
            dailyAttendance[staff.id] = attData;
        } else if (!attData) {
            attData = { status: 'Not Given Yet', checkIn: null, checkOut: null, hours: null };
        }
        
        let status = 'Present';
        if (isOnLeaveToday) {
            if (attData.status === 'Half') {
                status = 'Half';
            } else {
                status = 'Leave';
                if (attData.status !== 'Leave') {
                    attData.status = 'Leave';
                    dailyAttendance[staff.id] = attData;
                }
            }
        } else {
            status = attData.status;
        }
        
        const isWebcamStaff = currentUser && currentUser.role === 'webcam';
        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                <td style="padding: 1rem;">${staff.id}</td>
                <td style="padding: 1rem;">${staff.name}</td>
                <td style="padding: 1rem;"><span class="badge" style="background: ${staff.role === 'Technical' ? 'var(--secondary)' : 'var(--primary)'}">${staff.role}</span></td>
                <td style="padding: 1rem; text-align: center; color: #10b981;">${attData.checkIn || '-'}</td>
                <td style="padding: 1rem; text-align: center; color: #f59e0b;">${attData.checkOut || '-'}</td>
                <td style="padding: 1rem; text-align: center; font-weight: bold;">${attData.hours || '-'}</td>
                <td style="padding: 1rem; text-align: center;">
                    <select class="input-group attendance-select" data-id="${staff.id}" onchange="updateSingleAttendance(this)" style="margin: 0; padding: 0.5rem; width: auto; display: inline-block;" ${isWebcamStaff ? 'disabled' : ''}>
                        <option value="Not Given Yet" ${status === 'Not Given Yet' ? 'selected' : ''}>Not Given Yet</option>
                        <option value="Checked In" ${status === 'Checked In' ? 'selected' : ''}>Checked In (Working)</option>
                        <option value="Present" ${status === 'Present' ? 'selected' : ''}>Present</option>
                        <option value="Half" ${status === 'Half' ? 'selected' : ''}>Half Day</option>
                        <option value="Absent" ${status === 'Absent' ? 'selected' : ''}>Absent</option>
                        <option value="Leave" ${status === 'Leave' ? 'selected' : ''}>On Leave</option>
                    </select>
                </td>
            </tr>
        `;
    }).join('');

    const saveBtn = document.querySelector('#admin-attendance .btn-primary[onclick="saveAttendance()"]');
    if (saveBtn) {
        saveBtn.style.display = (currentUser && currentUser.role === 'webcam') ? 'none' : 'inline-block';
    }
    
    // Agency Timings Panel
    const timingsPanel = document.getElementById('agency-timings-panel');
    if (timingsPanel) {
        if (currentUser && currentUser.role === 'webcam') {
            timingsPanel.style.display = 'none';
        } else {
            timingsPanel.style.display = 'block';
            document.getElementById('timing-checkin-start').value = agencyTimings.checkInStart || '09:00';
            document.getElementById('timing-checkin-end').value = agencyTimings.checkInEnd || '10:30';
            document.getElementById('timing-checkout-start').value = agencyTimings.checkOutStart || '18:00';
            document.getElementById('timing-checkout-end').value = agencyTimings.checkOutEnd || '20:00';
            document.getElementById('timing-halfday-minutes').value = agencyTimings.halfDayMinutes || 240;
        }
    }

    // Force browser DOM to sync visually with state
    setTimeout(() => {
        const selects = tbody.querySelectorAll('.attendance-select');
        selects.forEach(select => {
            const staffId = select.getAttribute('data-id');
            // If on leave, state was forced to Absent or Half above. 
            let attData = dailyAttendance[staffId];
            let status = attData && typeof attData === 'object' ? attData.status : (attData || 'Not Given Yet');
            select.value = status;
        });
    }, 10);
};

window.saveAgencyTimings = () => {
    agencyTimings = {
        checkInStart: document.getElementById('timing-checkin-start').value || '09:00',
        checkInEnd: document.getElementById('timing-checkin-end').value || '10:30',
        checkOutStart: document.getElementById('timing-checkout-start').value || '18:00',
        checkOutEnd: document.getElementById('timing-checkout-end').value || '20:00',
        halfDayMinutes: parseInt(document.getElementById('timing-halfday-minutes').value) || 240
    };
    saveData();
    showToast('Agency Timings Updated');
};

window.saveAttendance = () => {
    const selects = document.querySelectorAll('.attendance-select');
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (!attendanceHistory[todayStr]) {
        attendanceHistory[todayStr] = {};
    }
    
    selects.forEach(select => {
        const id = select.getAttribute('data-id');
        const val = select.value;
        let attData = dailyAttendance[id] || { status: 'Not Given Yet', checkIn: null, checkOut: null, hours: null };
        if (typeof attData === 'string') attData = { status: attData, checkIn: null, checkOut: null, hours: null };
        if (val === 'Not Given Yet') {
            attData.checkIn = null;
            attData.checkInMs = null;
            attData.checkOut = null;
            attData.hours = null;
        }
        attData.status = val;
        dailyAttendance[id] = attData;
        attendanceHistory[todayStr][id] = attData;
    });
    
    saveData();
    showToast('Attendance saved for today');
    
    // Refresh to update reports UI
    if (typeof renderAttendanceReports === 'function') {
        renderAttendanceReports();
    }
    if (typeof renderAdminLeaves === 'function') renderAdminLeaves();
    

    // Populate assignments-list
    const assignmentsList = document.getElementById('assignments-list');
    if (assignmentsList) {
        if (shops.length === 0) {
            assignmentsList.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 1rem; color: #94a3b8;">No shops assigned.</td></tr>';
        } else {
            const getNames = (ids) => {
                if (!ids) return 'None';
                const idArr = Array.isArray(ids) ? ids : [ids];
                if (idArr.length === 0) return 'None';
                return idArr.map(id => {
                    const staff = staffList.find(s => s.id === id);
                    return staff ? staff.name : id;
                }).join(', ');
            };
            assignmentsList.innerHTML = `<table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead style="background: rgba(0,0,0,0.4);">
                    <tr>
                        <th style="padding: 1rem; color: #94a3b8; font-size: 0.9rem;">Shop</th>
                        <th style="padding: 1rem; color: #94a3b8; font-size: 0.9rem;">Delivery</th>
                        <th style="padding: 1rem; color: #94a3b8; font-size: 0.9rem;">Technical</th>
                    </tr>
                </thead>
                <tbody>
                ` + shops.map(s => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem;">${s.name}</td>
                        <td style="padding: 1rem;">${getNames(s.deliveryStaff)}</td>
                        <td style="padding: 1rem;">${getNames(s.technicalStaff)}</td>
                    </tr>
                `).join('') + `</tbody></table>`;
        }
    }

    if (typeof renderMasterReport === 'function') renderMasterReport();
if (typeof renderAdminIDCards === 'function') renderAdminIDCards();

    renderAdminAttendance();
};

window.updateSingleAttendance = (selectElement) => {
    const id = selectElement.getAttribute('data-id');
    const val = selectElement.value;
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (!attendanceHistory[todayStr]) {
        attendanceHistory[todayStr] = {};
    }
    let attData = dailyAttendance[id] || { status: 'Not Given Yet', checkIn: null, checkOut: null, hours: null };
    if (typeof attData === 'string') attData = { status: attData, checkIn: null, checkOut: null, hours: null };
    if (val === 'Not Given Yet') {
        attData.checkIn = null;
        attData.checkInMs = null;
        attData.checkOut = null;
        attData.hours = null;
    }
    attData.status = val;
    
    dailyAttendance[id] = attData;
    attendanceHistory[todayStr][id] = attData;
    
    saveData(); // Instantly sync to backend and all clients
    renderAdminAttendance();
    showToast('Status updated to ' + val);
};

window.html5QrcodeScannerObj = null;
window.scannerMode = 'checkin';

window.startScanner = (mode = 'checkin') => {
    window.scannerMode = mode;
    // Unlock Audio Contexts and Speech Synthesis on direct user click
    try {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
        }
        window.audioCtx = window.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
    } catch(e) {}

    const container = document.getElementById('scanner-container');
    if (container) container.style.display = 'block';
    
    if (!window.html5QrcodeScannerObj) {
        window.html5QrcodeScannerObj = new Html5Qrcode("reader");
    }
    
    window.html5QrcodeScannerObj.start(
        { facingMode: "environment" },
        { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
        },
        (decodedText) => onScanSuccess(decodedText)
    ).catch(err => {
        showToast("Camera error: " + err, "error");
        // Fallback tip if camera fails
        const p = document.createElement('p');
        p.style.color = '#f59e0b';
        p.textContent = "Camera failed. Try using a mobile phone browser or grant camera permissions.";
        document.getElementById('scanner-container').appendChild(p);
    });
};

window.stopScanner = () => {
    if (window.html5QrcodeScannerObj) {
        window.html5QrcodeScannerObj.stop().then(() => {
            document.getElementById('scanner-container').style.display = 'none';
        }).catch(err => {
            console.error(err);
            document.getElementById('scanner-container').style.display = 'none';
        });
    } else {
        document.getElementById('scanner-container').style.display = 'none';
    }
};

const onScanSuccess = (decodedText) => {
    // If the barcode contains "ID - Name", extract just the ID. Otherwise just use the text.
    let rawId = decodedText.trim();
    if (rawId.includes(' - ')) {
        rawId = rawId.split(' - ')[0].trim();
    }
    const id = rawId;
    
    // Pause scanning to prevent duplicates
    if(window.html5QrcodeScannerObj && window.html5QrcodeScannerObj.isScanning){
        window.html5QrcodeScannerObj.pause();
    }
    
    const staff = staffList.find(s => s.id === id);
    if (!staff) {
        showToast("Employee Not Found: " + id, "error");
        setTimeout(() => {
            if(window.html5QrcodeScannerObj) window.html5QrcodeScannerObj.resume();
        }, 3000);
        return;
    }
    
    const timestamp = new Date();
    let hours = timestamp.getHours();
    let minutes = timestamp.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    const timeStr = `${hours}:${minutes} ${ampm}`;
    const todayStr = timestamp.toISOString().split('T')[0];
    
    let attData = dailyAttendance[id];
    if (typeof attData === 'string') attData = { status: attData, checkIn: null, checkOut: null, hours: null };
    if (!attData) attData = { status: 'Not Given Yet', checkIn: null, checkOut: null, hours: null };
    
    if (window.scannerMode === 'checkin') {
        const currentH = timestamp.getHours();
        const currentM = timestamp.getMinutes();
        const currentMins = currentH * 60 + currentM;
        
        const [ciStartH, ciStartM] = (agencyTimings.checkInStart || '09:00').split(':').map(Number);
        const [ciEndH, ciEndM] = (agencyTimings.checkInEnd || '10:30').split(':').map(Number);
        const ciStartMins = ciStartH * 60 + ciStartM;
        const ciEndMins = ciEndH * 60 + ciEndM;
        
        if (currentMins < ciStartMins || currentMins > ciEndMins) {
            const audioTiming = document.getElementById('audio-timing');
            const fallbackSpeech = () => {
                if ('speechSynthesis' in window) {
                    const msg = new SpeechSynthesisUtterance("Waiting for the current timing.");
                    msg.rate = 1.0;
                    msg.pitch = 1.1;
                    window.speechSynthesis.speak(msg);
                }
            };
            if (audioTiming) {
                audioTiming.play().catch(e => fallbackSpeech());
            } else {
                fallbackSpeech();
            }
            showToast("Check-In is currently closed. Allowed between " + agencyTimings.checkInStart + " and " + agencyTimings.checkInEnd, "error");
            setTimeout(() => { if(window.html5QrcodeScannerObj) window.html5QrcodeScannerObj.resume(); }, 3000);
            return;
        }

        if (attData.checkIn) {
            const audioAlreadyIn = document.getElementById('audio-already-in');
            const fallbackSpeech = () => {
                if ('speechSynthesis' in window) {
                    const msg = new SpeechSynthesisUtterance("Attendance already marked for today.");
                    msg.rate = 1.0;
                    msg.pitch = 1.1;
                    window.speechSynthesis.speak(msg);
                }
            };
            if (audioAlreadyIn) audioAlreadyIn.play().catch(e => fallbackSpeech());
            else fallbackSpeech();

            showToast("Already Checked-In Today for " + staff.name, "error");
            setTimeout(() => { if(window.html5QrcodeScannerObj) window.html5QrcodeScannerObj.resume(); }, 3000);
            return;
        }
        
        attData.status = 'Checked In';
        attData.checkIn = timeStr;
        attData.checkInMs = timestamp.getTime();
        
        dailyAttendance[id] = attData;
        if (!attendanceHistory[todayStr]) attendanceHistory[todayStr] = {};
        attendanceHistory[todayStr][id] = attData;
        
        barcodeAttendanceLogs.push({
            staffId: id, name: staff.name, department: staff.department || 'General',
            designation: staff.designation || staff.role, date: todayStr, checkInTime: timeStr,
            status: 'Checked In', type: 'Check-In', timestamp: timestamp.toISOString()
        });
        
    } else if (window.scannerMode === 'checkout') {
        if (!attData.checkIn) {
            const audioPleaseIn = document.getElementById('audio-please-in');
            const fallbackSpeech = () => {
                if ('speechSynthesis' in window) {
                    const msg = new SpeechSynthesisUtterance("Please check in first.");
                    msg.rate = 1.0;
                    msg.pitch = 1.1;
                    window.speechSynthesis.speak(msg);
                }
            };
            if (audioPleaseIn) audioPleaseIn.play().catch(e => fallbackSpeech());
            else fallbackSpeech();

            showToast("No Check-In record found for " + staff.name, "error");
            setTimeout(() => { if(window.html5QrcodeScannerObj) window.html5QrcodeScannerObj.resume(); }, 3000);
            return;
        }
        if (attData.checkOut) {
            const audioAlreadyOut = document.getElementById('audio-already-out');
            const fallbackSpeech = () => {
                if ('speechSynthesis' in window) {
                    const msg = new SpeechSynthesisUtterance("Already checked out for today.");
                    msg.rate = 1.0;
                    msg.pitch = 1.1;
                    window.speechSynthesis.speak(msg);
                }
            };
            if (audioAlreadyOut) audioAlreadyOut.play().catch(e => fallbackSpeech());
            else fallbackSpeech();

            showToast("Already Checked-Out Today for " + staff.name, "error");
            setTimeout(() => { if(window.html5QrcodeScannerObj) window.html5QrcodeScannerObj.resume(); }, 3000);
            return;
        }
        
        
        const currentH = timestamp.getHours();
        const currentM = timestamp.getMinutes();
        const currentMins = currentH * 60 + currentM;
        const [coStartH, coStartM] = (agencyTimings.checkOutStart || '18:00').split(':').map(Number);
        const [coEndH, coEndM] = (agencyTimings.checkOutEnd || '20:00').split(':').map(Number);
        const coStartMins = coStartH * 60 + coStartM;
        const coEndMins = coEndH * 60 + coEndM;
        
        attData.checkOut = timeStr;
        attData.status = 'Present'; // Default to full present
        
        if (attData.checkInMs) {
            const diffMs = timestamp.getTime() - attData.checkInMs;
            const diffHrs = Math.floor(diffMs / 3600000);
            const diffMins = Math.floor((diffMs % 3600000) / 60000);
            attData.hours = `${diffHrs}h ${diffMins}m`;
            
            // Check if they are checking out early
            if (currentMins < coStartMins) {
                const totalMins = diffMs / 60000;
                const requiredHalfDay = parseFloat(agencyTimings.halfDayMinutes) || 240;
                if (totalMins >= requiredHalfDay) {
                    attData.status = 'Half';
                } else {
                    // Rejected
                    const audioTiming = document.getElementById('audio-timing');
                    const fallbackSpeech = () => {
                        if ('speechSynthesis' in window) {
                            const msg = new SpeechSynthesisUtterance("Waiting for the current timing.");
                            msg.rate = 1.0;
                            msg.pitch = 1.1;
                            window.speechSynthesis.speak(msg);
                        }
                    };
                    if (audioTiming) {
                        audioTiming.play().catch(e => fallbackSpeech());
                    } else {
                        fallbackSpeech();
                    }
                    showToast("Checkout closed. Need to work at least " + requiredHalfDay + " minutes for Half-Day.", "error");
                    setTimeout(() => { if(window.html5QrcodeScannerObj) window.html5QrcodeScannerObj.resume(); }, 3000);
                    return;
                }
            } else if (currentMins > coEndMins) {
                // Technically checking out late is usually fine, but if we want strictly bounds:
                const audioTiming = document.getElementById('audio-timing');
                const fallbackSpeech = () => {
                    if ('speechSynthesis' in window) {
                        const msg = new SpeechSynthesisUtterance("Waiting for the current timing.");
                        msg.rate = 1.0;
                        msg.pitch = 1.1;
                        window.speechSynthesis.speak(msg);
                    }
                };
                if (audioTiming) {
                    audioTiming.play().catch(e => fallbackSpeech());
                } else {
                    fallbackSpeech();
                }
                showToast("Check-out time has ended.", "error");
                setTimeout(() => { if(window.html5QrcodeScannerObj) window.html5QrcodeScannerObj.resume(); }, 3000);
                return;
            }
        }
        
        dailyAttendance[id] = attData;
        if (!attendanceHistory[todayStr]) attendanceHistory[todayStr] = {};
        attendanceHistory[todayStr][id] = attData;
        
        barcodeAttendanceLogs.push({
            staffId: id, name: staff.name, department: staff.department || 'General',
            designation: staff.designation || staff.role, date: todayStr, checkOutTime: timeStr,
            hours: attData.hours, type: 'Check-Out', timestamp: timestamp.toISOString()
        });
    }
    
    saveData();
    renderAdminAttendance();
    if (typeof renderAttendanceReports === 'function') renderAttendanceReports();
    
    // Show Success Overlay
    window.playBeep();
    
    document.getElementById('scan-status').textContent = attData.status;
    const hoursContainer = document.getElementById('scan-hours-container');
    if (window.scannerMode === 'checkout' && attData.hours) {
        hoursContainer.style.display = 'block';
        document.getElementById('scan-hours').textContent = attData.hours;
    } else {
        hoursContainer.style.display = 'none';
    }
    
    document.getElementById('scan-emp-name').textContent = staff.name;
    document.getElementById('scan-emp-id').textContent = staff.id;
    document.getElementById('scan-emp-dept').textContent = staff.department || 'General';
    document.getElementById('scan-emp-desig').textContent = staff.designation || staff.role;
    document.getElementById('scan-date').textContent = todayStr;
    document.getElementById('scan-time').textContent = timeStr;
    
    document.getElementById('scan-success-overlay').style.display = 'flex';
    
    // Auto reset
    setTimeout(() => {
        document.getElementById('scan-success-overlay').style.display = 'none';
        if(window.html5QrcodeScannerObj) window.html5QrcodeScannerObj.resume();
    }, 4000);
};

window.audioCtx = null;

window.playBeep = () => {
    try {
        // Speak based on scanner mode using Audio fallback first, then SpeechSynthesis
        const audioId = window.scannerMode === 'checkout' ? 'audio-checkout' : 'audio-checkin';
        const speechText = window.scannerMode === 'checkout' ? "Check out granted" : "Check in granted";
        const audioElement = document.getElementById(audioId);
        
        const fallbackToSpeech = () => {
            if ('speechSynthesis' in window) {
                const msg = new SpeechSynthesisUtterance(speechText);
                msg.rate = 1.0;
                msg.pitch = 1.1;
                window.speechSynthesis.speak(msg);
            }
        };

        if (audioElement) {
            audioElement.play().catch(e => {
                console.log('Audio play failed', e);
                fallbackToSpeech();
            });
        } else {
            fallbackToSpeech();
        }
        
        // Also play a subtle success beep
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!window.audioCtx) window.audioCtx = new AudioContext();
        if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
        
        const osc = window.audioCtx.createOscillator();
        const gain = window.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(window.audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, window.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, window.audioCtx.currentTime);
        osc.start(window.audioCtx.currentTime);
        osc.stop(window.audioCtx.currentTime + 0.15);
    } catch(e) {
        console.log("Audio not supported", e);
    }
};

window.renderAttendanceReports = () => {
    const monthlyTbody = document.getElementById('monthly-attendance-tbody');
    const daywiseContainer = document.getElementById('daywise-attendance-container');
    
    if (!monthlyTbody || !daywiseContainer) return;
    
    const now = new Date();
    const currentMonthPrefix = now.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
    
    // 1. Calculate Monthly Aggregations
    const monthlyData = {}; // staffId -> { Present, Half, Absent }
    staffList.forEach(s => monthlyData[s.id] = { Present: 0, Half: 0, Absent: 0 });
    
    Object.keys(attendanceHistory).forEach(date => {
        if (date.startsWith(currentMonthPrefix)) {
            const dailyData = attendanceHistory[date];
            Object.keys(dailyData).forEach(staffId => {
                let attVal = dailyData[staffId];
                let stat = attVal && typeof attVal === 'object' ? attVal.status : attVal;
                
                // Only count checked out people as fully Present if they finished shift, 
                // but if manual override to "Checked In" occurred, wait for EOD.
                // For simplicity, we count "Present" as present.
                if (monthlyData[staffId] && monthlyData[staffId][stat] !== undefined) {
                    monthlyData[staffId][stat]++;
                }
            });
        }
    });
    
    // 2. Render Monthly Summary
    if (staffList.length === 0) {
        monthlyTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 1rem; color: #94a3b8;">No staff registered.</td></tr>`;
    } else {
        monthlyTbody.innerHTML = staffList.map(staff => {
            const d = monthlyData[staff.id];
            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <td style="padding: 1rem;">${staff.id}</td>
                    <td style="padding: 1rem; font-weight: bold;">${staff.name}</td>
                    <td style="padding: 1rem;"><span class="badge" style="background: ${staff.role === 'Technical' ? 'var(--secondary)' : 'var(--primary)'}">${staff.role}</span></td>
                    <td style="padding: 1rem; color: #10b981; font-weight: bold; text-align: center;">${d.Present}</td>
                    <td style="padding: 1rem; color: #f59e0b; font-weight: bold; text-align: center;">${d.Half}</td>
                    <td style="padding: 1rem; color: #ef4444; font-weight: bold; text-align: center;">${d.Absent}</td>
                </tr>
            `;
        }).join('');
    }
    
    // 3. Render Day-wise Log (Most recent first)
    const sortedDates = Object.keys(attendanceHistory)
        .filter(d => d.startsWith(currentMonthPrefix))
        .sort((a, b) => b.localeCompare(a));
        
    if (sortedDates.length === 0) {
        daywiseContainer.innerHTML = `<p style="color: #94a3b8; padding: 1rem;">No attendance data logged for this month yet.</p>`;
    } else {
        daywiseContainer.innerHTML = sortedDates.map(date => {
            const dailyData = attendanceHistory[date];
            
            const exceptions = staffList.filter(s => {
                let attVal = dailyData[s.id];
                let stat = attVal && typeof attVal === 'object' ? attVal.status : attVal;
                return stat === 'Absent' || stat === 'Half' || stat === 'Checked In' || stat === 'Not Given Yet';
            });
            
            let exceptionsHTML = '';
            if (exceptions.length === 0) {
                exceptionsHTML = `<span style="color: #10b981; font-weight: bold; font-size: 0.9rem;">All Staff Present</span>`;
            } else {
                exceptionsHTML = exceptions.map(s => {
                    let attVal = dailyData[s.id];
                    let stat = attVal && typeof attVal === 'object' ? attVal.status : attVal;
                    const statusColor = stat === 'Absent' ? '#ef4444' : (stat === 'Half' ? '#f59e0b' : '#3b82f6');
                    return `<span style="display: inline-block; padding: 0.2rem 0.5rem; background: rgba(0,0,0,0.3); border-radius: 4px; border-left: 3px solid ${statusColor}; margin-right: 0.5rem; margin-bottom: 0.5rem; font-size: 0.85rem;">${s.name} (${stat})</span>`;
                }).join('');
            }
            
            return `
                <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
                    <h4 style="margin: 0 0 0.5rem 0; color: #e2e8f0; display: flex; justify-content: space-between;">
                        <span>📅 ${date}</span>
                        <span style="font-size: 0.8rem; color: #94a3b8; font-weight: normal;">${Object.keys(dailyData).length} Records</span>
                    </h4>
                    <div style="margin-top: 0.5rem;">
                        ${exceptionsHTML}
                    </div>
                </div>
            `;
        }).join('');
    }
};

// Auth Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        
        e.target.classList.add('active');
        document.getElementById(e.target.dataset.tab).classList.add('active');
    });
});

// Admin Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
        
        e.target.classList.add('active');
        document.getElementById(e.target.dataset.target).classList.add('active');
    });
});

// Logout
document.querySelectorAll('.btn-logout').forEach(btn => {
    btn.addEventListener('click', () => {
        currentUser = null;
        sessionStorage.removeItem('aura_session');
        showScreen('auth');
        showToast('Logged out successfully');
    });
});

// --- Authentication Logic ---

// Admin Login
const adminAccounts = [
    { id: 'ceo', pass: 'ceo123', role: 'ceo', name: 'Chief Executive Officer' },
    { id: 'md', pass: 'md123', role: 'md', name: 'Managing Director' },
    { id: 'finance', pass: 'finance123', role: 'finance', name: 'Finance Manager' },
    { id: 'operations', pass: 'ops123', role: 'operations', name: 'Operations Manager' },
    { id: 'auditor', pass: 'auditor123', role: 'auditor', name: 'Chief Auditor' },
    { id: 'aura2026', pass: 'aura2026', role: 'superadmin', name: 'Super Admin' }
];

document.getElementById('admin-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('admin-username').value.trim().toLowerCase();
    const pass = document.getElementById('admin-password').value.trim();
    
    const account = adminAccounts.find(a => a.id.toLowerCase() === user && a.pass === pass);
    
    if(account) {
        currentUser = { role: account.role, name: account.name, isAdmin: true };
        sessionStorage.setItem('aura_session', JSON.stringify(currentUser));
        showScreen('admin');
        showToast(`Welcome, ${account.name}`);
    } else {
        showToast('Invalid admin credentials');
    }
});

// Staff Login
document.getElementById('staff-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('staff-id').value.trim();
    const pass = document.getElementById('staff-password').value.trim();
    
    const staff = staffList.find(s => s.id === id && s.password === pass);
    if(staff) {
        if (['Managing Director (MD)', 'Finance Manager', 'Operations Manager', 'Auditor', 'Webcam Staff'].includes(staff.role)) {
            // Map to internal admin roles
            let mappedRole = '';
            if (staff.role === 'Managing Director (MD)') mappedRole = 'md';
            if (staff.role === 'Finance Manager') mappedRole = 'finance';
            if (staff.role === 'Operations Manager') mappedRole = 'operations';
            if (staff.role === 'Auditor') mappedRole = 'auditor';
            if (staff.role === 'Webcam Staff') mappedRole = 'webcam';
            
            currentUser = { ...staff, role: mappedRole, isAdmin: true, originalRole: staff.role };
            sessionStorage.setItem('aura_session', JSON.stringify(currentUser));
            showScreen('staff');
        } else {
            currentUser = staff;
            sessionStorage.setItem('aura_session', JSON.stringify(currentUser));
            showScreen('staff');
        }
        showToast(`Welcome, ${staff.name}`);
    } else {
        showToast('Invalid ID or password');
    }
});

// --- Admin Features ---

// Register Staff
document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const mobile = document.getElementById('reg-mobile') ? document.getElementById('reg-mobile').value : '';
    const role = document.getElementById('reg-role').value;
    const upi = document.getElementById('reg-upi').value;
    const ac = document.getElementById('reg-ac').value;
    const ifsc = document.getElementById('reg-ifsc').value;
    const branch = document.getElementById('reg-branch').value;
    const isManager = ['Managing Director (MD)', 'Finance Manager', 'Operations Manager', 'Auditor'].includes(role);
    const salaryInput = document.getElementById('reg-salary').value;
    const monthlySalary = isManager ? parseFloat(salaryInput) || 0 : 0;
    
    let prefix = 'MGR-';
    if (role === 'Delivery') prefix = 'DEL-';
    else if (role === 'Technical') prefix = 'TECH-';

    const id = generateId(prefix);
    const password = Math.random().toString(36).slice(-6); // random pass
    
    // Grab new employment details
    const designation = document.getElementById('reg-designation') ? document.getElementById('reg-designation').value : role;
    const department = document.getElementById('reg-department') ? document.getElementById('reg-department').value : 'General';
    const employmentType = document.getElementById('reg-employment-type') ? document.getElementById('reg-employment-type').value : 'Full-Time';
    const dateOfJoining = document.getElementById('reg-doj') ? document.getElementById('reg-doj').value : new Date().toLocaleDateString();
    const reportingManager = document.getElementById('reg-manager') ? document.getElementById('reg-manager').value : 'MD';
    const paymentStructure = document.getElementById('reg-payment-structure') ? document.getElementById('reg-payment-structure').value : 'Fixed Salary';
    
    const newStaff = { 
        id, 
        password, 
        name,
        mobile,
        role, 
        upi, 
        ac,
        ifsc,
        branch,
        monthlySalary, 
        designation,
        department,
        employmentType,
        dateOfJoining,
        reportingManager,
        paymentStructure,
        earnings: 0, 
        transactions: [], 
        pendingTransactions: [] 
    };
    staffList.push(newStaff);
    saveData();
    
    showToast('Staff registered successfully');
    document.getElementById('register-form').reset();
    refreshAdminData(); // update dropdowns
    
    // Automatically show joining letter for new staff
    window.showJoiningLetter(id);
});

// Function to view joining letter dynamically
window.showIDCard = (staffId) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;
    generateIDCardVisual(staff, 'idcard-modal', 'idcard-container', 'idcard-qrcode');
};

window.printIdCard = () => {
    document.body.classList.add('printing-idcard');
    window.print();
    // Do not remove immediately with setTimeout!
    // The class will be removed by the window.onafterprint event.
};

// Ensure the class is removed when printing is done or canceled
window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing-idcard');
});

window.showJoiningLetter = (staffId) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;
    
    const letter = document.getElementById('joining-letter');
    const content = document.getElementById('letter-content');
    
    const today = new Date().toLocaleDateString();
    
    content.innerHTML = `
        <div style="font-size: 0.85rem; line-height: 1.4;">
            <div style="text-align: center; margin-bottom: 1rem;">
                <p style="margin: 0; font-size: 0.8rem;">Kabisuryanagar, Ganjam, Odisha, India | Email: Finance.AURADISPATCH@gmail.com | Phone: +91-1234567890</p>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                <p style="margin: 0;"><strong>Date:</strong> ${today}</p>
                <p style="margin: 0;"><strong>Employee ID:</strong> ${staff.id}</p>
            </div>
            
            <p style="margin: 0.5rem 0;">To,<br><strong>Mr./Ms. ${staff.name}</strong></p>
            
            <p style="text-decoration: underline; font-weight: bold; margin: 1rem 0; text-align: center;">Subject: Electronic Appointment and Joining Confirmation</p>
            
            <p style="margin-bottom: 0.5rem;">Dear ${staff.name},</p>
            
            <p style="margin-bottom: 1rem;">We are pleased to inform you that you have been selected to join AURA Dispatch Services. Your appointment shall be effective from ${staff.dateOfJoining || today}.</p>
            
            <h3 style="margin: 1rem 0 0.5rem 0; color: #1e293b; font-size: 1rem;">Employment Details</h3>
            <ul style="line-height: 1.4; list-style-type: none; padding-left: 0; margin-bottom: 1rem;">
                <li><strong>Designation:</strong> ${staff.designation || staff.role}</li>
                <li><strong>Department:</strong> ${staff.department || 'Operations'}</li>
                <li><strong>Employee ID:</strong> ${staff.id}</li>
                <li><strong>Employment Type:</strong> ${staff.employmentType || 'Full-Time'}</li>
                <li><strong>Date of Joining:</strong> ${staff.dateOfJoining || today}</li>
                <li><strong>Reporting Manager:</strong> ${staff.reportingManager || 'Managing Director'}</li>
                <li><strong>Payment Structure:</strong> ${staff.paymentStructure || 'Fixed + Commission'}</li>
            </ul>
            
            <div style="background: rgba(0,0,0,0.05); padding: 0.5rem; border-radius: 8px; margin: 1rem 0; display: inline-block;">
                <p style="margin: 0;"><strong>System Login Details:</strong> Password: <span style="font-family: monospace; background: white; padding: 2px 4px; border-radius: 4px;">${staff.password}</span></p>
            </div>
            
            <h3 style="margin: 1rem 0 0.5rem 0; color: #1e293b; font-size: 1rem;">Terms and Conditions</h3>
            <ol style="line-height: 1.3; margin-bottom: 1rem; padding-left: 1.5rem; font-size: 0.8rem;">
                <li>You are required to follow all operational and company policies.</li>
                <li>Attendance and performance will be monitored by the Operations Department.</li>
                <li>Salary, incentives, and commissions will be processed according to company rules.</li>
                <li>Customer and company information must be kept confidential.</li>
                <li>Any misconduct, fraudulent activity, or violation of company policies may lead to disciplinary action, including termination of employment.</li>
                <li>The company reserves the right to amend its policies and operational procedures whenever required.</li>
            </ol>
            
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 2rem; padding: 0 2rem;">
                <div>
                    <img src="assets/official_seal.png" alt="Official Seal" style="max-width: 120px; mix-blend-mode: multiply; opacity: 0.85;">
                </div>
                <div style="text-align: center;">
                    <div style="font-family: 'Dancing Script', cursive; font-size: 24px; color: #1565C0; transform: rotate(-5deg); margin-bottom: 5px; padding-bottom: 5px; min-height: 35px;">${ceoDigitalSignature || "CEO"}</div>
                    <div style="border-top: 1px solid #000; display: inline-block; padding-top: 5px; width: 180px; text-align: center; font-size: 0.8rem;">
                        <strong>CEO / Managing Director</strong><br>
                        AURA Dispatch
                    </div>
                </div>
            </div>
        </div>
    `;
    
    letter.classList.remove('hidden');
    letter.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

document.getElementById('print-letter').addEventListener('click', () => {
    document.body.classList.add('printing-joining-letter');
    window.print();
    setTimeout(() => {
        document.body.classList.remove('printing-joining-letter');
        document.getElementById('joining-letter').classList.add('hidden');
    }, 1000);
});

window.printBond = () => {
    document.body.classList.add('printing-bond');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-bond'), 1000);
};

// Refresh Admin Data (Dropdowns & Lists)
const refreshAdminData = () => {
        // --- Render CEO Reports ---
        const ceoReportsTbody = document.getElementById('ceo-reports-tbody');
        if (ceoReportsTbody) {
            if (!Array.isArray(dailySalaryReports) || dailySalaryReports.length === 0) {
                ceoReportsTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 1rem; color: #94a3b8;">No reports submitted yet.</td></tr>';
            } else {
                ceoReportsTbody.innerHTML = dailySalaryReports.slice().reverse().map(r => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem; font-family: monospace;">${r.id}</td>
                        <td style="padding: 1rem;">${r.date}</td>
                        <td style="padding: 1rem;">${r.auditorName} (${r.verificationStatus})</td>
                        <td style="padding: 1rem; font-weight: bold; color: #10b981;">₹${Number(r.netPaid).toFixed(2)}</td>
                        <td style="padding: 1rem;"><button class="btn btn-secondary" onclick="window.viewDailySalaryReport('${r.id}')">View</button></td>
                    </tr>
                `).join('');
            }
        }

    // Populate Assign Dropdowns
    const delContainer = document.getElementById('assign-delivery-container');
    const techContainer = document.getElementById('assign-technical-container');
    const payShopSelect = document.getElementById('pay-shop');
    const assignShopSelect = document.getElementById('assign-shop-select');
    const allShopsList = document.getElementById('all-shops-list');
    
    if (delContainer) {
        const delStaff = staffList.filter(s => s.role === 'Delivery' || s.role === 'Delivery Staff');
        if (delStaff.length === 0) {
            delContainer.innerHTML = '<span style="color:#94a3b8;font-size:0.9rem;">No delivery staff found.</span>';
        } else {
            delContainer.innerHTML = delStaff.map(s => `
                <label style="display: flex; align-items: center; gap: 0.5rem; color: white; cursor: pointer; font-size: 0.9rem;">
                    <input type="checkbox" value="${s.id}">
                    ${s.name} (${s.id})
                </label>
            `).join('');
        }
    }
    
    if (techContainer) {
        const techStaff = staffList.filter(s => s.role === 'Technical' || s.role === 'Technical Staff');
        if (techStaff.length === 0) {
            techContainer.innerHTML = '<span style="color:#94a3b8;font-size:0.9rem;">No technical staff found.</span>';
        } else {
            techContainer.innerHTML = techStaff.map(s => `
                <label style="display: flex; align-items: center; gap: 0.5rem; color: white; cursor: pointer; font-size: 0.9rem;">
                    <input type="checkbox" value="${s.id}">
                    ${s.name} (${s.id})
                </label>
            `).join('');
        }
    }
    if (payShopSelect) payShopSelect.innerHTML = '<option value="">Select Shop...</option>' + shops.map((s, idx) => `<option value="${idx}">${s.name}</option>`).join('');
    if (assignShopSelect) assignShopSelect.innerHTML = '<option value="">Select Shop...</option>' + shops.map((s, idx) => `<option value="${idx}">${s.name}</option>`).join('');
    
    if (allShopsList) {
        if (shops.length === 0) {
            allShopsList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #94a3b8;">No shops registered.</td></tr>';
        } else {
            allShopsList.innerHTML = shops.map((s, idx) => {
                let dNames = 'None';
                let tNames = 'None';
                
                if (Array.isArray(s.deliveryStaff)) {
                    const ds = staffList.filter(staff => s.deliveryStaff.includes(staff.id));
                    if (ds.length > 0) dNames = ds.map(x => x.name).join(', ');
                } else if (s.deliveryStaff) {
                    const d = staffList.find(staff => staff.id === s.deliveryStaff);
                    if (d) dNames = d.name;
                }

                if (Array.isArray(s.technicalStaff)) {
                    const ts = staffList.filter(staff => s.technicalStaff.includes(staff.id));
                    if (ts.length > 0) tNames = ts.map(x => x.name).join(', ');
                } else if (s.technicalStaff) {
                    const t = staffList.find(staff => staff.id === s.technicalStaff);
                    if (t) tNames = t.name;
                }

                return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 1rem;">${s.name}</td>
                    <td style="padding: 1rem;">${dNames}</td>
                    <td style="padding: 1rem;">${tNames}</td>
                    <td style="padding: 1rem;"><button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444;" onclick="deleteShop(${idx})">Remove</button></td>
                </tr>
                `;
            }).join('');
        }
    }

    const standbyList = document.getElementById('standby-staff-list');
    if (standbyList) {
        // Collect all assigned staff IDs
        let assignedIds = new Set();
        shops.forEach(s => {
            if (Array.isArray(s.deliveryStaff)) s.deliveryStaff.forEach(id => assignedIds.add(id));
            else if (s.deliveryStaff) assignedIds.add(s.deliveryStaff);
            
            if (Array.isArray(s.technicalStaff)) s.technicalStaff.forEach(id => assignedIds.add(id));
            else if (s.technicalStaff) assignedIds.add(s.technicalStaff);
        });
        
        const now = new Date();
        const tzOffset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, -1);
        const todayStr = localISOTime.split('T')[0];

        const standbyStaff = staffList.filter(s => {
            const isOnLeave = leaveRequests.some(lr => lr.staffId === s.id && lr.status === 'Approved' && todayStr >= lr.startDate && todayStr <= lr.endDate);
            let attStatus = dailyAttendance[s.id];
            if (attStatus && typeof attStatus === 'object') attStatus = attStatus.status;
            
            return (s.role === 'Delivery' || s.role === 'Delivery Staff' || s.role === 'Technical' || s.role === 'Technical Staff') 
                && !assignedIds.has(s.id)
                && attStatus !== 'Absent'
                && attStatus !== 'Leave'
                && !isOnLeave;
        });
        
        if (standbyStaff.length === 0) {
            standbyList.innerHTML = '<div style="padding: 1rem; color: #94a3b8; text-align: center;">No staff currently on standby.</div>';
        } else {
            standbyList.innerHTML = standbyStaff.map(s => {
                const customAssign = dailyAttendance[s.id + '_custom'];
                return `
                <div style="padding: 1rem; border-bottom: 1px solid rgba(245, 158, 11, 0.1); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                        <strong style="color: white;">${s.name}</strong> <span style="color: #94a3b8; font-size: 0.85rem;">(${s.id}) - ${s.role}</span>
                        ${s.priorityAssignment ? '<span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 0.5rem;">Priority</span>' : ''}
                        ${customAssign ? `<div style="color: #10b981; font-size: 0.85rem; margin-top: 0.25rem;">Custom Assignment: ${customAssign} <button class="btn btn-sm print-hide" style="background: transparent; border: none; color: #ef4444; text-decoration: underline; padding: 0; margin-left: 0.5rem;" onclick="removeCustomAssignment('${s.id}')">Remove</button></div>` : ''}
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" id="standby-assign-custom-${s.id}" class="input-group" style="margin-bottom: 0; padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: white; width: 150px;" placeholder="${customAssign ? 'Update Assignment' : 'Shop Name / Custom Task'}">
                        <button class="btn btn-sm" style="background: #f59e0b; border-color: #f59e0b;" onclick="assignStandby('${s.id}')">${customAssign ? 'Update' : 'Assign'}</button>
                    </div>
                </div>
                `;
            }).join('');
        }
    }
    
    const adminWalletBalance = document.getElementById('admin-wallet-balance');
    const adminPendingTech = document.getElementById('admin-pending-tech');
    const adminPendingDelivery = document.getElementById('admin-pending-delivery');
    
    // Update live 4-wallet displays
    const adminCards = document.querySelectorAll('.live-admin-wallet');
    const techCards = document.querySelectorAll('.live-tech-wallet');
    const deliveryCards = document.querySelectorAll('.live-delivery-wallet');
    const reserveCards = document.querySelectorAll('.live-reserve-wallet');
    
    // Migration: Split Absentee Deductions out of the main balance if not done yet
    if (adminWallet.absenteeReserve === undefined) {
        adminWallet.absenteeReserve = absenteeDeductions.filter(d => !d.refunded).reduce((s,d) => s + (d.amount||0), 0);
        adminWallet.balance = (adminWallet.balance || 0) - adminWallet.absenteeReserve;
        saveData();
    }

    adminCards.forEach(el => el.textContent = `₹${(adminWallet.balance || 0).toFixed(2)}`);
    
    const ceoAdminBal = document.getElementById('ceo-admin-wallet-balance');
    if (ceoAdminBal) {
        ceoAdminBal.textContent = `₹${(adminWallet.absenteeReserve || 0).toFixed(2)}`;
    }    
    // Analytics Overview has been removed as per user request
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // yyyy-mm-dd
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let todayEarnings = 0;
    let monthEarnings = 0;
    
    payments.forEach(p => {
        // Payment date check
        if(p.isoDate && p.isoDate.startsWith(todayStr)) todayEarnings += p.adminCut;
        
        // Month check
        const pDate = new Date(p.isoDate);
        if(pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
            monthEarnings += p.adminCut;
        }
    });
    
    let monthSalariesPaid = 0;
    // Deduct Corporate Manager salaries paid from this month's earnings
    ceoSalariesPaid.forEach(s => {
        const sDate = new Date(s.isoDate);
        if(sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear) {
            monthSalariesPaid += s.amount;
            monthEarnings -= s.amount;
        }
    });

    // --- Render EMI Credits (Finance & MD Dashboards) ---
    const renderEmiCredits = (tbodyId) => {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        
        let displayCredits = Array.isArray(emiCreditsHistory) ? [...emiCreditsHistory] : [];
        
        // Also show pending deductions if an audit cycle is active
        if (pendingAudit && Array.isArray(pendingAudit.staffPayouts)) {
            pendingAudit.staffPayouts.forEach(p => {
                if ((p.loanEMI || 0) > 0) {
                    displayCredits.push({
                        date: pendingAudit.date + ' (Pending)',
                        name: p.name,
                        staffId: p.staffId,
                        amount: p.loanEMI
                    });
                }
            });
        }
        
        if (displayCredits.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #94a3b8;">No EMI credits found.</td></tr>';
        } else {
            let html = '';
            displayCredits.forEach(c => {
                try {
                    const amt = parseFloat(c.amount) || 0;
                    html += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 1rem;">${c.date || 'N/A'}</td>
                            <td style="padding: 1rem;">${c.name || 'N/A'}</td>
                            <td style="padding: 1rem; font-family: monospace;">${c.staffId || 'N/A'}</td>
                            <td style="padding: 1rem; color: #10b981; font-weight: bold;">+₹${amt.toFixed(2)}</td>
                        </tr>
                    `;
                } catch (e) {
                    console.error("Error rendering EMI credit", e, c);
                }
            });
            tbody.innerHTML = html;
        }
    };
    
    renderEmiCredits('emi-credits-tbody');
    renderEmiCredits('md-emi-credits-tbody');
    
    // Add transfers from Admin Wallet to this month's earnings
    walletTransfers.forEach(t => {
        const tDate = new Date(t.isoDate);
        if(tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
            monthEarnings += t.amount;
        }
    });

    // Deduct EOD bonuses paid by CEO
    eodDistributions.forEach(e => {
        const eDate = new Date(e.isoDate);
        if(eDate.getMonth() === currentMonth && eDate.getFullYear() === currentYear) {
            monthEarnings -= (e.ceoBonusesAllocated || 0);
        }
    });
    

    
    const totalPendingPayouts = staffList.filter(s => s.role === 'Delivery').reduce((sum, s) => {
        return sum + (s.pendingTransactions ? s.pendingTransactions.reduce((acc, tx) => acc + tx.amount, 0) : 0);
    }, 0);
    if(adminPendingDelivery) adminPendingDelivery.textContent = `₹${totalPendingPayouts.toFixed(2)}`;
    
    // Render Attendance Table
    renderAttendanceTable();
    if (typeof renderAttendanceReports === 'function') {
        renderAttendanceReports();
    }
    if (typeof renderAdminLeaves === 'function') renderAdminLeaves();
    

    // Populate CEO Fire Staff dropdown
    const ceoFireStaffSelect = document.getElementById('ceo-fire-staff-select');
    if (ceoFireStaffSelect) {
        ceoFireStaffSelect.innerHTML = '<option value="">Choose Staff to Fire...</option>' + staffList.map(s => `<option value="${s.id}">${s.name} (${s.role})</option>`).join('');
    }

    // Populate assignments-list
    const assignmentsList = document.getElementById('assignments-list');
    if (assignmentsList) {
        if (shops.length === 0) {
            assignmentsList.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 1rem; color: #94a3b8;">No shops assigned.</td></tr>';
        } else {
            const getNames = (ids) => {
                if (!ids) return 'None';
                const idArr = Array.isArray(ids) ? ids : [ids];
                if (idArr.length === 0) return 'None';
                return idArr.map(id => {
                    const staff = staffList.find(s => s.id === id);
                    return staff ? staff.name : id;
                }).join(', ');
            };
            assignmentsList.innerHTML = `<table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead style="background: rgba(0,0,0,0.4);">
                    <tr>
                        <th style="padding: 1rem; color: #94a3b8; font-size: 0.9rem;">Shop</th>
                        <th style="padding: 1rem; color: #94a3b8; font-size: 0.9rem;">Delivery</th>
                        <th style="padding: 1rem; color: #94a3b8; font-size: 0.9rem;">Technical</th>
                    </tr>
                </thead>
                <tbody>
                ` + shops.map(s => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem;">${s.name}</td>
                        <td style="padding: 1rem;">${getNames(s.deliveryStaff)}</td>
                        <td style="padding: 1rem;">${getNames(s.technicalStaff)}</td>
                    </tr>
                `).join('') + `</tbody></table>`;
        }
    }

    if (typeof renderMasterReport === 'function') renderMasterReport();
if (typeof renderAdminIDCards === 'function') renderAdminIDCards();



    // --- Render Pipeline Panels ---
    const financePanel = document.getElementById('finance-calculation-panel');
    const mdPanel = document.getElementById('md-verification-panel');
    const mdTbody = document.getElementById('md-verification-tbody');
    
    const auditorLogPanel = document.getElementById('auditor-deliveries-log');
    const deliveriesContainer = document.getElementById('deliveries-log-container');
    if (pendingAudit && pendingAudit.status === 'PENDING_DELIVERY_COUNTS') {
        if (auditorLogPanel) auditorLogPanel.style.display = 'block';
        if (deliveriesContainer) {
            const delStaffList = staffList.filter(s => s.role && s.role.includes('Delivery'));
            if (delStaffList.length === 0) {
                deliveriesContainer.innerHTML = '<p style="color: #94a3b8;">No delivery staff registered.</p>';
            } else {
                deliveriesContainer.innerHTML = delStaffList.map(d => {
                    let assignedShops = shops.filter(s => Array.isArray(s.deliveryStaff) ? s.deliveryStaff.includes(d.id) : s.deliveryStaff === d.id).map(s => s.name).join(', ') || 'None';
                    return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(0,0,0,0.3); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                        <div>
                            <h4 style="margin: 0 0 0.25rem 0;">${d.name} (${d.id})</h4>
                            <p style="margin: 0; font-size: 0.8rem; color: #94a3b8;">Shops: ${assignedShops}</p>
                        </div>
                        <div>
                            <input type="number" class="input-group delivery-input" data-staffid="${d.id}" placeholder="Order Count" min="0" style="margin-bottom: 0; width: 120px;" value="${dailyDeliveries[d.id] || 0}">
                        </div>
                    </div>
                    `;
                }).join('');
            }
            
            // Populate OTP Filter and render table
            const auditorOtpFilter = document.getElementById('auditor-otp-shop-filter');
            if (auditorOtpFilter) {
                const uniqueShops = [...new Set(otpLogs.map(l => l.shopName))];
                auditorOtpFilter.innerHTML = '<option value="All">All Shops</option>' + uniqueShops.map(s => `<option value="${s}">${s}</option>`).join('');
            }
            if (window.renderAuditorOtpTable) window.renderAuditorOtpTable();
        }
    } else {
        if (auditorLogPanel) auditorLogPanel.style.display = 'none';
    }

    const auditPanel = document.getElementById('audit-verification-panel');
    const auditTbody = document.getElementById('audit-verification-tbody');
    const eodStartBtn = document.getElementById('btn-eod-distribute');
    
    // Hide all initially
    if (financePanel) financePanel.style.display = 'none';
    if (mdPanel) mdPanel.style.display = 'none';
    const mdRolePanel = document.getElementById('ceo-eod-review-panel');
    if (mdRolePanel) mdRolePanel.style.display = 'none';

    if (auditPanel) auditPanel.style.display = 'none';
    if (eodStartBtn) {
        eodStartBtn.textContent = '1. Start End of Day Distribution';
        eodStartBtn.disabled = false;
        eodStartBtn.style.opacity = '1';
    }

    if (pendingAudit) {
        if (eodStartBtn) {
            eodStartBtn.textContent = `Cycle in Progress: ${pendingAudit.status}`;
            eodStartBtn.disabled = true;
            eodStartBtn.style.opacity = '0.5';
        }
        
        // Step 1: Auditor Delivery Counts (Admin Reports tab has the table which gets rendered elsewhere, but we show a panel if we want)
        // Handled by renderAttendanceReports usually...
        
        // Step 2: Finance Calculation
        const financeWaitingMd = document.getElementById('finance-waiting-md');
        if (financeWaitingMd) financeWaitingMd.style.display = 'none';

        if (pendingAudit.status === 'PENDING_FINANCE_CALCULATION' && (currentUser.role === 'finance' || currentUser.role === 'superadmin')) {
            if (financePanel) financePanel.style.display = 'block';
        } else if (pendingAudit.status === 'PENDING_MD_VERIFICATION' && (currentUser.role === 'finance' || currentUser.role === 'superadmin')) {
            if (financeWaitingMd) financeWaitingMd.style.display = 'block';
        }
        
        // Step 3: MD Verification
        if (pendingAudit.status === 'PENDING_MD_VERIFICATION' && (currentUser.role === 'ceo' || currentUser.role === 'md' || currentUser.role === 'superadmin')) {
            const ceoPanel = document.getElementById('md-verification-panel');
            const ceoTbody = document.getElementById('md-verification-tbody');
            if (ceoPanel && ceoTbody) {
                ceoPanel.style.display = 'block';
                ceoTbody.innerHTML = pendingAudit.staffPayouts.map(p => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 0.8rem;">${p.name} <br><small class="text-muted">(${p.staffId})</small></td>
                        <td style="padding: 0.8rem;">${p.role}</td>
                        <td style="padding: 0.8rem; color: #10b981;">₹${p.amountToPay.toFixed(2)}</td>
                        <td style="padding: 0.8rem;">₹${(p.ceoBonus || 0).toFixed(2)}</td>
                        <td style="padding: 0.8rem;">
                            <button class="btn btn-sm" style="background: rgba(139, 92, 246, 0.2); border: 1px solid #8b5cf6; padding: 0.2rem 0.5rem;" onclick="setCeoBonus('${p.staffId}')">Add Bonus</button>
                        </td>
                    </tr>
                `).join('');
            }

            
            const mdRolePanel = document.getElementById('ceo-eod-review-panel');
            const mdRoleTbody = document.getElementById('ceo-eod-review-tbody');
            console.log("MD Role Panel:", mdRolePanel, "MD Role Tbody:", mdRoleTbody);
            if (mdRolePanel && mdRoleTbody) {

                mdRolePanel.style.display = 'block';
                mdRoleTbody.innerHTML = pendingAudit.staffPayouts.map(p => {
                    const bonus = p.ceoBonus || 0;
                    const amountToPay = p.amountToPay || 0;
                    const loanEMI = p.loanEMI || 0;
                    const total = amountToPay - loanEMI + bonus;
                    let liveAtt = dailyAttendance[p.staffId];
                    let liveStatusRaw = liveAtt && typeof liveAtt === 'object' ? liveAtt.status : (liveAtt || p.status || 'Active');
                    let liveStatus = liveStatusRaw === 'Leave' ? 'Leave Approved' : liveStatusRaw;
                    
                    return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem;">${p.name} <br><small style="color: #94a3b8;">(${p.staffId})</small></td>
                        <td style="padding: 1rem;">${p.role}</td>
                        <td style="padding: 1rem;">${p.deliveries !== undefined ? p.deliveries : '-'}</td>
                        <td style="padding: 1rem;">${liveStatus}</td>
                        <td style="padding: 1rem; color: #10b981;">₹${Number(amountToPay).toFixed(2)}</td>
                        <td style="padding: 1rem; color: #ef4444;">-₹${Number(loanEMI).toFixed(2)}</td>
                        <td style="padding: 1rem; color: #f59e0b;">₹${Number(bonus).toFixed(2)}</td>
                        <td style="padding: 1rem; font-weight: bold;">₹${Number(total).toFixed(2)}</td>
                        <td style="padding: 1rem; text-align: right;">
                            <button class="btn btn-sm" style="background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; color: #3b82f6; padding: 0.2rem 0.5rem;" onclick="setCeoBonus('${p.staffId}')">Set Bonus</button>
                        </td>
                    </tr>
                    `;
                }).join('');
            }
        }
        
        
        // Populate Today's Approved Leaves in MD Dashboard


        const mdLeavesList = document.getElementById('md-approved-leaves-list');
        if (mdLeavesList) {
            const todayStr = new Date().toISOString().split('T')[0];
            const approvedToday = leaveRequests.filter(l => l.status === 'Approved' && l.date === todayStr);
            if (approvedToday.length === 0) {
                mdLeavesList.innerHTML = '<li>No approved leaves for today.</li>';
            } else {
                mdLeavesList.innerHTML = approvedToday.map(l => `<li><strong>${l.staffName}</strong> (${l.type}) - ${l.reason}</li>`).join('');
            }
        }

        // Step 4: Auditor Final
        if (pendingAudit.status === 'PENDING_AUDITOR_FINAL' && (currentUser.role === 'auditor' || currentUser.role === 'superadmin')) {
            if (auditPanel) {
                auditPanel.style.display = 'block';
                const verifyBtn = document.getElementById('btn-verify-distribute');
                if (verifyBtn) {
                    verifyBtn.textContent = '4. Final Verify & Distribute Salaries';
                    verifyBtn.disabled = false;
                    verifyBtn.style.opacity = '1';
                    verifyBtn.style.cursor = 'pointer';
                }
                if (auditTbody) {
                    auditTbody.innerHTML = pendingAudit.staffPayouts.map(p => {
                        const deliveriesDone = p.role === 'Delivery' ? (dailyDeliveries[p.staffId] || 0) : 'N/A';
                        return `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 1rem;">${p.name} <br><small class="text-muted">(${p.staffId})</small></td>
                            <td style="padding: 1rem;">${p.role}</td>
                            <td style="padding: 1rem;">${deliveriesDone}</td>
                            <td style="padding: 1rem; color: #cbd5e1;">${p.assignedShops}</td>
                            <td style="padding: 1rem;"><span class="badge ${p.status === 'Present' ? 'bg-success' : (p.status === 'Half' ? 'bg-warning' : 'bg-danger')}">${p.status}</span></td>
                            <td style="padding: 1rem; font-weight: bold; color: #10b981;">₹${(p.amountToPay + (p.ceoBonus || 0)).toFixed(2)}</td>
                        </tr>
                        `;
                    }).join('');
                }
            }
        }
    }

    // Render Absentee Deductions (MD Dashboard)
    const absenteeTbody = document.getElementById('ceo-absentee-tbody');
    if (absenteeTbody) {
        if (absenteeDeductions.length === 0) {
            absenteeTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 1rem; color: #94a3b8;">No absentee withholdings recorded yet.</td></tr>`;
        } else {
            absenteeTbody.innerHTML = [...absenteeDeductions].reverse().map(d => {
                let actionHtml = '';
                if (d.refunded) {
                    actionHtml = '<span style="color: #10b981; font-size: 0.85rem;">Refunded to Staff</span>';
                } else if (d.dismissed) {
                    actionHtml = '<span style="color: #94a3b8; font-size: 0.85rem;">Transferred to Admin</span>';
                } else {
                    actionHtml = `
                    <button class="btn btn-sm" style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #10b981; padding: 0.2rem 0.5rem; margin-right: 0.5rem;" onclick="refundStaffSalary('${d.id}')">Refund</button>
                    <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; padding: 0.2rem 0.5rem;" onclick="deleteAbsenteeRecord('${d.id}')">Dismiss to Admin</button>
                    `;
                }
                
                return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); ${d.refunded || d.dismissed ? 'opacity: 0.6;' : ''}">
                    <td style="padding: 1rem;">${d.date}</td>
                    <td style="padding: 1rem;">${d.staffId}</td>
                    <td style="padding: 1rem;">${d.name}</td>
                    <td style="padding: 1rem;"><span class="badge ${d.status === 'Half' ? 'bg-warning' : 'bg-danger'}">${d.status}</span></td>
                    <td style="padding: 1rem; color: #ef4444;">₹${(d.amount || 0).toFixed(2)}</td>
                    <td style="padding: 1rem; text-align: right;">${actionHtml}</td>
                </tr>
                `;
            }).join('');
        }
    }

    // Render CEO Corporate Payroll
    const ceoTbody = document.getElementById('ceo-payroll-tbody');
    if (ceoTbody) {
        const managers = staffList.filter(s => ['Managing Director (MD)', 'Finance Manager', 'Operations Manager', 'Auditor', 'Webcam Staff'].includes(s.role));
        if (managers.length === 0) {
            ceoTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1rem; color: #94a3b8;">No fixed-salary staff registered yet.</td></tr>`;
        } else {
            ceoTbody.innerHTML = managers.map(m => {
                const isPaid = ceoSalariesPaid.some(s => {
                    const sDate = new Date(s.isoDate);
                    return s.managerId === m.id && sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear;
                });
                
                return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 1rem; font-family: monospace;">${m.id}</td>
                    <td style="padding: 1rem;">${m.name}</td>
                    <td style="padding: 1rem;">${m.role}</td>
                    <td style="padding: 1rem; font-weight: bold; color: #f59e0b;">
                        ₹${(m.monthlySalary || 0).toFixed(2)}
                        <button class="btn btn-sm" style="background: transparent; border: none; padding: 0 0.5rem; font-size: 1.1rem; vertical-align: middle; cursor: pointer;" onclick="window.editManagerSalary('${m.id}')" title="Edit Salary">✏️</button>
                    </td>
                    <td style="padding: 1rem; text-align: right;">
                        ${isPaid ? '<span class="badge bg-success" style="margin-right: 0.5rem;">Paid</span>' : '<span class="badge bg-warning" style="margin-right: 0.5rem;">Pending</span>'}
                        <button class="btn btn-sm" style="background: ${isPaid ? 'rgba(255,255,255,0.1)' : '#10b981'}; border: none;" onclick="payManagerSalary('${m.id}')" ${isPaid ? 'disabled' : ''}>Pay Salary</button>
                    </td>
                </tr>
                `;
            }).join('');
        }
    }

    if (typeof renderAdminLoans === 'function') renderAdminLoans();
    if (typeof renderMDLoans === 'function') renderMDLoans();
    if (typeof renderCeoLoans === 'function') renderCeoLoans();
    if (typeof renderCEOComplaints === 'function') renderCEOComplaints();
};

window.editManagerSalary = (id) => {
    const manager = staffList.find(s => s.id === id);
    if (!manager) return;
    
    const currentSalary = manager.monthlySalary || 0;
    const newSalaryStr = prompt(`Enter new monthly salary for ${manager.name}:`, currentSalary);
    
    if (newSalaryStr !== null) {
        const newSalary = parseFloat(newSalaryStr);
        if (!isNaN(newSalary) && newSalary >= 0) {
            manager.monthlySalary = newSalary;
            saveData();
            refreshAdminData();
            showToast(`Salary updated for ${manager.name}!`);
        } else {
            showToast('Invalid salary amount entered.');
        }
    }
};

// Global Process Leave
window.processLeave = (id, newStatus) => {
    const lr = leaveRequests.find(l => l.id === id);
    if (!lr) return;
    
    let rejectionReason = null;
    
    if (newStatus === 'Rejected') {
        rejectionReason = prompt("Please enter the reason for rejecting this leave:");
        if (rejectionReason === null) return; // User clicked Cancel
        rejectionReason = rejectionReason.trim() || "Administrative Decision";
    } else {
        if (!confirm(`Are you sure you want to mark this request as ${newStatus}?`)) return;
    }

    lr.status = newStatus;
    
    if (!lr.approvals) lr.approvals = [];
    let approverTitle = currentUser ? currentUser.role.toUpperCase() : 'ADMIN';
    if (currentUser && currentUser.role === 'md') approverTitle = 'Managing Director';
    if (currentUser && currentUser.role === 'operations') approverTitle = 'Operations Manager';
    if (currentUser && currentUser.role === 'ceo') approverTitle = 'CEO';
    
    if (newStatus === 'Rejected') {
        lr.rejectedBy = approverTitle;
        lr.rejectionReason = rejectionReason;
    } else if (!lr.approvals.includes(approverTitle)) {
        lr.approvals.push(approverTitle);
    }

    if (newStatus === 'Approved' && !lr.leaveNumber) {
        lr.leaveNumber = generateId('LN-');
    }
    saveData();
    refreshAdminData();
    showToast(`Leave request updated to ${newStatus}`);
};

window.updateCEOSignature = () => {
    const sigVal = document.getElementById('ceo-signature-input').value.trim();
    if (!sigVal) {
        showToast("Please enter a signature name", "error");
        return;
    }
    ceoDigitalSignature = sigVal;
    document.getElementById('ceo-signature-preview').textContent = sigVal;
    saveData();
    showToast("CEO Digital Signature updated!", "success");
};

window.deleteLeave = (id) => {
    if (confirm(`Are you sure you want to completely delete this leave request?`)) {
        const idx = leaveRequests.findIndex(l => l.id === id);
        if (idx !== -1) {
            leaveRequests.splice(idx, 1);
            saveData();
            refreshAdminData();
            if (typeof refreshStaffData === 'function') refreshStaffData();
            showToast('Leave request deleted successfully.');
        }
    }
};

window.staffHideLeave = (id) => {
    if (confirm(`Are you sure you want to delete this leave request from your dashboard?`)) {
        const lr = leaveRequests.find(l => l.id === id);
        if (lr) {
            lr.hiddenByStaff = true;
            saveData();
            if (typeof refreshStaffData === 'function') refreshStaffData();
            showToast('Leave request removed from your view.');
        }
    }
};

// --- ID Card Generation ---
const generateIdCardForm = document.getElementById('generate-idcard-form');
if (generateIdCardForm) {
    generateIdCardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const staffId = document.getElementById('idcard-staff-select').value;
        if (!staffId) return;

        const staff = staffList.find(s => s.id === staffId);
        if (!staff) return;

        const dept = document.getElementById('idcard-dept').value;
        const validTill = document.getElementById('idcard-valid').value;
        const bloodGroup = document.getElementById('idcard-blood').value;
        const contact = document.getElementById('idcard-contact').value;
        const address = document.getElementById('idcard-address-input').value;

        // Check if exists and update or create
        const existingIdx = idCards.findIndex(c => c.staffId === staffId);
        const newCard = {
            staffId: staffId,
            department: dept,
            validTill: validTill,
            bloodGroup: bloodGroup,
            contact: contact,
            address: address
        };

        if (existingIdx !== -1) {
            idCards[existingIdx] = newCard;
            showToast('ID Card updated successfully.');
        } else {
            idCards.push(newCard);
            showToast('ID Card generated successfully.');
        }

        saveData();
        refreshAdminData();
        generateIdCardForm.reset();
    });
}

window.removeIDCard = (staffId) => {
    if (confirm('Are you sure you want to remove the ID Card for this staff member?')) {
        const idx = idCards.findIndex(c => c.staffId === staffId);
        if (idx !== -1) {
            idCards.splice(idx, 1);
            saveData();
            refreshAdminData();
            showToast('ID Card removed successfully.');
        }
    }
};

window.showIDCard = (staffId, allowPrint = false) => {
    const card = idCards.find(c => c.staffId === staffId);
    const staff = staffList.find(s => s.id === staffId);
    
    if (!card || !staff) {
        showToast('ID Card not generated yet.', 'error');
        return;
    }

    document.getElementById('idcard-name').textContent = staff.name;
    document.getElementById('idcard-role').textContent = staff.role.toUpperCase();
    document.getElementById('idcard-empid').textContent = staff.id;
    document.getElementById('idcard-dept-val').textContent = card.department.toUpperCase();
    document.getElementById('idcard-joined-val').textContent = staff.joinDate || new Date().toISOString().split('T')[0];
    document.getElementById('idcard-blood-val').textContent = card.bloodGroup.toUpperCase();
    document.getElementById('idcard-valid-val').textContent = card.validTill;
    document.getElementById('idcard-contact-val').textContent = card.contact;

    // Apply digital signature
    const sigElement = document.getElementById('idcard-digital-signature');
    if (sigElement) {
        sigElement.textContent = ceoDigitalSignature || "CEO";
    }

    const displayAddress = card.address || "AURA DISPATCH PVT. LTD. | Kabisuryanagar, Ganjam, Odisha, India";
    const parts = displayAddress.split('|').map(s => s.trim());
    const companyName = parts[0] || "AURA DISPATCH PVT. LTD.";
    const location = parts[1] || "";
    
    document.getElementById('idcard-address-display').innerHTML = `
        <span style="color: #64B5F6; font-size: 12px;">📍</span> <strong>${companyName}</strong><br>
        ${location}
    `;

    const printBtn = document.getElementById('idcard-print-btn');
    if (printBtn) {
        printBtn.style.display = allowPrint ? 'block' : 'none';
    }

    document.getElementById('idcard-modal').classList.remove('hidden');

    // Allow browser reflow before rendering QR Code
    setTimeout(() => {
        try {
            const qrContainer = document.getElementById("idcard-qrcode");
            if (qrContainer && typeof QRCode !== 'undefined') {
                qrContainer.innerHTML = ''; // Clear previous
                new QRCode(qrContainer, {
                    text: staff.id,
                    width: 75,
                    height: 75,
                    colorDark : "#0A2342",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
            }
        } catch (err) {
            console.error("Error generating barcode:", err);
        }
    }, 100);
};


// Add Shop
const addShopForm = document.getElementById('add-shop-form');
if (addShopForm) {
    addShopForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const shopNum = document.getElementById('add-shop-number').value;
        const shopName = document.getElementById('add-shop-name').value;
        const fullShopName = `#${shopNum} - ${shopName}`;
        
        const reqDelivery = parseInt(document.getElementById('add-shop-req-delivery').value, 10);
        const reqTech = parseInt(document.getElementById('add-shop-req-tech').value, 10);
        
        if(shops.find(s => s.name === fullShopName)) {
            showToast('Shop already exists!');
            return;
        }

        shops.push({
            name: fullShopName,
            reqDelivery: reqDelivery,
            reqTech: reqTech,
            deliveryStaff: [],
            technicalStaff: []
        });
        
        saveData();
        showToast('Shop added successfully');
        addShopForm.reset();
        refreshAdminData();
    });
}

// Delete Shop function (global)
window.deleteShop = (index) => {
    if(confirm('Are you sure you want to delete this shop?')) {
        shops.splice(index, 1);
        saveData();
        refreshAdminData();
        showToast('Shop deleted successfully');
    }
};

// Edit Assignment function (global)
window.assignStandby = (staffId) => {
    const inputEl = document.getElementById(`standby-assign-custom-${staffId}`);
    if (!inputEl) return;
    
    const inputVal = inputEl.value.trim();
    if (inputVal === "") {
        showToast("Please enter a custom role or select a shop.", "error");
        return;
    }
    
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;
    
    const shopIdx = shops.findIndex(sh => sh.name.toLowerCase() === inputVal.toLowerCase());
    
    if (shopIdx !== -1) {
        const shop = shops[shopIdx];
        if (staff.role.includes('Delivery')) {
            if (!Array.isArray(shop.deliveryStaff)) shop.deliveryStaff = shop.deliveryStaff ? [shop.deliveryStaff] : [];
            shop.deliveryStaff.push(staff.id);
        } else {
            if (!Array.isArray(shop.technicalStaff)) shop.technicalStaff = shop.technicalStaff ? [shop.technicalStaff] : [];
            shop.technicalStaff.push(staff.id);
        }
        showToast(`${staff.name} assigned to ${shop.name}`);
    } else {
        dailyAttendance[staff.id + '_custom'] = inputVal;
        showToast(`${staff.name} assigned as: ${inputVal}`);
    }
    
    saveData();
    refreshAdminData();
    if (typeof refreshStaffData === 'function') refreshStaffData();
};

window.removeCustomAssignment = (staffId) => {
    delete dailyAttendance[staffId + '_custom'];
    saveData();
    refreshAdminData();
    if (typeof refreshStaffData === 'function') refreshStaffData();
    showToast('Custom assignment removed');
};

window.editAssignment = (index) => {
    document.getElementById('assign-form').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('assign-shop-select').value = index;
    
    Array.from(document.querySelectorAll('#assign-delivery-container input[type="checkbox"]')).forEach(cb => {
        cb.checked = shops[index].deliveryStaff && shops[index].deliveryStaff.includes(cb.value);
    });
    
    const techArr = Array.isArray(shops[index].technicalStaff) ? shops[index].technicalStaff : (shops[index].technicalStaff ? [shops[index].technicalStaff] : []);
    Array.from(document.querySelectorAll('#assign-technical-container input[type="checkbox"]')).forEach(cb => {
        cb.checked = techArr.includes(cb.value);
    });
    
    showToast(`Editing assignment for ${shops[index].name}. Make changes and click Assign.`);
};

// Assign Shop
document.getElementById('assign-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const shopIdx = document.getElementById('assign-shop-select').value;
    const selectedDel = Array.from(document.querySelectorAll('#assign-delivery-container input:checked')).map(cb => cb.value);
    const selectedTech = Array.from(document.querySelectorAll('#assign-technical-container input:checked')).map(cb => cb.value);
    
    if(shopIdx === "") {
        showToast('Please select a shop');
        return;
    }
    const requiredDel = shops[shopIdx].reqDelivery || 1;
    if(selectedDel.length !== requiredDel) {
        showToast(`This shop requires exactly ${requiredDel} delivery staff!`);
        return;
    }
    const requiredTech = shops[shopIdx].reqTech !== undefined ? shops[shopIdx].reqTech : 1;
    if(selectedTech.length !== requiredTech) {
        showToast(`This shop requires exactly ${requiredTech} technical staff!`);
        return;
    }
    
    shops[shopIdx].deliveryStaff = selectedDel;
    shops[shopIdx].technicalStaff = selectedTech;
    
    saveData();
    showToast('Staff assigned to shop successfully');
    document.getElementById('assign-form').reset();
    refreshAdminData();
});

// Auto-Assignment System
let proposedAssignments = null;

window.generateAutoAssignments = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isOnLeave = (id) => leaveRequests.some(lr => lr.staffId === id && lr.status === 'Approved' && todayStr >= lr.startDate && todayStr <= lr.endDate);
    
    // Collect non-absent and non-leave staff
    let availableDel = staffList.filter(s => s.role && s.role.includes('Delivery') && dailyAttendance[s.id] !== 'Absent' && dailyAttendance[s.id] !== 'Leave' && !isOnLeave(s.id));
    let availableTech = staffList.filter(s => s.role && s.role.includes('Technical') && dailyAttendance[s.id] !== 'Absent' && dailyAttendance[s.id] !== 'Leave' && !isOnLeave(s.id));
    
    // Shuffle arrays but prioritize staff who were on Standby last time
    const sortByPriorityAndRandom = (a, b) => {
        if (a.priorityAssignment && !b.priorityAssignment) return -1;
        if (!a.priorityAssignment && b.priorityAssignment) return 1;
        return 0.5 - Math.random();
    };
    
    availableDel.sort(sortByPriorityAndRandom);
    availableTech.sort(sortByPriorityAndRandom);
    
    proposedAssignments = shops.map(shop => {
        const reqDel = shop.reqDelivery || 1;
        const reqTech = shop.reqTech !== undefined ? shop.reqTech : 1;
        
        const delStaff = availableDel.splice(0, reqDel).map(s => s.id);
        const techStaff = availableTech.splice(0, reqTech).map(s => s.id);
        
        return {
            name: shop.name,
            deliveryStaff: delStaff,
            technicalStaff: techStaff
        };
    });
    
    // Render review panel
    const reviewTbody = document.getElementById('auto-assign-review-tbody');
    reviewTbody.innerHTML = proposedAssignments.map(shop => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
            <td style="padding: 1rem; font-weight: bold;">${shop.name}</td>
            <td style="padding: 1rem;">${shop.deliveryStaff.map(id => staffList.find(s=>s.id===id)?.name || id).join(', ') || '<span class="text-muted">None</span>'}</td>
            <td style="padding: 1rem;">${shop.technicalStaff.map(id => staffList.find(s=>s.id===id)?.name || id).join(', ') || '<span class="text-muted">None</span>'}</td>
        </tr>
    `).join('');
    
    document.getElementById('auto-assign-review-panel').style.display = 'block';
    showToast('Assignments generated. Review and click Finalize to lock them in.');
};

window.finalizeAutoAssignments = () => {
    if (!proposedAssignments) return;
    
    proposedAssignments.forEach((prop, i) => {
        shops[i].deliveryStaff = prop.deliveryStaff;
        shops[i].technicalStaff = prop.technicalStaff;
    });
    
    let newlyAssignedIds = [];
    proposedAssignments.forEach((prop, i) => {
        shops[i].deliveryStaff = prop.deliveryStaff;
        shops[i].technicalStaff = prop.technicalStaff;
        newlyAssignedIds.push(...prop.deliveryStaff);
        newlyAssignedIds.push(...prop.technicalStaff);
    });
    
    // Tag staff: if they did NOT get assigned today, they get priority next time
    staffList.forEach(s => {
        if (s.role && (s.role.includes('Delivery') || s.role.includes('Technical')) && dailyAttendance[s.id] !== 'Absent') {
            s.priorityAssignment = !newlyAssignedIds.includes(s.id);
        }
    });
    
    saveData();
    refreshAdminData();
    document.getElementById('auto-assign-review-panel').style.display = 'none';
    proposedAssignments = null;
    showToast('Auto-assignments finalized and broadcasted to staff!');
};

// Commission Settings
const settingsForm = document.getElementById('commission-settings-form');
if(settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        commissionSettings.admin = parseFloat(document.getElementById('setting-admin').value) || 0;
        commissionSettings.delivery = parseFloat(document.getElementById('setting-delivery').value) || 0;
        commissionSettings.tech = parseFloat(document.getElementById('setting-tech').value) || 0;
        saveData();
        showToast('Commission structure updated!');
        refreshAdminData();
    });
}

// Process Payment
document.getElementById('payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const shopIdx = document.getElementById('pay-shop').value;
    const amount = parseFloat(document.getElementById('pay-amount').value);
    
    if(shopIdx === "") {
        showToast('Please select a shop');
        return;
    }
    
    const shop = shops[shopIdx];
    
    // All shop commission goes directly to Agency Admin Account
    adminWallet.balance += amount;
    
    // Delivery staff no longer receive individual transactions immediately. 
    // It is distributed via the EOD Per-Order Salary pipeline.
    
    // Record payment
    const paymentRecord = {
        date: new Date().toLocaleString(),
        isoDate: new Date().toISOString(),
        shopName: shop.name,
        total: amount,
        adminCut: amount,
        deliveryCut: 0,
        techCut: 0
    };
    payments.push(paymentRecord);
    saveData();
    
    showToast('Payment processed successfully');
    
    // Show breakdown
    const breakdown = document.getElementById('payment-breakdown');
    breakdown.innerHTML = `
        <h3>Payment Breakdown</h3>
        <div class="list-item"><span>Agency Admin Account (100%):</span> <strong>₹${amount.toFixed(2)}</strong></div>
        <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.5rem; text-align: center;">Delivery & Tech payouts are distributed via End of Day Salary processing.</div>
    `;
    breakdown.classList.remove('hidden');
    
    document.getElementById('payment-form').reset();
    refreshAdminData();
});

// --- CIBIL Score Logic ---
window.calculateAgencyCibil = (staffId) => {
    let score = 500;
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return 0;

    // 1. Attendance History
    let daysPresent = 0;
    let daysAbsent = 0;

    for (let date in attendanceHistory) {
        let attVal = attendanceHistory[date][staffId];
        let stat = attVal && typeof attVal === 'object' ? attVal.status : attVal;
        
        if (stat === 'Present' || stat === 'Half') {
            daysPresent++;
            score += 5;
        } else if (stat === 'Absent') {
            daysAbsent++;
            score -= 10;
        }
    }

    // 2. Deliveries (only for delivery staff)
    if (staff.role === 'Delivery') {
        const totalDeliveries = dailyDeliveries[staffId] || 0;
        score += Math.floor(totalDeliveries / 5) * 5;
        
        // Penalty for zero deliveries despite being present
        if (totalDeliveries === 0 && daysPresent > 2) {
            score -= 20;
        }
    }

    // Clamp score
    if (score > 1000) score = 1000;
    if (score < 0) score = 0;

    return score;
};

window.getCibilRange = (score) => {
    if (score >= 850) return { label: 'Excellent', color: '#10b981' }; // green
    if (score >= 600) return { label: 'Good', color: '#3b82f6' }; // blue
    if (score >= 380) return { label: 'Moderate', color: '#f59e0b' }; // orange
    return { label: 'Poor', color: '#ef4444' }; // red
};

window.printAuditorReport = () => {
    document.body.classList.add('printing-auditor-report');
    window.print();
    setTimeout(() => {
        document.body.classList.remove('printing-auditor-report');
    }, 1000);
};

window.deleteAuditorReport = () => {
    if (confirm("Are you sure you want to delete this Daily Salary Payment Report? This action cannot be undone.")) {
        const id = document.getElementById('rpt-id').innerText;
        dailySalaryReports = dailySalaryReports.filter(r => r.id !== id);
        saveData();
        showToast(`Report ${id} deleted successfully.`, "success");
        document.getElementById('auditor-report-modal').style.display = 'none';
        refreshAdminData();
    }
};

// --- Staff Features & Modules ---
window.openStaffModule = (moduleName) => {
    document.getElementById('staff-home-view').style.display = 'none';
    document.getElementById('staff-leave-module').style.display = 'none';
    document.getElementById('staff-loan-module').style.display = 'none';
    document.getElementById('staff-otp-module').style.display = 'none';
    document.getElementById('staff-complaint-module').style.display = 'none';
    
    if(moduleName === 'leave') {
        document.getElementById('staff-leave-module').style.display = 'block';
    } else if(moduleName === 'loan') {
        document.getElementById('staff-loan-module').style.display = 'block';
    } else if(moduleName === 'otp') {
        document.getElementById('staff-otp-module').style.display = 'block';
    } else if(moduleName === 'complaint') {
        document.getElementById('staff-complaint-module').style.display = 'block';
        if (typeof renderStaffComplaints === 'function') renderStaffComplaints();
    }
};

window.closeStaffModules = () => {
    document.getElementById('staff-home-view').style.display = 'block';
    document.getElementById('staff-leave-module').style.display = 'none';
    document.getElementById('staff-loan-module').style.display = 'none';
    document.getElementById('staff-otp-module').style.display = 'none';
    document.getElementById('staff-complaint-module').style.display = 'none';
};

window.openCeoModule = (moduleName) => {
    // Hide overview components
    document.getElementById('ceo-module-boxes').style.display = 'none';
    const walletPanel = document.querySelector('.live-admin-wallet');
    if (walletPanel) {
        const panel = walletPanel.closest('.glass-panel');
        if (panel) panel.style.display = 'none';
    }
    
    // Hide all modules
    document.querySelectorAll('.ceo-module').forEach(mod => mod.style.display = 'none');
    
    // Show only the specific module
    if (moduleName === 'complaints') {
        const mod = document.getElementById('ceo-complaints-module');
        if (mod) {
            mod.style.display = 'block';
            if (typeof renderCEOComplaints === 'function') renderCEOComplaints();
        }
    } else if (moduleName === 'announcement') {
        const mod = document.getElementById('ceo-announcement-module');
        if (mod) {
            mod.style.display = 'block';
            if (typeof window.renderCEOAnnouncements === 'function') window.renderCEOAnnouncements();
        }
    } else if (moduleName === 'digisig') {
        const mod = document.getElementById('ceo-digisig-module');
        if (mod) mod.style.display = 'block';
    } else if (moduleName === 'fire') {
        const mod = document.getElementById('ceo-fire-module');
        if (mod) mod.style.display = 'block';
    } else if (moduleName === 'payroll') {
        const mod = document.getElementById('ceo-payroll-module');
        if (mod) mod.style.display = 'block';
    } else if (moduleName === 'loans') {
        const mod = document.getElementById('ceo-loan-module');
        if (mod) mod.style.display = 'block';
    }
};

window.closeCeoModules = () => {
    // Show overview boxes
    document.getElementById('ceo-module-boxes').style.display = 'flex';
    const walletPanel = document.querySelector('.live-admin-wallet');
    if (walletPanel) {
        const panel = walletPanel.closest('.glass-panel');
        if (panel) panel.style.display = 'flex';
    }
    
    // Hide all modules
    document.querySelectorAll('.ceo-module').forEach(mod => mod.style.display = 'none');
};

const refreshStaffData = () => {
    if (currentUser) {
        const freshUser = staffList.find(s => s.id === currentUser.id);
        if (freshUser) {
            const isAdmin = currentUser.isAdmin;
            const originalRole = currentUser.originalRole;
            const role = currentUser.role;
            currentUser = { ...freshUser, role, isAdmin, originalRole };
        }
    }
    document.getElementById('staff-user-name').textContent = currentUser.name || 'Staff';
    const roleBadge = document.getElementById('staff-user-role');
    roleBadge.textContent = currentUser.originalRole || currentUser.role || 'Unknown';
    roleBadge.className = `badge ${currentUser.role === 'Technical' ? 'technical' : ''}`;
    
    const adminBtn = document.getElementById('btn-admin-workspace');
    if(adminBtn) {
        adminBtn.style.display = currentUser.isAdmin ? 'inline-block' : 'none';
    }

    const idCardBtn = document.getElementById('btn-view-id-card');
    if (idCardBtn) {
        const hasCard = idCards.some(c => c.staffId === currentUser.id);
        idCardBtn.style.display = hasCard ? 'inline-block' : 'none';
    }
    
    // Hide specific staff-only UI elements if the user is a corporate manager
    const statusCard = document.getElementById('staff-status-card');
    const revenueCard = document.getElementById('staff-revenue-card');
    const shopsPanel = document.getElementById('staff-assigned-shops-panel');
    
    const isManager = !!currentUser.isAdmin;
    
    if (statusCard) statusCard.style.display = isManager ? 'none' : 'block';
    if (revenueCard) revenueCard.style.display = isManager ? 'none' : 'block';
    if (shopsPanel) shopsPanel.style.display = isManager ? 'none' : 'block';
    
    document.getElementById('staff-earnings').textContent = `₹${(currentUser.earnings || 0).toFixed(2)}`;
    document.getElementById('staff-upi-display').textContent = currentUser.upi || 'N/A';
    
    // Find assigned shops
    const myShopsList = document.getElementById('staff-shops');
    myShopsList.innerHTML = '';
    
    const myShops = shops.filter(shop => {
        if(currentUser.role === 'Delivery') {
            return Array.isArray(shop.deliveryStaff) ? shop.deliveryStaff.includes(currentUser.id) : shop.deliveryStaff === currentUser.id;
        }
        const techArr = Array.isArray(shop.technicalStaff) ? shop.technicalStaff : (shop.technicalStaff ? [shop.technicalStaff] : []);
        return techArr.includes(currentUser.id);
    });
    
    // Show Delivery OTP module box if role is Delivery
    const otpBox = document.getElementById('otp-3d-box');
    if (otpBox) {
        if(currentUser.role === 'Delivery') {
            otpBox.style.display = 'block';
            
            // Populate OTP assigned shop select
            const shopSelect = document.getElementById('otp-shop-select');
            if (shopSelect) {
                if (myShops.length === 1) {
                    shopSelect.innerHTML = `<option value="${myShops[0].name}" selected>${myShops[0].name}</option>`;
                } else {
                    shopSelect.innerHTML = '<option value="">-- Select Shop --</option>';
                    myShops.forEach(shop => {
                        shopSelect.innerHTML += `<option value="${shop.name}">${shop.name}</option>`;
                    });
                }
            }
        } else {
            otpBox.style.display = 'none';
        }
    }

    let shopsHtml = myShops.map(s => `
        <div class="list-item">
            <strong>${s.name}</strong><br>
            <small style="color: #94a3b8;">Base: ₹${currentUser.role === 'Delivery' ? s.baseDelivery || 0 : s.baseTech || 0}</small>
        </div>
    `).join('');
    
    // Add custom assignment if it exists
    const customRole = dailyAttendance[currentUser.id + '_custom'];
    if (customRole) {
        shopsHtml += `
            <div class="list-item" style="border-color: rgba(139, 92, 246, 0.4);">
                <strong>Special Assignment</strong><br>
                <span class="badge" style="background: rgba(139, 92, 246, 0.3); color: #c4b5fd; margin-top: 0.3rem; border: 1px solid rgba(139, 92, 246, 0.5);">${customRole}</span>
            </div>
        `;
    }

    let attData = dailyAttendance[currentUser.id];
    let todayStatus = attData && typeof attData === 'object' ? attData.status : (attData || 'Not Given Yet');

    if (!shopsHtml && !customRole) {
        if (todayStatus === 'Absent') {
            myShopsList.innerHTML = '<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 1rem; border-radius: 8px; text-align: center;"><strong style="color: #ef4444; font-size: 1.1rem;">Not Assigned (Absent)</strong></div>';
        } else {
            myShopsList.innerHTML = '<div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 1rem; border-radius: 8px; text-align: center;"><strong style="color: #f59e0b; font-size: 1.1rem;">You are currently on STANDBY</strong><p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: #94a3b8;">Please wait for manual assignment from the Operations Manager.</p></div>';
        }
    } else {
        myShopsList.innerHTML = shopsHtml;
    }

    // Analytics Calculation
    const now = new Date();
    const todayLocal = now.toLocaleDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let todayEarn = 0;
    let monthEarn = 0;

    if (currentUser.transactions) {
        currentUser.transactions.forEach(tx => {
            if (tx.date === todayLocal) todayEarn += tx.amount;
            
            // Robust date parsing for monthly to handle DD/MM vs MM/DD locale differences
            const parts = tx.date.split(/[/-]/);
            if (parts.length >= 3) {
                const mStr = String(currentMonth + 1);
                const mStrPad = String(currentMonth + 1).padStart(2, '0');
                
                // Check if either the first or second part matches the current month
                const isCurrentMonth = (parts[0] === mStr || parts[0] === mStrPad || parts[1] === mStr || parts[1] === mStrPad);
                // The year is usually the 3rd part
                const isCurrentYear = parts[2].includes(String(currentYear)) || parts[0].includes(String(currentYear)); // sometimes YYYY/MM/DD
                
                if (isCurrentMonth && isCurrentYear) {
                    monthEarn += tx.amount;
                }
            } else {
                // If completely unparseable structure, add it to month to be safe
                monthEarn += tx.amount;
            }
        });
    }

    // Total Revenue for assigned shops
    const myShopNames = myShops.map(s => s.name);
    let myShopsRevenue = 0;
    payments.forEach(p => {
        if (myShopNames.includes(p.shopName)) {
            myShopsRevenue += p.total;
        }
    });

    const elToday = document.getElementById('staff-today-earn');
    const elMonth = document.getElementById('staff-month-earn');
    const elStatus = document.getElementById('staff-attendance-status');
    const elRev = document.getElementById('staff-agency-revenue');
    const elDeliveriesCard = document.getElementById('staff-deliveries-card');
    const elTodayDeliveries = document.getElementById('staff-today-deliveries');
    const elTotalDeliveriesCard = document.getElementById('staff-total-deliveries-card');
    const elTotalDeliveries = document.getElementById('staff-total-deliveries');

    if (currentUser.role === 'Delivery') {
        if (elDeliveriesCard && elTodayDeliveries) {
            elDeliveriesCard.style.display = 'block';
            elTodayDeliveries.textContent = dailyDeliveries[currentUser.id] || 0;
        }
        if (elTotalDeliveriesCard && elTotalDeliveries) {
            elTotalDeliveriesCard.style.display = 'block';
            const totalDels = otpLogs.filter(l => l.staffId === currentUser.id).length;
            elTotalDeliveries.textContent = totalDels;
        }
    } else {
        if (elDeliveriesCard) elDeliveriesCard.style.display = 'none';
        if (elTotalDeliveriesCard) elTotalDeliveriesCard.style.display = 'none';
    }

    if(elToday) elToday.textContent = `₹${todayEarn.toFixed(2)}`;
    if(elMonth) elMonth.textContent = `₹${monthEarn.toFixed(2)}`;
    if(elStatus) {
        elStatus.textContent = todayStatus;
        if(todayStatus === 'Absent') elStatus.style.color = '#ef4444';
        else if(todayStatus === 'Half') elStatus.style.color = '#f59e0b';
        else elStatus.style.color = '#3b82f6';
    }
    if(elRev) elRev.textContent = `₹${myShopsRevenue.toFixed(2)}`;
    
    // CIBIL Score Update
    const cibilScore = calculateAgencyCibil(currentUser.id);
    const elCibilScore = document.getElementById('staff-cibil-score');
    const elCibilBadge = document.getElementById('staff-cibil-badge');
    if (elCibilScore && elCibilBadge) {
        elCibilScore.textContent = cibilScore === null ? 'N/A' : cibilScore;
        const range = getCibilRange(cibilScore);
        elCibilBadge.textContent = range.label;
        elCibilBadge.style.background = range.color;
        elCibilScore.style.color = range.color;
    }

    // Pre-fill Loan Details
    const elLoanAc = document.getElementById('loan-ac-num');
    const elLoanIfsc = document.getElementById('loan-ifsc');
    const elLoanBranch = document.getElementById('loan-branch');
    if (elLoanAc) elLoanAc.value = currentUser.ac || '';
    if (elLoanIfsc) elLoanIfsc.value = currentUser.ifsc || '';
    if (elLoanBranch) elLoanBranch.value = currentUser.branch || '';

    // Populate Staff Loans History
    renderStaffLoansHistory();
    
    // Populate Staff Complaints History
    if (typeof renderStaffComplaints === 'function') renderStaffComplaints();

    // OTP Section Visibility & Dropdown (Only for Delivery staff)
    const otpSection = document.getElementById('staff-otp-section');
    const otpShopSelect = document.getElementById('otp-shop-select');
    if (otpSection && otpShopSelect) {
        if (currentUser.role === 'Delivery' && todayStatus !== 'Absent') {
            otpSection.style.display = 'block';
            otpShopSelect.innerHTML = myShops.length > 0 
                ? myShops.map(s => `<option value="${s.name}">${s.name}</option>`).join('')
                : '<option value="">No shops assigned (Standby)</option>';
        } else {
            otpSection.style.display = 'none';
        }
    }
    
    // Fill Earnings Report
    const reportContent = document.getElementById('staff-report-content');
    if (reportContent) {
        if (!currentUser.transactions || currentUser.transactions.length === 0) {
            reportContent.innerHTML = '<p class="text-muted">No earnings recorded yet.</p>';
        } else {
            let html = `
                <div style="text-align:center; margin-bottom: 1.5rem;">
                    <img src="logo.png" alt="AURA Dispatch Logo" style="max-width: 100px;">
                </div>
                <table style="width:100%; text-align:left; border-collapse: collapse;">
                <tr style="border-bottom: 2px solid #ccc;">
                    <th>Date & Time</th>
                    <th>Source / Shop</th>
                    <th>Amount</th>
                </tr>`;
            // Reverse so newest is first
            [...currentUser.transactions].reverse().forEach(tx => {
                html += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px 0;">${tx.date} <small class="text-muted">${tx.time}</small></td>
                        <td>${tx.source}</td>
                        <td style="color: #10b981; font-weight: bold;">+₹${tx.amount.toFixed(2)}</td>
                    </tr>
                `;
            });
            html += `</table>`;
            reportContent.innerHTML = html;
        }
    }
    
    // Fill Leave History
    const leaveHistoryContent = document.getElementById('staff-leave-history');
    if (leaveHistoryContent) {
        const myLeaves = leaveRequests.filter(lr => lr.staffId === currentUser.id && !lr.hiddenByStaff);
        if (myLeaves.length === 0) {
            leaveHistoryContent.innerHTML = '<p class="text-muted">No leave applications found.</p>';
        } else {
            leaveHistoryContent.innerHTML = [...myLeaves].reverse().map(lr => {
                let badgeColor = '#94a3b8';
                if (lr.status === 'Approved') badgeColor = '#10b981';
                else if (lr.status === 'Rejected') badgeColor = '#ef4444';
                else badgeColor = '#f59e0b';
                
                let printBtn = (lr.status === 'Approved' || lr.status === 'Rejected') ? `<button class="btn btn-primary" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; margin-top: 0.5rem; margin-right: 0.5rem;" onclick="viewLeaveLetter('${lr.id}')">View / Print Letter</button>` : '';
                let deleteBtn = `<button class="btn btn-outline" style="color: #ef4444; border-color: #ef4444; padding: 0.2rem 0.5rem; font-size: 0.8rem; margin-top: 0.5rem;" onclick="staffHideLeave('${lr.id}')">Delete</button>`;

                return `
                    <div class="list-item" style="border-color: rgba(255,255,255,0.1); margin-bottom: 0.5rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <strong>${lr.startDate} to ${lr.endDate} (${lr.totalDays} Days)</strong>
                            <span class="badge" style="background: ${badgeColor}20; color: ${badgeColor}; border: 1px solid ${badgeColor};">${lr.status}</span>
                        </div>
                        <p style="margin: 0.3rem 0; font-size: 0.85rem; color: #94a3b8;">Reason: ${lr.reason}</p>
                        <div>
                            ${printBtn}
                            ${deleteBtn}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
};
// OTP Request Form Submission
const otpForm = document.getElementById('otp-submit-form');
if (otpForm) {
    otpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const shopName = document.getElementById('otp-shop-select').value;
        const code = document.getElementById('otp-code').value.trim();
        const amount = parseFloat(document.getElementById('otp-amount').value);
        const feeInput = document.getElementById('otp-fee');
        const fee = feeInput && feeInput.value ? parseFloat(feeInput.value) : 0;

        if (!shopName) {
            showToast('Please select a shop first!');
            return;
        }

        // Store data temporarily for after the scan
        window.pendingDeliveryData = { shopName, code, amount, fee };
        
        // Open Scanner
        document.getElementById('staff-otp-module').style.display = 'none';
        document.getElementById('qr-scan-modal').style.display = 'flex';
        
        window.startDeliveryQRScanner();
    });
}

// =========================================================
// QR Scanner & Thermal Receipt Logic
// =========================================================
window.pendingDeliveryData = null;
window.html5QrcodeScanner = null;

window.startDeliveryQRScanner = () => {
    if (window.html5QrcodeScanner) {
        window.html5QrcodeScanner.clear();
    }
    
    // Config for Html5QrcodeScanner
    window.html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
    window.html5QrcodeScanner.render(window.onScanSuccess, window.onScanFailure);
};

window.closeQRScanner = () => {
    if (window.html5QrcodeScanner) {
        window.html5QrcodeScanner.clear();
    }
    document.getElementById('qr-scan-modal').style.display = 'none';
    document.getElementById('staff-otp-module').style.display = 'block';
};

window.onScanFailure = (error) => {
    // Ignore routine scan failures (when no code is in view)
};

window.onScanSuccess = (decodedText, decodedResult) => {
    // Stop scanning
    if (window.html5QrcodeScanner) {
        window.html5QrcodeScanner.clear();
    }
    
    let data = {};
    try {
        // First, try standard JSON
        data = JSON.parse(decodedText);
    } catch (e) {
        // Fallback: Extremely flexible plain text parser
        // Converts everything to one line and extracts values between known keywords
        const normalized = decodedText.replace(/\n/g, ' ');
        
        const extract = (keywords) => {
            const joined = keywords.join('|');
            const lookahead = 'receipt|recid|rec no|date|dt|shop|store|customer|custumer|cust|phone|mob|mobile';
            const regex = new RegExp(`(?:${joined})\\s*[:\\-]?\\s*([^]+?)(?=\\s*(?:${lookahead})\\s*[:\\-]|$|\\n)`, 'i');
            const match = normalized.match(regex);
            return match ? match[1].trim() : null;
        };

        data['Receipt'] = extract(['receipt', 'recid', 'rec no']);
        data['Date'] = extract(['date', 'dt']);
        data['Shop'] = extract(['shop', 'store']);
        data['Customer'] = extract(['customer', 'custumer', 'cust']);
        data['Phone'] = extract(['phone', 'mob', 'mobile']);
    }
    
    // Check if we extracted at least something to ensure it's not totally garbage
    if (!data['Receipt'] && !data['Shop'] && !data['Customer']) {
        console.error("QR Parse Error: No matching fields found in text:", decodedText);
        showToast('Invalid QR Code! Please ensure it contains Receipt, Date, Shop, etc.');
        window.closeQRScanner();
        return;
    }
    
    // Populate Thermal Receipt
    document.getElementById('bill-receipt-no').innerText = data['Receipt'] || 'N/A';
    document.getElementById('bill-date').innerText = data['Date'] || new Date().toLocaleDateString();
    document.getElementById('bill-shop').innerText = data['Shop'] || window.pendingDeliveryData.shopName;
    document.getElementById('bill-customer').innerText = data['Customer'] || 'N/A';
    document.getElementById('bill-phone').innerText = data['Phone'] || 'N/A';
    
    document.getElementById('bill-staff-name').innerText = currentUser.name || 'Unknown';
    document.getElementById('bill-staff-id').innerText = currentUser.id || 'Unknown';
    
    const orderAmount = window.pendingDeliveryData.amount || 0;
    const feeAmount = window.pendingDeliveryData.fee || 0;
    const totalAmount = orderAmount + feeAmount;

    document.getElementById('bill-order-amount').innerText = orderAmount.toFixed(2);
    document.getElementById('bill-fee-amount').innerText = feeAmount.toFixed(2);
    document.getElementById('bill-price').innerText = totalAmount.toFixed(2);
    
    // Generate QR Code for the paid bill
    const billDataString = `OFFICIAL PAID BILL\nReceipt: ${data['Receipt'] || 'N/A'}\nDate: ${data['Date'] || new Date().toLocaleDateString()}\nShop: ${data['Shop'] || window.pendingDeliveryData.shopName}\nCustomer: ${data['Customer'] || 'N/A'}\nPhone: ${data['Phone'] || 'N/A'}\nStaff: ${currentUser.name}\nTotal Amount: Rs. ${totalAmount.toFixed(2)}`;
    document.getElementById('bill-qrcode').innerHTML = ''; // Clear previous QR
    new QRCode(document.getElementById('bill-qrcode'), {
        text: billDataString,
        width: 100,
        height: 100,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });
    
    // Hide Scanner, Show Bill
    document.getElementById('qr-scan-modal').style.display = 'none';
    document.getElementById('paid-bill-modal').style.display = 'flex';
    
    // Finalize Delivery (count it)
    window.finalizeDelivery();
};

window.finalizeDelivery = () => {
    if (!window.pendingDeliveryData) return;
    
    const { shopName, code, amount, fee } = window.pendingDeliveryData;
    const totalAmount = (amount || 0) + (fee || 0);
    const otpId = generateId('OTP-');
    
    // Force reset if day changed before logging OTP
    const todayStr = new Date().toISOString().split('T')[0];
    if (lastAttendanceDate && lastAttendanceDate !== todayStr) {
        if (typeof checkAndResetDailyData === 'function') checkAndResetDailyData();
    }
    
    // Push to logs
    otpLogs.push({
        id: otpId,
        staffId: currentUser.id,
        staffName: currentUser.name,
        shopName: shopName,
        otp: code,
        amount: totalAmount,
        orderAmount: amount,
        fee: fee,
        timestamp: new Date().toLocaleString()
    });
    
    // Auto-increment delivery count
    dailyDeliveries[currentUser.id] = (dailyDeliveries[currentUser.id] || 0) + 1;
    
    saveData();
    refreshStaffData();
    
    showToast('Delivery completed! Receipt generated.');
    const otpForm = document.getElementById('otp-submit-form');
    if(otpForm) otpForm.reset();
    
    window.pendingDeliveryData = null; // clear after finalizing
};

window.printPaidBill = () => {
    document.body.classList.add('printing-thermal');
    
    // Inject custom @page rule only for this specific print job
    const style = document.createElement('style');
    style.id = 'thermal-page-style';
    style.innerHTML = '@page { size: 58mm 240mm; margin: 0; }';
    document.head.appendChild(style);
    
    window.print();
    
    document.body.classList.remove('printing-thermal');
    const styleElement = document.getElementById('thermal-page-style');
    if (styleElement) styleElement.remove();
};

// Leave Request Form Submission
const leaveForm = document.getElementById('leave-form');
if (leaveForm) {
    leaveForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const startDate = document.getElementById('leave-start').value;
        const endDate = document.getElementById('leave-end').value;
        const days = parseInt(document.getElementById('leave-days').value, 10);
        const reason = document.getElementById('leave-reason').value;

        const reqId = generateId('LR-');
        
        let status = 'Pending MD';
        if (['md', 'finance', 'operations', 'auditor'].includes(currentUser.role)) {
            status = 'Pending CEO';
        }

        leaveRequests.push({
            id: reqId,
            staffId: currentUser.id,
            name: currentUser.name,
            role: currentUser.originalRole || currentUser.role,
            upi: currentUser.upi,
            startDate,
            endDate,
            totalDays: days,
            reason,
            status,
            timestamp: new Date().toISOString()
        });

        saveData();
        showToast('Leave request sent successfully!');
        leaveForm.reset();
        refreshStaffData();
    });
}

// Complaint Request Form Submission
const complaintForm = document.getElementById('complaint-form');
if (complaintForm) {
    complaintForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let category = document.getElementById('comp-category').value;
        if (category === 'Other') {
            category = document.getElementById('comp-other-category').value || 'Other';
        }
        
        const subject = document.getElementById('comp-subject').value;
        const description = document.getElementById('comp-desc').value;
        const incDate = document.getElementById('comp-inc-date').value;
        const incTime = document.getElementById('comp-inc-time').value;
        const incLoc = document.getElementById('comp-inc-loc').value;
        const incEmp = document.getElementById('comp-inc-emp').value;
        const resolution = document.getElementById('comp-res').value;
        const signature = document.getElementById('comp-signature').value;

        const compId = generateId('CMP-');
        const now = new Date();
        
        staffComplaints.push({
            id: compId,
            staffId: currentUser.id,
            name: currentUser.name,
            role: currentUser.originalRole || currentUser.role,
            mobile: currentUser.mobile || 'N/A',
            email: currentUser.email || 'N/A',
            department: currentUser.department || currentUser.role,
            category,
            subject,
            description,
            incDate,
            incTime,
            incLoc,
            incEmp,
            resolution,
            signature,
            appDate: now.toLocaleDateString(),
            appTime: now.toLocaleTimeString(),
            status: 'Pending CEO',
            timestamp: now.toISOString(),
            ceoReply: '',
            ceoReplyDate: '',
            ceoSignatureStr: ''
        });

        saveData();
        showToast('Complaint submitted successfully to CEO!');
        complaintForm.reset();
        document.getElementById('comp-other-category-group').style.display = 'none';
        renderStaffComplaints();
    });

    const compCatSelect = document.getElementById('comp-category');
    if (compCatSelect) {
        compCatSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Other') {
                document.getElementById('comp-other-category-group').style.display = 'block';
            } else {
                document.getElementById('comp-other-category-group').style.display = 'none';
            }
        });
    }
}

// Render Staff Complaints
window.renderStaffComplaints = () => {
    const list = document.getElementById('staff-complaints-list');
    if (!list) return;
    
    if (!currentUser) return;
    
    const myComplaints = staffComplaints.filter(c => c.staffId === currentUser.id);
    if (myComplaints.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 1rem;">No complaints filed yet.</div>`;
        return;
    }
    
    myComplaints.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    list.innerHTML = myComplaints.map(c => {
        let badgeColor = c.status === 'Resolved' ? '#10b981' : '#f59e0b';
        return `
            <div class="list-item" style="cursor: pointer; border-left: 4px solid ${badgeColor};" onclick="openComplaintA4View('${c.id}', 'staff')">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <strong style="color: #0ea5e9;">${c.subject}</strong><br>
                        <span style="font-size: 0.8rem; color: #94a3b8;">${c.appDate} - ${c.category}</span>
                    </div>
                    <span class="badge" style="background: ${badgeColor}; color: white;">${c.status}</span>
                </div>
            </div>
        `;
    }).join('');
};

// Render CEO Complaints
window.renderCEOComplaints = () => {
    const tbody = document.getElementById('ceo-complaints-tbody');
    if (!tbody) return;
    
    if (staffComplaints.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1rem; color: #94a3b8;">No staff complaints found.</td></tr>`;
        return;
    }
    
    const sorted = [...staffComplaints].sort((a,b) => {
        // Pending first
        if (a.status === 'Pending CEO' && b.status !== 'Pending CEO') return -1;
        if (a.status !== 'Pending CEO' && b.status === 'Pending CEO') return 1;
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    tbody.innerHTML = sorted.map(c => {
        let badgeColor = c.status === 'Resolved' ? '#10b981' : '#f59e0b';
        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 1rem;">${c.appDate}</td>
                <td style="padding: 1rem;"><strong>${c.name}</strong><br><span style="font-size: 0.8rem; color: #94a3b8;">${c.role}</span></td>
                <td style="padding: 1rem;">${c.category}</td>
                <td style="padding: 1rem;"><span class="badge" style="background: ${badgeColor}; color: white;">${c.status}</span></td>
                <td style="padding: 1rem; text-align: right;">
                    <button class="btn btn-primary" onclick="openComplaintA4View('${c.id}', 'ceo')">Review</button>
                </td>
            </tr>
        `;
    }).join('');
};

// Open Complaint A4 View
let currentComplaintId = null;
window.openComplaintA4View = (id, viewRole) => {
    const c = staffComplaints.find(comp => comp.id === id);
    if (!c) return;
    currentComplaintId = id;
    
    document.getElementById('print-comp-id').textContent = c.id;
    document.getElementById('print-comp-app-date').textContent = c.appDate;
    document.getElementById('print-comp-app-time').textContent = c.appTime;
    
    document.getElementById('print-comp-name').textContent = c.name;
    document.getElementById('print-comp-staffid').textContent = c.staffId;
    document.getElementById('print-comp-dept').textContent = c.department;
    document.getElementById('print-comp-desig').textContent = c.role;
    document.getElementById('print-comp-mob').textContent = c.mobile;
    document.getElementById('print-comp-email').textContent = c.email;
    
    document.getElementById('print-comp-cat').textContent = c.category;
    document.getElementById('print-comp-subj').textContent = c.subject;
    document.getElementById('print-comp-desc').textContent = c.description;
    
    document.getElementById('print-comp-incdate').textContent = c.incDate;
    document.getElementById('print-comp-inctime').textContent = c.incTime;
    document.getElementById('print-comp-incloc').textContent = c.incLoc;
    document.getElementById('print-comp-incemp').textContent = c.incEmp || 'None specified';
    
    document.getElementById('print-comp-reqres').textContent = c.resolution;
    
    document.getElementById('print-comp-empsig').textContent = c.signature;
    document.getElementById('print-comp-empname').textContent = c.name;
    
    const replySection = document.getElementById('ceo-reply-section');
    const actionTools = document.getElementById('ceo-action-tools');
    
    if (c.status === 'Resolved') {
        replySection.style.display = 'block';
        document.getElementById('print-ceo-reply-text').textContent = c.ceoReply;
        document.getElementById('print-comp-ceosig').textContent = c.ceoSignatureStr;
        document.getElementById('print-comp-reply-date').textContent = c.ceoReplyDate;
        
        // Show Seal
        const sealImg = document.getElementById('print-comp-seal');
        sealImg.style.display = 'block';
        sealImg.src = 'assets/official_seal.png';
        
        actionTools.style.display = 'none';
    } else {
        replySection.style.display = 'none';
        if (viewRole === 'ceo') {
            actionTools.style.display = 'block';
            document.getElementById('ceo-reply-input').value = '';
        } else {
            actionTools.style.display = 'none';
        }
    }
    
    openModal('modal-complaint-a4');
};

window.printComplaintA4 = () => {
    document.body.classList.add('printing-complaint');
    window.print();
    setTimeout(() => {
        document.body.classList.remove('printing-complaint');
    }, 500);
};

// ==========================================
// Announcements Feature (CEO / Staff)
// ==========================================

window.publishAnnouncement = () => {
    const subject = document.getElementById('ceo-announce-subject').value.trim();
    const body = document.getElementById('ceo-announce-body').value.trim();
    const effDate = document.getElementById('ceo-announce-date').value;

    if (!subject || !body || !effDate) {
        showToast('Please fill out Subject, Announcement, and Effective Date.', 'error');
        return;
    }

    if (!ceoDigitalSignature) {
        showToast('CEO Digital Signature is missing. Please set it in Settings first.', 'error');
        return;
    }

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const formattedEffDateParts = effDate.split('-');
    const formattedEffDate = `${formattedEffDateParts[2]}/${formattedEffDateParts[1]}/${formattedEffDateParts[0]}`;
    const announceId = `ANN-${Date.now().toString().slice(-6)}`;

    const newAnnouncement = {
        id: announceId,
        date: formattedDate,
        subject: subject,
        body: body,
        effectiveDate: formattedEffDate,
        ceoSignatureStr: ceoDigitalSignature
    };

    officialAnnouncements.push(newAnnouncement);
    saveData();
    showToast('Official Announcement Published Successfully!', 'success');
    
    // Clear form
    document.getElementById('ceo-announce-subject').value = '';
    document.getElementById('ceo-announce-body').value = '';
    document.getElementById('ceo-announce-date').value = '';
    
    window.renderCEOAnnouncements();
};

window.renderCEOAnnouncements = () => {
    const tbody = document.getElementById('ceo-announcements-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (officialAnnouncements.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 1rem; color: #94a3b8;">No announcements published yet.</td></tr>`;
        return;
    }

    // Show newest first
    const sorted = [...officialAnnouncements].reverse();
    sorted.forEach(ann => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(139, 92, 246, 0.2)';
        tr.innerHTML = `
            <td style="padding: 1rem; color: #e2e8f0; font-size: 0.9rem;">${ann.date}</td>
            <td style="padding: 1rem; color: #e2e8f0; font-size: 0.9rem;">${ann.subject}</td>
            <td style="padding: 1rem; text-align: right;">
                <button class="btn btn-primary" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="window.deleteAnnouncement('${ann.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.deleteAnnouncement = (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    officialAnnouncements = officialAnnouncements.filter(a => a.id !== id);
    saveData();
    showToast('Announcement deleted.', 'success');
    window.renderCEOAnnouncements();
};

window.viewAnnouncementList = () => {
    if (!officialAnnouncements || officialAnnouncements.length === 0) {
        showToast('No official announcements at this time.', 'info');
        return;
    }
    
    const listContainer = document.getElementById('staff-announcements-list');
    listContainer.innerHTML = '';
    
    const sorted = [...officialAnnouncements].reverse();
    sorted.forEach(ann => {
        const item = document.createElement('div');
        item.style.padding = '1rem';
        item.style.background = 'rgba(139, 92, 246, 0.1)';
        item.style.border = '1px solid rgba(139, 92, 246, 0.3)';
        item.style.borderRadius = '8px';
        item.style.cursor = 'pointer';
        item.style.transition = 'all 0.2s ease';
        item.onmouseover = () => item.style.background = 'rgba(139, 92, 246, 0.2)';
        item.onmouseout = () => item.style.background = 'rgba(139, 92, 246, 0.1)';
        item.onclick = () => window.viewAnnouncement(ann.id);
        
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <h4 style="margin: 0; color: #c4b5fd; font-size: 1.1rem;">${ann.subject}</h4>
                <span style="font-size: 0.8rem; color: #8b5cf6;">${ann.date}</span>
            </div>
            <div style="font-size: 0.9rem; color: #94a3b8;">Effective: ${ann.effectiveDate}</div>
        `;
        listContainer.appendChild(item);
    });
    
    openModal('modal-announcement-list');
};

window.viewAnnouncement = (id) => {
    const ann = officialAnnouncements.find(a => a.id === id);
    if (!ann) return;

    document.getElementById('print-ann-id').textContent = ann.id;
    document.getElementById('print-ann-date').textContent = ann.date;
    document.getElementById('print-ann-subject').textContent = ann.subject;
    document.getElementById('print-ann-body').textContent = ann.body;
    document.getElementById('print-ann-eff-date').textContent = ann.effectiveDate;
    document.getElementById('print-ann-ceo-sig').textContent = ann.ceoSignatureStr;

    // Close the list modal if it's open
    closeModal('modal-announcement-list');
    openModal('modal-announcement-a4');
};

window.printAnnouncementA4 = () => {
    document.body.classList.add('printing-announcement');
    window.print();
    setTimeout(() => {
        document.body.classList.remove('printing-announcement');
    }, 500);
};

window.submitCeoReply = () => {
    if (!currentComplaintId) return;
    const c = staffComplaints.find(comp => comp.id === currentComplaintId);
    if (!c) return;
    
    const replyText = document.getElementById('ceo-reply-input').value.trim();
    if (!replyText) {
        showToast('Please enter a resolution/reply before signing.', 'error');
        return;
    }
    
    c.status = 'Resolved';
    c.ceoReply = replyText;
    c.ceoSignatureStr = ceoDigitalSignature || 'System CEO';
    c.ceoReplyDate = new Date().toLocaleString();
    
    saveData();
    showToast('Complaint marked as resolved!');
    renderCEOComplaints();
    if (currentUser && currentUser.role !== 'ceo') {
        renderStaffComplaints();
    }
    
    openComplaintA4View(currentComplaintId, 'ceo');
};

// View Leave Approved Letter
window.viewLeaveLetter = (leaveId) => {
    const lr = leaveRequests.find(l => l.id === leaveId);
    if (!lr) return;
    
    const isRejected = lr.status === 'Rejected';
    const headerColor = isRejected ? '#ef4444' : '#10b981';
    const headerText = isRejected ? '❌ OFFICIAL LEAVE REJECTED' : '✅ OFFICIAL LEAVE GRANTED';
    
    let approvalsArr = lr.approvals || [];
    // Fallback for old leaves that were approved before tracking was added
    if (!isRejected && approvalsArr.length === 0 && lr.status === 'Approved') {
        approvalsArr = ['Managing Director', 'Operations Manager'];
    }
    
    let authorityHtml = '';
    if (!isRejected && approvalsArr.length > 0) {
        authorityHtml = `<tr><th>Approved By:</th><td style="color: #3b82f6; font-weight: bold;">${approvalsArr.join(', ')} (${approvalsArr.length} Authority)</td></tr>`;
    } else if (isRejected) {
        const rejectedBy = lr.rejectedBy || 'Management';
        const rejectionReason = lr.rejectionReason || 'Administrative Decision';
        authorityHtml = `
            <tr><th>Rejected By:</th><td style="color: #ef4444; font-weight: bold;">${rejectedBy}</td></tr>
            <tr><th>Rejection Reason:</th><td style="color: #ef4444;">${rejectionReason}</td></tr>
        `;
    }

    document.getElementById('leave-letter-content').innerHTML = `
        <h3 style="color: ${headerColor}; margin-bottom: 1.5rem; text-align: center;">${headerText}</h3>
        <table class="letter-table" style="width: 100%; text-align: left; margin-bottom: 1rem;">
            ${!isRejected ? `<tr><th>Leave Number:</th><td style="font-weight: bold; color: #3b82f6;">${lr.leaveNumber || lr.id}</td></tr>` : ''}
            <tr><th>Staff Name:</th><td>${lr.name}</td></tr>
            <tr><th>Staff ID:</th><td>${lr.staffId}</td></tr>
            <tr><th>Role:</th><td>${lr.role}</td></tr>
            <tr><th>Total Days:</th><td>${lr.totalDays}</td></tr>
            <tr><th>Duration:</th><td>${lr.startDate} to ${lr.endDate}</td></tr>
            <tr><th>Leave Reason:</th><td>${lr.reason}</td></tr>
            ${authorityHtml}
        </table>
        ${!isRejected ? `
        <div style="display: flex; justify-content: space-around; align-items: flex-end; margin-top: 3rem; margin-bottom: 2rem;">
            <div style="text-align: center;">
                <img src="assets/official_seal.png" alt="Official Seal" style="max-width: 120px; mix-blend-mode: multiply; margin-bottom: 0.5rem; opacity: 0.85;">
            </div>
            <div style="text-align: center;">
                <div style="font-family: 'Dancing Script', cursive; font-size: 24px; color: #10b981; min-height: 35px;">${omSignature || ''}</div>
                <div style="border-bottom: 1px solid #1e293b; margin-bottom: 0.5rem; width: 150px; margin-left: auto; margin-right: auto;"></div>
                <p style="margin: 0; font-size: 0.8rem; color: #64748b;">Operations Manager 👤✔️</p>
            </div>
            <div style="text-align: center;">
                <div style="font-family: 'Dancing Script', cursive; font-size: 24px; color: #3b82f6; min-height: 35px;">${mdSignature || ''}</div>
                <div style="border-bottom: 1px solid #1e293b; margin-bottom: 0.5rem; width: 150px; margin-left: auto; margin-right: auto;"></div>
                <p style="margin: 0; font-size: 0.8rem; color: #64748b;">MD Signature 👤✔️</p>
            </div>
        </div>
        ` : ''}
        <p style="color: #64748b; font-size: 0.9rem; text-align: center; margin-top: 2rem;">Authorized electronically by AURA Dispatch Corporate Management.</p>
    `;
    const leaveLetterEl = document.getElementById('leave-letter');
    leaveLetterEl.classList.remove('hidden');
    leaveLetterEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const printLeaveLetterBtn = document.getElementById('print-leave-letter');
if (printLeaveLetterBtn) {
    printLeaveLetterBtn.addEventListener('click', () => {
        document.body.classList.add('printing-letter');
        window.print();
        setTimeout(() => {
            document.body.classList.remove('printing-letter');
            document.getElementById('leave-letter').classList.add('hidden');
        }, 1000);
    });
}

// Print Report Listener
const printBtn = document.getElementById('print-report');
if (printBtn) {
    printBtn.addEventListener('click', () => {
        const select = document.getElementById('print-section-select');
        const sectionId = select ? select.value : 'all';
        
        let style = document.getElementById('dynamic-print-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'dynamic-print-style';
            document.head.appendChild(style);
        }
        
        if (sectionId === 'all') {
            style.innerHTML = '';
        } else {
            style.innerHTML = `
                @media print {
                    .report-section:not(#${sectionId}) {
                        display: none !important;
                    }
                }
            `;
        }
        
        document.body.classList.add('printing-report');
        window.print();
        setTimeout(() => document.body.classList.remove('printing-report'), 1000);
    });
}

// End of Day Distribution
const btnEodDistribute = document.getElementById('btn-eod-distribute');
if (btnEodDistribute) {
    btnEodDistribute.addEventListener('click', () => {
        if (pendingAudit !== null) {
            showToast('An audit cycle is already in progress. Wait for it to complete.');
            return;
        }

        // Penalty: If a staff checked in but didn't check out, mark them Absent
        staffList.forEach(s => {
            let attData = dailyAttendance[s.id];
            if (typeof attData === 'string') {
                attData = { status: attData, checkIn: null, checkOut: null, hours: null };
            }
            if (attData && attData.status === 'Checked In' && !attData.checkOut) {
                attData.status = 'Absent';
                dailyAttendance[s.id] = attData;
                const todayStr = new Date().toISOString().split('T')[0];
                if (!attendanceHistory[todayStr]) attendanceHistory[todayStr] = {};
                attendanceHistory[todayStr][s.id] = attData;
            }
        });
        saveData();
        
        const adminWithdrawn = adminWallet.balance;
        
        // Generate Pending Audit Data - State 1
        pendingAudit = {
            status: 'PENDING_DELIVERY_COUNTS',
            date: new Date().toLocaleString(),
            isoDate: new Date().toISOString(),
            staffPayouts: [],
            totalTechDistributed: 0,
            totalDelDistributed: 0,
            adminWithdrawn: adminWithdrawn,
            totalAbsenteeRecovery: 0,
            techPool: adminWallet.pendingTech || 0,
            deliveryPool: adminWallet.pendingDelivery || 0
        };
        
        // Clear pools
        // Do not zero out adminWallet.balance, it acts as a persistent corporate fund
        adminWallet.pendingTech = 0;
        adminWallet.pendingDelivery = 0;
        
        saveData();
        refreshAdminData();
        
        showToast('EOD Distribution started! Auditor must verify delivery counts first.');
    });
}


// Auditor Save Daily Deliveries
window.saveDailyDeliveries = () => {
    if (!pendingAudit || pendingAudit.status !== 'PENDING_DELIVERY_COUNTS') {
        showToast('Not in Delivery Count Verification state.');
        return;
    }

    const inputs = document.querySelectorAll('.delivery-input');
    inputs.forEach(input => {
        const staffId = input.getAttribute('data-staffid');
        const val = parseInt(input.value);
        const finalVal = (!isNaN(val) && val >= 0) ? val : 0;
        
        dailyDeliveries[staffId] = finalVal;
        
        // Save permanently to attendance history for this specific audit date
        if (pendingAudit && pendingAudit.isoDate) {
            if (!attendanceHistory[pendingAudit.isoDate]) {
                attendanceHistory[pendingAudit.isoDate] = {};
            }
            if (!attendanceHistory[pendingAudit.isoDate][staffId]) {
                let currentAtt = dailyAttendance[staffId];
                let currentStatus = 'Absent';
                if (currentAtt && typeof currentAtt === 'object') currentStatus = currentAtt.status || 'Absent';
                else if (currentAtt) currentStatus = currentAtt;
                
                attendanceHistory[pendingAudit.isoDate][staffId] = { status: currentStatus };
            }
            attendanceHistory[pendingAudit.isoDate][staffId].deliveries = finalVal;
        }
    });
    
    // Move the EOD to the Finance Calculation Step
    pendingAudit.status = 'PENDING_FINANCE_CALCULATION';
    
    saveData();
    showToast('Daily deliveries verified! Sent to Finance Manager for Salary Calculation.');
    refreshAdminData();
};

// Render Auditor OTP Table explicitly for filtering
window.renderAuditorOtpTable = () => {
    const auditorOtpTbody = document.getElementById('auditor-otp-tbody');
    const auditorOtpFilter = document.getElementById('auditor-otp-shop-filter');
    if (!auditorOtpTbody || !auditorOtpFilter) return;

    const filterVal = auditorOtpFilter.value;
    let visibleLogs = otpLogs;
    if (filterVal !== 'All') {
        visibleLogs = otpLogs.filter(l => l.shopName === filterVal);
    }

    if (visibleLogs.length === 0) {
        auditorOtpTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 1rem; color: #94a3b8;">No OTP submissions found.</td></tr>';
    } else {
        auditorOtpTbody.innerHTML = [...visibleLogs].reverse().map(log => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 1rem; font-size: 0.85rem; color: #cbd5e1;">${log.timestamp}</td>
                <td style="padding: 1rem; font-weight: bold; color: #e2e8f0;">${log.shopName}</td>
                <td style="padding: 1rem;">${log.staffName} <br><small class="text-muted">(${log.staffId})</small></td>
                <td style="padding: 1rem; color: #10b981; font-family: monospace; font-size: 1.1rem; letter-spacing: 2px;">${log.otp}</td>
                <td style="padding: 1rem; font-weight: bold; color: #f59e0b;">₹${log.amount.toFixed(2)}</td>
            </tr>
        `).join('');
    }
};


// Finance Calculate Payouts
window.financeCalculatePayouts = () => {
    const delRate = parseFloat(document.getElementById('finance-per-order').value) || 0;
    const techRate = parseFloat(document.getElementById('finance-tech-rate').value) || 0;
    
    if (isNaN(delRate) || isNaN(techRate)) {
        showToast('Please enter valid rates.');
        return;
    }
    
    if (!pendingAudit || pendingAudit.status !== 'PENDING_FINANCE_CALCULATION') {
        showToast('Not in Finance Calculation state.');
        return;
    }
    
    let totalDelDistributed = 0;
    let totalAbsenteeRecovery = 0;
    
    const auditDate = pendingAudit.isoDate;
    const historyForDate = attendanceHistory[auditDate] || {};

    staffList.filter(s => s.role && s.role.includes('Delivery')).forEach(d => {
        let attData = historyForDate[d.id] || dailyAttendance[d.id];
        let status = attData && typeof attData === 'object' ? attData.status : (attData || 'Not Given Yet');
        
        let deliveriesCount = (attData && typeof attData === 'object' && attData.deliveries !== undefined) 
            ? attData.deliveries 
            : ((dailyDeliveries && dailyDeliveries[d.id]) || 0);
            
        let basePay = deliveriesCount * delRate;
        
        // For Delivery Staff, pay is strictly based on deliveries completed, regardless of attendance status.
        let amountToPay = basePay;
        let amountToRecover = 0;
        
        let assignedShops = shops.filter(s => Array.isArray(s.deliveryStaff) ? s.deliveryStaff.includes(d.id) : s.deliveryStaff === d.id).map(s => s.name).join(', ') || 'None';
        
        let loanEMI = 0;
        const activeLoan = loanApplications.find(l => l.staffId === d.id && l.status === 'Active' && l.instType === 'Daily');
        if (activeLoan && amountToPay > 0) {
            loanEMI = Math.min(activeLoan.installmentAmount, amountToPay);
        }
        
        pendingAudit.staffPayouts.push({
            loanEMI: loanEMI,
            staffId: d.id,
            name: d.name,
            role: 'Delivery',
            status: status,
            deliveries: deliveriesCount,
            assignedShops: assignedShops,
            amountToPay: amountToPay,
            amountToRecover: amountToRecover,
            txSource: `Per-Order Salary: ${deliveriesCount} orders @ ₹${delRate}`
        });
        
        totalDelDistributed += amountToPay;
        totalAbsenteeRecovery += amountToRecover;
    });
    
    let totalTechDistributed = 0;
    const allTech = staffList.filter(s => s.role && s.role.includes('Technical'));
    if (allTech.length > 0) {
        const individualCut = techRate; // Use manual input
        allTech.forEach(t => {
            let attData = historyForDate[t.id] || dailyAttendance[t.id];
            let status = attData && typeof attData === 'object' ? attData.status : (attData || 'Not Given Yet');
            let amountToPay = 0;
            let amountToRecover = 0;
            if (status === 'Half') {
                amountToPay = individualCut / 2;
                amountToRecover = individualCut / 2;
            } else if (status === 'Absent') {
                amountToRecover = individualCut;
            } else {
                // Treat Present, Checked In, Leave, Not Given Yet as full pay
                amountToPay = individualCut;
            }
            
            let assignedShops = shops.filter(s => {
                const techArr = Array.isArray(s.technicalStaff) ? s.technicalStaff : (s.technicalStaff ? [s.technicalStaff] : []);
                return techArr.includes(t.id);
            }).map(s => s.name).join(', ') || 'None';
            
            let loanEMI = 0;
            const activeLoan = loanApplications.find(l => l.staffId === t.id && l.status === 'Active' && l.instType === 'Daily');
            if (activeLoan && amountToPay > 0) {
                loanEMI = Math.min(activeLoan.installmentAmount, amountToPay);
            }
            
            pendingAudit.staffPayouts.push({
                loanEMI: loanEMI,
                staffId: t.id,
                name: t.name,
                role: 'Technical',
                status: status,
                assignedShops: assignedShops,
                amountToPay: amountToPay,
                amountToRecover: amountToRecover,
                txSource: `Global Tech Distribution (${status})`
            });
            totalTechDistributed += amountToPay;
            totalAbsenteeRecovery += amountToRecover;
        });
    }
    
    
    
    pendingAudit.totalTechDistributed = totalTechDistributed;
    pendingAudit.totalDelDistributed = totalDelDistributed;
    pendingAudit.totalAbsenteeRecovery = totalAbsenteeRecovery;
    
    pendingAudit.status = 'PENDING_MD_VERIFICATION';
    
    saveData();
    refreshAdminData();
    showToast('Calculations Complete! Sent to MD for Verification.');
};
// MD Set Bonus
window.setCeoBonus = (staffId) => {
    if (!pendingAudit || pendingAudit.status !== 'PENDING_MD_VERIFICATION') return;
    const payout = pendingAudit.staffPayouts.find(p => p.staffId === staffId);
    if (!payout) return;
    
    const amountStr = prompt(`Enter bonus amount for ${payout.name} (will be deducted from Agency Admin Account):`, payout.ceoBonus || 0);
    if (amountStr === null) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 0) {
        showToast('Invalid bonus amount');
        return;
    }
    
    payout.ceoBonus = amount;
    saveData();
    refreshAdminData();
    showToast(`Bonus of ₹${amount} applied to ${payout.name}`);
};

// Auditor Verify and Distribute

// --------// Setup OM, FM, MD e-Signatures
setTimeout(() => {
    // OM
    const omIn = document.getElementById('om-signature-input');
    const omPre = document.getElementById('om-signature-preview');
    if (omIn && omPre) {
        omIn.addEventListener('input', e => omPre.innerText = e.target.value);
        if (omSignature) { omIn.value = omSignature; omPre.innerText = omSignature; }
    }
    
    // FM
    const fmIn = document.getElementById('fm-signature-input');
    const fmPre = document.getElementById('fm-signature-preview');
    if (fmIn && fmPre) {
        fmIn.addEventListener('input', e => fmPre.innerText = e.target.value);
        if (fmSignature) { fmIn.value = fmSignature; fmPre.innerText = fmSignature; }
    }
    
    // MD
    const mdIn = document.getElementById('md-signature-input');
    const mdPre = document.getElementById('md-signature-preview');
    if (mdIn && mdPre) {
        mdIn.addEventListener('input', e => mdPre.innerText = e.target.value);
        if (mdSignature) { mdIn.value = mdSignature; mdPre.innerText = mdSignature; }
    }
}, 1000);

window.saveOMSignature = () => {
    const input = document.getElementById('om-signature-input');
    if (input && input.value.trim().length > 0) {
        omSignature = input.value.trim();
        saveData();
        showToast('Operations Manager e-Signature saved successfully');
    } else { showToast('Please type your name.'); }
};

window.saveFMSignature = () => {
    const input = document.getElementById('fm-signature-input');
    if (input && input.value.trim().length > 0) {
        fmSignature = input.value.trim();
        saveData();
        showToast('Finance Manager e-Signature saved successfully');
    } else { showToast('Please type your name.'); }
};

window.saveMDSignature = () => {
    const input = document.getElementById('md-signature-input');
    if (input && input.value.trim().length > 0) {
        mdSignature = input.value.trim();
        saveData();
        showToast('MD e-Signature saved successfully');
    } else { showToast('Please type your name.'); }
};

// Setup OM, FM, MD e-Signatures
setTimeout(() => {
    // OM
    const omIn = document.getElementById('om-signature-input');
    const omPre = document.getElementById('om-signature-preview');
    if (omIn && omPre) {
        omIn.addEventListener('input', e => omPre.innerText = e.target.value);
        if (omSignature) { omIn.value = omSignature; omPre.innerText = omSignature; }
    }
    
    // FM
    const fmIn = document.getElementById('fm-signature-input');
    const fmPre = document.getElementById('fm-signature-preview');
    if (fmIn && fmPre) {
        fmIn.addEventListener('input', e => fmPre.innerText = e.target.value);
        if (fmSignature) { fmIn.value = fmSignature; fmPre.innerText = fmSignature; }
    }
    
    // MD
    const mdIn = document.getElementById('md-signature-input');
    const mdPre = document.getElementById('md-signature-preview');
    if (mdIn && mdPre) {
        mdIn.addEventListener('input', e => mdPre.innerText = e.target.value);
        if (mdSignature) { mdIn.value = mdSignature; mdPre.innerText = mdSignature; }
    }
}, 1000);

window.saveOMSignature = () => {
    const input = document.getElementById('om-signature-input');
    if (input && input.value.trim().length > 0) {
        omSignature = input.value.trim();
        saveData();
        showToast('Operations Manager e-Signature saved successfully');
    } else { showToast('Please type your name.'); }
};

window.saveFMSignature = () => {
    const input = document.getElementById('fm-signature-input');
    if (input && input.value.trim().length > 0) {
        fmSignature = input.value.trim();
        saveData();
        showToast('Finance Manager e-Signature saved successfully');
    } else { showToast('Please type your name.'); }
};

window.saveMDSignature = () => {
    const input = document.getElementById('md-signature-input');
    if (input && input.value.trim().length > 0) {
        mdSignature = input.value.trim();
        saveData();
        showToast('MD e-Signature saved successfully');
    } else { showToast('Please type your name.'); }
};

// Setup Auditor e-Signature
setTimeout(() => {
    const input = document.getElementById('auditor-signature-input');
    const preview = document.getElementById('auditor-signature-preview');
    if (input && preview) {
        input.addEventListener('input', (e) => {
            preview.innerText = e.target.value;
        });
        
        // Restore if exists
        if (auditorSignature) {
            if (auditorSignature.startsWith('data:image')) {
                // Clear out old canvas signature
                auditorSignature = null;
            } else {
                input.value = auditorSignature;
                preview.innerText = auditorSignature;
            }
        }
    }
}, 1000);

window.saveAuditorSignature = () => {
    const input = document.getElementById('auditor-signature-input');
    if (input && input.value.trim().length > 0) {
        auditorSignature = input.value.trim();
        saveData();
        showToast('Auditor e-Signature saved successfully');
    } else {
        showToast('Please type your name to generate an e-signature.');
    }
};

let currentReportPayload = null;

window.verifyAndDistribute = () => {
    if (!pendingAudit || pendingAudit.status !== 'PENDING_AUDITOR_FINAL') return;
    
    if (!auditorSignature) {
        showToast('CRITICAL: You MUST go back and save your Auditor e-Signature in the panel before generating this report!', 'error');
        alert("Wait! You cannot generate a report without an e-Signature. Please type your name in the Auditor Digital e-Signature panel and click 'Save e-Signature' first.");
        return;
    }
    
    // Calculate Report Stats
    let totalBasic = 0;
    let totalBonus = 0;
    let totalDeductions = 0; // EMIs + Absentee
    let netPaid = 0;
    
    let delCount = 0;
    let delAmt = 0;
    let techCount = 0;
    let techAmt = 0;
    
    let attTotal = 0;
    let attPresent = 0;
    let attHalf = 0;
    let attAbsent = 0;
    let attLeave = 0;

    pendingAudit.staffPayouts.forEach(p => {
        const staff = staffList.find(s => s.id === p.staffId);
        if(!staff) return;
        
        let loanEMI = p.loanEMI || 0;
        // User requested: Deductions = EMIs paid by staff
        let deductions = loanEMI;
        
        let bonus = p.ceoBonus || 0;
        
        let staffBasicGet = p.amountToPay - loanEMI;
        // User requested: NET SALARY = Total Basic Salary + Total Bonus Amount
        let net = staffBasicGet + bonus;
        
        totalBasic += staffBasicGet;
        totalBonus += bonus;
        totalDeductions += deductions;
        netPaid += net;
        
        if(staff.role === 'Delivery' || staff.role === 'Delivery Boy') {
            delCount++;
            delAmt += net; // Base paying amount including bonus
        } else {
            techCount++;
            techAmt += net; // Base paying amount including bonus
        }
        
        attTotal++;
        let st = (p.status || '').toLowerCase();
        if(st.includes('present') || st.includes('checked')) attPresent++;
        else if(st.includes('half')) attHalf++;
        else if(st.includes('absent')) attAbsent++;
        else if(st.includes('leave')) attLeave++;
    });
    
    // Populate Modal
    const rptId = 'RPT-' + new Date().getTime().toString().slice(-6);
    document.getElementById('rpt-id').innerText = rptId;
    document.getElementById('rpt-date').innerText = pendingAudit.date;
    document.getElementById('rpt-submit-date').innerText = new Date().toLocaleDateString();
    
    document.getElementById('rpt-basic-salary').innerText = totalBasic.toFixed(2);
    document.getElementById('rpt-bonus').innerText = totalBonus.toFixed(2);
    document.getElementById('rpt-deductions').innerText = totalDeductions.toFixed(2);
    document.getElementById('rpt-net-salary').innerText = netPaid.toFixed(2);
    
    document.getElementById('rpt-att-total').innerText = attTotal;
    document.getElementById('rpt-att-present').innerText = attPresent;
    document.getElementById('rpt-att-half').innerText = attHalf;
    document.getElementById('rpt-att-absent').innerText = attAbsent;
    document.getElementById('rpt-att-leave').innerText = attLeave;
    
    document.getElementById('rpt-dept-del-count').innerText = delCount;
    document.getElementById('rpt-dept-del-amt').innerText = delAmt.toFixed(2);
    document.getElementById('rpt-dept-tech-count').innerText = techCount;
    document.getElementById('rpt-dept-tech-amt').innerText = techAmt.toFixed(2);
    document.getElementById('rpt-dept-grand').innerText = netPaid.toFixed(2);
    
    const sigTxt = document.getElementById('rpt-auditor-sig-text');
    const sigImg = document.getElementById('rpt-auditor-sig-img');
    sigTxt.style.display = 'none';
    sigImg.style.display = 'none';
    
    if (auditorSignature) {
        if (auditorSignature.startsWith('data:image')) {
            sigImg.src = auditorSignature;
            sigImg.style.display = 'block';
        } else {
            sigTxt.innerText = auditorSignature;
            sigTxt.style.display = 'block';
        }
    }
    
    const cImg = document.getElementById('rpt-ceo-sig-img');
    const cTxt = document.getElementById('rpt-ceo-sig-text');
    if (cImg) cImg.style.display = 'none';
    if (cTxt) cTxt.style.display = 'none';
    
    const mdTxt = document.getElementById('rpt-md-sig-text');
    const fmTxt = document.getElementById('rpt-fm-sig-text');
    const omTxt = document.getElementById('rpt-om-sig-text');
    
    if (mdTxt) mdTxt.style.display = 'none';
    if (fmTxt) fmTxt.style.display = 'none';
    if (omTxt) omTxt.style.display = 'none';
    
    // Automatically apply CEO signature
    let autoCeoSig = null;
    if (typeof ceoDigitalSignature !== 'undefined' && ceoDigitalSignature) {
        autoCeoSig = ceoDigitalSignature;
        if (autoCeoSig.startsWith('data:image')) {
            if (cImg) { cImg.src = autoCeoSig; cImg.style.display = 'block'; }
        } else {
            if (cTxt) { cTxt.innerText = autoCeoSig; cTxt.style.display = 'block'; }
        }
    }
    
    // Automatically apply MD, FM, OM signatures
    let autoMdSig = (typeof mdSignature !== 'undefined' && mdSignature) ? mdSignature : null;
    let autoFmSig = (typeof fmSignature !== 'undefined' && fmSignature) ? fmSignature : null;
    let autoOmSig = (typeof omSignature !== 'undefined' && omSignature) ? omSignature : null;
    
    if (autoMdSig && mdTxt) { mdTxt.innerText = autoMdSig; mdTxt.style.display = 'block'; }
    if (autoFmSig && fmTxt) { fmTxt.innerText = autoFmSig; fmTxt.style.display = 'block'; }
    if (autoOmSig && omTxt) { omTxt.innerText = autoOmSig; omTxt.style.display = 'block'; }
    
    currentReportPayload = {
        id: rptId,
        date: pendingAudit.date,
        isoDate: pendingAudit.isoDate,
        totalBasic, totalBonus, totalDeductions, netPaid,
        delCount, delAmt, techCount, techAmt,
        attTotal, attPresent, attHalf, attAbsent, attLeave,
        auditorSignature: auditorSignature,
        ceoSignature: autoCeoSig,
        mdSignature: autoMdSig,
        fmSignature: autoFmSig,
        omSignature: autoOmSig
    };

    // Show submit button, hide print/delete
    const btn = document.getElementById('finalize-report-btn');
    if (btn) btn.style.display = 'inline-block';
    document.getElementById('print-auditor-report-btn').style.display = 'none';
    document.getElementById('delete-auditor-report-btn').style.display = 'none';

    document.getElementById('auditor-report-modal').style.display = 'block';
};

window.submitDailySalaryReport = () => {
    if (!currentReportPayload) return;
    
    const methodChecked = document.querySelector('input[name="rpt-pay-method"]:checked');
    const verifyChecked = document.querySelector('input[name="rpt-verify-status"]:checked');
    const auditorName = document.getElementById('rpt-auditor-name').value.trim();
    
    if (!methodChecked) {
        showToast("Please select a Payment Method.");
        return;
    }
    if (!verifyChecked) {
        showToast("Please select a Verification Status.");
        return;
    }
    if (!auditorName) {
        showToast("Please enter Auditor Name.");
        return;
    }
    
    let payMethod = methodChecked.value;
    if (payMethod === 'Other') {
        payMethod = document.getElementById('rpt-pay-other').value.trim() || 'Other';
    }
    
    currentReportPayload.paymentMethod = payMethod;
    currentReportPayload.auditorName = auditorName;
    currentReportPayload.verificationStatus = verifyChecked.value;
    currentReportPayload.remarks = [
        document.getElementById('rpt-remarks-1').value.trim(),
        document.getElementById('rpt-remarks-2').value.trim(),
        document.getElementById('rpt-remarks-3').value.trim()
    ].filter(Boolean).join(' | ');
    
    // Attach signature
    currentReportPayload.auditorSignature = auditorSignature;
    
    // Add to reports list
    dailySalaryReports.push(currentReportPayload);
    
    // Distribute
    executeFinalDistribution();
    
    document.getElementById('auditor-report-modal').style.display = 'none';
    showToast("Report Finalized and Saved!");
    currentReportPayload = null;
};

// --------------------------------------------------------------

window.executeFinalDistribution = () => {
    if (!pendingAudit || pendingAudit.status !== 'PENDING_AUDITOR_FINAL') return;

    // Distribute to individual staff
    pendingAudit.staffPayouts.forEach(payout => {
        const staff = staffList.find(s => s.id === payout.staffId);
        if (staff) {
            const grossAmount = payout.amountToPay; // Full amount approved by MD

            // --- Loan EMI Deduction (Pre-calculated in Finance Phase) ---
            let loanDeducted = payout.loanEMI || 0;
            const activeLoan = loanApplications.find(
                l => l.staffId === payout.staffId && l.status === 'Active' && l.instType === 'Daily'
            );
            if (activeLoan && loanDeducted > 0) {
                activeLoan.paidAmount = (activeLoan.paidAmount || 0) + loanDeducted;
                activeLoan.installmentsPaid = (activeLoan.installmentsPaid || 0) + 1;
                if (activeLoan.paidAmount >= activeLoan.approvedAmount) {
                    activeLoan.status = 'Completed';
                    activeLoan.paidAmount = activeLoan.approvedAmount;
                }
            }

            const bonusAmount = payout.ceoBonus || 0;
            const amountToCredit = grossAmount - loanDeducted + bonusAmount; // Net remaining + bonus → goes to wallet

            staff.earnings = (staff.earnings || 0) + amountToCredit;
            if (!staff.transactions) staff.transactions = [];

            let txDesc = payout.txSource;
            if (bonusAmount > 0) txDesc += ` + Bonus: ₹${bonusAmount.toFixed(2)}`;
            if (loanDeducted > 0) txDesc += ` (Gross: ₹${(grossAmount + bonusAmount).toFixed(2)}, EMI Deducted: -₹${loanDeducted.toFixed(2)})`;
            
            // Single net earning receipt
            staff.transactions.push({
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                source: txDesc,
                amount: amountToCredit
            });

            if (loanDeducted > 0) {
                emiCreditsHistory.push({
                    date: pendingAudit.date,
                    isoDate: pendingAudit.isoDate,
                    staffId: payout.staffId,
                    name: payout.name,
                    amount: loanDeducted
                });
            }

            // Log absentee deduction for CEO refunding
            if (payout.amountToRecover > 0) {
                absenteeDeductions.push({
                    id: generateId('DED-'),
                    staffId: payout.staffId,
                    name: payout.name,
                    date: new Date().toLocaleDateString(),
                    status: payout.status,
                    amount: payout.amountToRecover,
                    refunded: false
                });
                
                adminWallet.balance -= payout.amountToRecover;
                adminWallet.absenteeReserve = (adminWallet.absenteeReserve || 0) + payout.amountToRecover;
            }
        }
    });

    // Add Recovered Loan EMI to Admin Wallet
    const totalLoanRecovered = pendingAudit.staffPayouts.reduce((sum, p) => sum + (p.loanEMI || 0), 0);
    adminWallet.balance += totalLoanRecovered;

    const totalCeoBonus = pendingAudit.staffPayouts.reduce((sum, p) => sum + (p.ceoBonus || 0), 0);

    // DEDUCT Total salaries + CEO bonuses from Admin Wallet
    const totalPayouts = pendingAudit.totalTechDistributed + pendingAudit.totalDelDistributed + totalCeoBonus;
    adminWallet.balance -= totalPayouts;


    // Log the EOD Master Record
    eodDistributions.push({
        date: pendingAudit.date,
        isoDate: pendingAudit.isoDate,
        totalAmount: pendingAudit.totalTechDistributed + pendingAudit.totalDelDistributed + totalCeoBonus,
        techAmount: pendingAudit.totalTechDistributed,
        deliveryAmount: pendingAudit.totalDelDistributed,
        adminWithdrawn: pendingAudit.adminWithdrawn,
        absenteeRecovery: pendingAudit.totalAbsenteeRecovery,
        ceoBonusesAllocated: totalCeoBonus
    });

    // Clear Pending Audit
    pendingAudit = null;
    
    saveData();
    refreshAdminData();
    
    showToast('Audit Verified! Salaries successfully distributed to all staff accounts.');
};

// CEO Corporate Payroll function
window.payManagerSalary = (managerId) => {
    const manager = staffList.find(s => s.id === managerId);
    if (!manager) return;
    
    const salary = manager.monthlySalary || 0;
    if (salary <= 0) {
        showToast('This manager has no monthly salary configured.');
        return;
    }
    
    // Calculate current month earnings
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let currentMonthEarnings = 0;
    payments.forEach(p => {
        const pDate = new Date(p.isoDate);
        if(pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
            currentMonthEarnings += p.adminCut;
        }
    });
    
    ceoSalariesPaid.forEach(s => {
        const sDate = new Date(s.isoDate);
        if(sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear) {
            currentMonthEarnings -= s.amount;
        }
    });
    
    if (currentMonthEarnings < salary) {
        showToast('Insufficient Monthly Earnings Account balance to pay this salary!');
        return;
    }
    
    let amountToCredit = salary;
    let loanDeducted = 0;
    if (typeof processLoanDeductions === 'function') {
        loanDeducted = processLoanDeductions(manager.id, amountToCredit, true);
        amountToCredit -= loanDeducted;
    }

    // Log the salary payment (full amount is deducted from agency funds)
    ceoSalariesPaid.push({
        isoDate: new Date().toISOString(),
        managerId: manager.id,
        amount: salary
    });
    
    // Deduct from Admin Wallet
    adminWallet.balance -= salary;
    
    // Pay manager
    manager.earnings += amountToCredit;
    if (!manager.transactions) manager.transactions = [];
    manager.transactions.push({
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        source: 'CEO Monthly Salary Distribution',
        amount: salary
    });

    if (loanDeducted > 0) {
        manager.transactions.push({
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            source: 'Loan Repayment Auto-Deduction',
            amount: -loanDeducted
        });
    }
    
    saveData();
    refreshAdminData();
    showToast(`Paid ₹${salary.toFixed(2)} monthly salary to ${manager.name} from Monthly Earnings Account.`);
};

// Fire Employee Logic
window.fireEmployee = (staffId) => {
    if (!confirm('Are you sure you want to completely remove (fire) this employee? This action cannot be undone.')) return;
    
    // Remove from staffList
    const staffIndex = staffList.findIndex(s => s.id === staffId);
    if (staffIndex === -1) return;
    
    const firedName = staffList[staffIndex].name;
    staffList.splice(staffIndex, 1);
    
    // Clean up shop assignments
    shops.forEach(shop => {
        if (Array.isArray(shop.deliveryStaff)) {
            shop.deliveryStaff = shop.deliveryStaff.filter(id => id !== staffId);
        } else if (shop.deliveryStaff === staffId) {
            shop.deliveryStaff = null;
        }
        
        if (Array.isArray(shop.technicalStaff)) {
            shop.technicalStaff = shop.technicalStaff.filter(id => id !== staffId);
        } else if (shop.technicalStaff === staffId) {
            shop.technicalStaff = null;
        }
    });
    
    saveData();
    refreshAdminData();
    showToast(`${firedName} has been officially fired and removed from the agency.`);
};

// Staff Report Buttons
const staffPrintBtn = document.getElementById('staff-print-report');
if (staffPrintBtn) {
    staffPrintBtn.addEventListener('click', () => {
        document.body.classList.add('staff-printing');
        window.print();
        setTimeout(() => document.body.classList.remove('staff-printing'), 1000);
    });
}

const staffClearBtn = document.getElementById('staff-clear-report');
if (staffClearBtn) {
    staffClearBtn.addEventListener('click', () => {
        if(confirm('Are you sure you want to delete your earning report history? This cannot be undone.')) {
            currentUser.transactions = [];
            const idx = staffList.findIndex(s => s.id === currentUser.id);
            if(idx > -1) staffList[idx] = currentUser;
            saveData();
            refreshStaffData();
            showToast('Earning report deleted.');
        }
    });
}

// Factory Reset
const factoryResetBtn = document.getElementById('factory-reset-btn');
if (factoryResetBtn) {
    factoryResetBtn.addEventListener('click', () => {
        const confirm1 = confirm('WARNING: Are you absolutely sure you want to delete ALL data? This includes all staff, shops, and financial records.');
        if (confirm1) {
            const confirm2 = confirm('This action CANNOT be undone. Click OK to permanently wipe the local database.');
            if (confirm2) {
                localStorage.clear();
                showToast('All data cleared. Reloading application...');
                setTimeout(() => window.location.reload(), 1500);
            }
        }
    });
}

// Date Filter Listener
const reportDateFilter = document.getElementById('report-date-filter');
if (reportDateFilter) {
    if(!reportDateFilter.value) {
        const today = new Date();
        const ds = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        reportDateFilter.value = ds;
    }
    reportDateFilter.addEventListener('change', refreshAdminData);
}

// Clear Day Data
const clearDayBtn = document.getElementById('clear-day-data');
if (clearDayBtn) {
    clearDayBtn.addEventListener('click', () => {
        const filterDate = document.getElementById('report-date-filter').value;
        if(!filterDate) {
            showToast('Please select a date first!');
            return;
        }
        
        if(confirm(`Are you sure you want to delete all financial records for ${filterDate}? This will remove payments, distributions, and reset staff earnings for this date. Staff and Shops will NOT be deleted.`)) {
            const isSameDate = (item) => {
                if(!filterDate) return true;
                if(item.isoDate) return item.isoDate.startsWith(filterDate);
                const dateString = item.date;
                if(!dateString) return false;
                const d = new Date(dateString);
                const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if(ds === filterDate) return true;
                const parts = dateString.split(',')[0].split('/');
                if(parts.length === 3) {
                    const altDs = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    if(altDs === filterDate) return true;
                }
                return false;
            };

            // Remove payments
            payments = payments.filter(p => !isSameDate(p));
            // Remove eod
            eodDistributions = eodDistributions.filter(p => !isSameDate(p));
            
            // Fix Staff transactions and earnings
            staffList.forEach(s => {
                if(s.transactions) {
                    const toDelete = s.transactions.filter(tx => isSameDate(tx));
                    const deduction = toDelete.reduce((acc, tx) => acc + tx.amount, 0);
                    s.earnings -= deduction;
                    s.transactions = s.transactions.filter(tx => !isSameDate(tx));
                }
                if(s.pendingTransactions) {
                    s.pendingTransactions = s.pendingTransactions.filter(tx => !isSameDate(tx));
                }
            });
            
            saveData();
            refreshAdminData();
            showToast('Financial data for selected date has been cleared.');
        }
    });
}

// Staff Search and Quick Assign
window.searchStaff = () => {
    const id = document.getElementById('search-staff-id').value.trim();
    if(!id) return;
    const staff = staffList.find(s => s.id === id);
    const resultDiv = document.getElementById('staff-search-result');
    if(!staff) {
        resultDiv.innerHTML = `<p style="color: #ef4444; margin: 0;">No staff found with ID: ${id}</p>`;
        resultDiv.classList.remove('hidden');
        return;
    }
    
    // Find assignments
    const assignedShops = shops.filter(shop => {
        if (staff.role === 'Delivery') return shop.deliveryStaff && shop.deliveryStaff.includes(staff.id);
        if (staff.role === 'Technical') {
            const t = Array.isArray(shop.technicalStaff) ? shop.technicalStaff : (shop.technicalStaff ? [shop.technicalStaff] : []);
            return t.includes(staff.id);
        }
        return false;
    }).map(s => s.name);
    
    resultDiv.innerHTML = `
        <h4 style="margin-top: 0;">Staff Profile: ${staff.name}</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div><strong>ID:</strong> <span style="color: var(--secondary);">${staff.id}</span></div>
            <div><strong>Role:</strong> <span class="badge ${staff.role === 'Technical' ? 'technical' : ''}">${staff.role}</span></div>
            <div><strong>Password:</strong> ${staff.password}</div>
            <div><strong>UPI:</strong> ${staff.upi}</div>
            <div><strong>Total Earnings:</strong> <span style="color: #10b981;">₹${(staff.earnings||0).toFixed(2)}</span></div>
            <div style="grid-column: span 2;"><strong>Current Assignments:</strong> ${assignedShops.length > 0 ? assignedShops.join(', ') : 'None'}</div>
        </div>
        <div class="mt-4" style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
            <strong>Quick Assign to Shop:</strong>
            <div style="display: flex; gap: 1rem; margin-top: 0.5rem; flex-wrap: wrap;">
                <select id="quick-assign-shop" class="input-group" style="padding: 0.5rem; flex: 1;">
                    <option value="">-- Select Shop --</option>
                    ${shops.map((s, idx) => `<option value="${idx}">${s.name}</option>`).join('')}
                </select>
                <button class="btn btn-primary" onclick="quickAssign('${staff.id}')">Start Assignment</button>
            </div>
        </div>
    `;
    resultDiv.classList.remove('hidden');
};

window.quickAssign = (staffId) => {
    const shopIdx = document.getElementById('quick-assign-shop').value;
    if(shopIdx === "") return showToast("Select a shop first");
    
    const staff = staffList.find(s => s.id === staffId);
    if(!staff) return;
    
    const shop = shops[shopIdx];
    
    if(staff.role === 'Delivery') {
        const requiredDel = shop.reqDelivery || 1;
        if(!shop.deliveryStaff) shop.deliveryStaff = [];
        if(shop.deliveryStaff.includes(staff.id)) return showToast(`${staff.name} is already assigned to ${shop.name}.`);
        
        if(shop.deliveryStaff.length >= requiredDel) {
            showToast(`Invalid: Shop already has maximum (${requiredDel}) Delivery staff! Opening Edit mode...`);
            return window.editAssignment(shopIdx);
        }
        shop.deliveryStaff.push(staff.id);
    } else {
        const requiredTech = shop.reqTech !== undefined ? shop.reqTech : 1;
        if(!shop.technicalStaff) shop.technicalStaff = [];
        if(!Array.isArray(shop.technicalStaff)) shop.technicalStaff = [shop.technicalStaff];
        if(shop.technicalStaff.includes(staff.id)) return showToast(`${staff.name} is already assigned to ${shop.name}.`);
        
        if(shop.technicalStaff.length >= requiredTech) {
            showToast(`Invalid: Shop already has maximum (${requiredTech}) Technical staff! Opening Edit mode...`);
            return window.editAssignment(shopIdx);
        }
        shop.technicalStaff.push(staff.id);
    }
    
    saveData();
    refreshAdminData();
    searchStaff(); // refresh the profile view
    showToast(`Successfully assigned ${staff.name} to ${shop.name}!`);
};

// Remove single staff from shop
window.removeStaffFromShop = (shopIdx, staffId, role) => {
    if(confirm('Are you sure you want to remove this staff member from this shop?')) {
        const shop = shops[shopIdx];
        if(role === 'Delivery' && shop.deliveryStaff) {
            shop.deliveryStaff = shop.deliveryStaff.filter(id => id !== staffId);
        } else if (role === 'Technical') {
            let techArr = Array.isArray(shop.technicalStaff) ? shop.technicalStaff : (shop.technicalStaff ? [shop.technicalStaff] : []);
            techArr = techArr.filter(id => id !== staffId);
            shop.technicalStaff = techArr;
        }
        saveData();
        refreshAdminData();
        if(typeof searchStaff === 'function') searchStaff(); // Refresh search widget just in case
        showToast(`Staff removed from ${shop.name}`);
    }
};

// Global function to print specific sections
window.printSection = (sectionId) => {
    let style = document.getElementById('dynamic-print-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'dynamic-print-style';
        document.head.appendChild(style);
    }
    style.innerHTML = `
        @media print {
            body.dynamic-printing * {
                visibility: hidden !important;
            }
            body.dynamic-printing #${sectionId}, 
            body.dynamic-printing #${sectionId} * {
                visibility: visible !important;
            }
            body.dynamic-printing #${sectionId} {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
            }
            body.dynamic-printing .print-hide,
            body.dynamic-printing .print-hide * {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            body.dynamic-printing .print-only {
                display: block !important;
                visibility: visible !important;
            }
        }
    `;
    
    document.body.classList.add('dynamic-printing');
    window.print();
    setTimeout(() => document.body.classList.remove('dynamic-printing'), 1000);
};

// Initialize Application
const initApp = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewBondId = urlParams.get('viewBond');
    if (viewBondId) {
        setTimeout(() => {
            if (typeof openBondView === 'function') {
                openBondView(viewBondId, 'view');
            }
        }, 500);
    }

    // Initialize Signatures
    window.rehydrateSignatures = () => {
        if (ceoDigitalSignature) {
            const sigInput = document.getElementById('ceo-signature-input');
            const sigPreview = document.getElementById('ceo-signature-preview');
            if (sigInput) sigInput.value = ceoDigitalSignature;
            if (sigPreview) sigPreview.textContent = ceoDigitalSignature;
        }
        
        if (omSignature) {
            const inOM = document.getElementById('om-signature-input');
            const preOM = document.getElementById('om-signature-preview');
            if (inOM) inOM.value = omSignature;
            if (preOM) preOM.textContent = omSignature;
        }
        
        if (fmSignature) {
            const inFM = document.getElementById('fm-signature-input');
            const preFM = document.getElementById('fm-signature-preview');
            if (inFM) inFM.value = fmSignature;
            if (preFM) preFM.textContent = fmSignature;
        }
        
        if (mdSignature) {
            const inMD = document.getElementById('md-signature-input');
            const preMD = document.getElementById('md-signature-preview');
            if (inMD) inMD.value = mdSignature;
            if (preMD) preMD.textContent = mdSignature;
        }
        
        if (auditorSignature) {
            const inAud = document.getElementById('auditor-signature-input');
            const preAud = document.getElementById('auditor-signature-preview');
            if (inAud) inAud.value = auditorSignature;
            if (preAud) preAud.textContent = auditorSignature;
        }
    };
    
    window.rehydrateSignatures();

    const savedSession = sessionStorage.getItem('aura_session');
    if (savedSession) {
        try {
            currentUser = JSON.parse(savedSession);
            // Re-sync from live staffList to get latest earnings, loan data, etc.
            const freshUser = staffList.find(s => s.id === currentUser.id);
            if (freshUser) {
                let mappedRole = currentUser.role;
                if (['Managing Director (MD)', 'Finance Manager', 'Operations Manager', 'Auditor'].includes(freshUser.role)) {
                    if (freshUser.role === 'Managing Director (MD)') mappedRole = 'md';
                    if (freshUser.role === 'Finance Manager') mappedRole = 'finance';
                    if (freshUser.role === 'Operations Manager') mappedRole = 'operations';
                    if (freshUser.role === 'Auditor') mappedRole = 'auditor';
                }

                const isAdmin = currentUser.isAdmin;
                const originalRole = currentUser.originalRole;
                currentUser = { ...freshUser, role: mappedRole, isAdmin, originalRole };
                sessionStorage.setItem('aura_session', JSON.stringify(currentUser));
            }
            if (currentUser.isAdmin) {
                showScreen('admin');
            } else {
                showScreen('staff');
            }
        } catch(e) {
            showScreen('auth');
        }
    } else {
        showScreen('auth');
    }
};

// CEO Wallet Controls
window.refundStaffSalary = (deductionId) => {
    const deduction = absenteeDeductions.find(d => d.id === deductionId);
    if (!deduction || deduction.refunded) return;
    
    if ((adminWallet.balance || 0) < deduction.amount) {
        showToast('Insufficient funds in Agency Admin Account to cover this refund!');
        return;
    }
    
    const staff = staffList.find(s => s.id === deduction.staffId);
    if (!staff) {
        showToast('Cannot refund! This staff member no longer exists in the agency.');
        return;
    }
    
    // Process Refund
    adminWallet.absenteeReserve = (adminWallet.absenteeReserve || 0) - deduction.amount;
    if (adminWallet.absenteeReserve < 0) adminWallet.absenteeReserve = 0;
    
    adminWallet.balance -= deduction.amount;
    staff.earnings = (staff.earnings || 0) + deduction.amount;
    
    if (!staff.transactions) staff.transactions = [];
    staff.transactions.push({
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        source: `CEO Refund (Absentee Recovery)`,
        amount: deduction.amount
    });
    
    deduction.refunded = true;
    
    saveData();
    refreshAdminData();
    showToast(`Successfully refunded ₹${deduction.amount.toFixed(2)} to ${staff.name}.`);
};

window.transferAbsenteeToAdminWallet = () => {
    const amount = adminWallet.absenteeReserve || 0;
    if (amount <= 0) {
        showToast('Absentee Deductions Wallet is currently empty.');
        return;
    }
    
    if (!confirm(`Are you sure you want to permanently transfer ₹${amount.toFixed(2)} to the Main Agency Admin Account?`)) return;
    
    adminWallet.balance = (adminWallet.balance || 0) + amount;
    adminWallet.absenteeReserve = 0;
    
    absenteeDeductions.forEach(d => {
        if (!d.refunded && !d.dismissed) {
            d.dismissed = true;
        }
    });
    
    saveData();
    refreshAdminData();
    showToast(`Successfully transferred ₹${amount.toFixed(2)} into the Main Agency Admin Account.`);
};

window.editManagerSalary = (managerId) => {
    const manager = staffList.find(s => s.id === managerId);
    if (!manager) return;
    
    const newSalaryInput = prompt(`Enter new monthly salary for ${manager.name} (${manager.role}):`, manager.monthlySalary || 0);
    if (newSalaryInput === null) return; // Cancelled
    
    const newSalary = parseFloat(newSalaryInput);
    if (isNaN(newSalary) || newSalary < 0) {
        showToast('Invalid salary amount entered.');
        return;
    }
    
    manager.monthlySalary = newSalary;
    saveData();
    refreshAdminData();
    showToast(`Successfully updated monthly salary to ₹${newSalary.toFixed(2)}.`);
};
window.deleteAbsenteeRecord = (deductionId) => {
    if (!confirm('Are you sure you want to dismiss this refund? The money will be transferred to the Main Agency Admin Account.')) return;
    
    const index = absenteeDeductions.findIndex(d => d.id === deductionId);
    if (index !== -1) {
        const deduction = absenteeDeductions[index];
        if (deduction.refunded || deduction.dismissed) return;
        
        // Transfer the money to Main Agency Admin Account
        adminWallet.absenteeReserve = (adminWallet.absenteeReserve || 0) - deduction.amount;
        if (adminWallet.absenteeReserve < 0) adminWallet.absenteeReserve = 0;
        adminWallet.balance = (adminWallet.balance || 0) + deduction.amount;
        
        deduction.dismissed = true;
        
        saveData();
        refreshAdminData();
        showToast(`Dismissed. ₹${deduction.amount.toFixed(2)} transferred to Main Agency Admin Account.`);
    }
};



window.updateCeoThreshold = () => {
    const val = parseFloat(document.getElementById('ceo-lowpay-input').value);
    if (!isNaN(val) && val >= 0) {
        ceoLowPayThreshold = val;
        saveData();
        refreshAdminData();
        showToast('Low pay threshold updated!');
    }
};

// Note: initApp() is now called inside the socket.on('initialState') event at the top of the file.


// --- LOAN MANAGEMENT LOGIC & CIVIL SCORE ---

window.openModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
};

window.closeModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
};

window.updateCibilCutoff = () => {
    const input = document.getElementById('ceo-cibil-cutoff-input');
    if (!input) return;
    const val = parseInt(input.value);
    if (!isNaN(val) && val >= 0) {
        cibilLoanCutoff = val;
        saveData();
        showToast('CIBIL loan cutoff updated successfully!');
    }
};

window.calculateAgencyCibil = (staffId) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return 0;

    const isManager = staff.id.startsWith('MGR-') || ['Managing Director (MD)', 'Finance Manager', 'Operations Manager', 'Auditor', 'Webcam Staff'].includes(staff.role);
    if (isManager) return null;

    let score = 0; // Base starting score for both Delivery and Tech
    const role = staff.role;
    
    // Attendance Stats
    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;
    
    // Check attendance history
    for (const date in attendanceHistory) {
        if (attendanceHistory[date] && attendanceHistory[date][staffId]) {
            let attVal = attendanceHistory[date][staffId];
            const status = attVal && typeof attVal === 'object' ? attVal.status : attVal;
            
            if (status === 'Present') presentCount++;
            else if (status === 'Absent') absentCount++;
            else if (status === 'Half Day' || status === 'Half') halfDayCount++;
        }
    }
    
    // Check leave requests for approved leaves to accurately count leaves
    leaveRequests.forEach(lr => {
        if (lr.staffId === staffId && lr.status === 'Approved') {
            leaveCount += parseInt(lr.totalDays) || 0;
        }
    });

    if (role === 'Delivery') {
        // Delivery Staff Logic
        let totalDeliveries = otpLogs.filter(l => l.staffId === staffId).length;
        
        // Include any manual auditor overrides
        for (const date in attendanceHistory) {
            if (attendanceHistory[date] && attendanceHistory[date][staffId] && attendanceHistory[date][staffId].deliveries) {
                // If there's an override, we might just trust it. For simplicity, we just use otpLogs length + current dailyDeliveries if it's not yet in history.
                // Actually, the user asked: "when delivery staff complete a delivery +10 points added to the Agency CIBIL Score"
                // Using totalDeliveries is the most accurate.
            }
        }
        
        // Wait, to be perfectly accurate and encompass everything, total deliveries is either from otpLogs or dailyDeliveries.
        // Let's rely on otpLogs since it tracks all completions.
        
        score += (totalDeliveries * 10);
        score -= (leaveCount * 1);
        score -= (halfDayCount * 5);
        score -= (absentCount * 10);

    } else {
        // Technical Staff Logic
        score += (presentCount * 50);
        score -= (halfDayCount * 5);
        score -= (leaveCount * 1);
        score -= (absentCount * 10);
    }
    
    // Normalize to 0-1000 (though user didn't explicitly ask for 1000 cap, it's standard CIBIL behavior)
    score = Math.max(0, Math.min(1000, Math.floor(score)));
    return score;
};

window.getCibilRange = (score) => {
    if (score === null || score === 'N/A') return { label: 'Manager / Exempt', color: '#8b5cf6', limit: 'Direct Approval' };
    if (score >= 850) return { label: 'Excellent', color: '#10b981', limit: 'High Eligibility' };
    if (score >= 600) return { label: 'Good', color: '#3b82f6', limit: 'Medium Eligibility' };
    if (score >= 150) return { label: 'Moderate', color: '#f59e0b', limit: 'Low Eligibility' };
    return { label: 'Poor', color: '#ef4444', limit: 'Not Eligible' };
};

// Application Submit
const loanAppForm = document.getElementById('loan-application-form');
if (loanAppForm) {
    loanAppForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Prevent multiple concurrent loans
        const existingLoan = loanApplications.find(l => l.staffId === currentUser.id && l.status !== 'Completed' && l.status !== 'Rejected');
        if (existingLoan) {
            showToast("You already have an active or pending loan. You can only apply for a new loan after the current one is completed.", "error");
            return;
        }

        const score = calculateAgencyCibil(currentUser.id);
        const isManager = currentUser.id.startsWith('MGR-') || ['Managing Director (MD)', 'Finance Manager', 'Operations Manager', 'Auditor', 'Webcam Staff'].includes(currentUser.role);
        
        if (!isManager && score < cibilLoanCutoff) {
            showToast(`Your Agency Civil Score is too low to apply for a loan (Requires ${cibilLoanCutoff}).`, "error");
            return;
        }

        const reqAmount = parseFloat(document.getElementById('loan-req-amount').value);
        const reqInstallments = parseInt(document.getElementById('loan-req-installments').value) || 1;
        const purpose = document.getElementById('loan-purpose').value;
        const instType = document.getElementById('loan-installment-type').value;
        const witnessName = document.getElementById('loan-witness-name').value;
        const witnessMobile = document.getElementById('loan-witness-mobile').value;
        
        const email = document.getElementById('loan-email') ? document.getElementById('loan-email').value : '';
        const witnessRelation = document.getElementById('loan-witness-relation') ? document.getElementById('loan-witness-relation').value : '';
        
        const newLoan = {
            id: 'LN-' + new Date().getFullYear() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
            staffId: currentUser.id,
            staffName: currentUser.name,
            staffRole: currentUser.role,
            email: email,
            reqAmount: reqAmount,
            reqInstallments: reqInstallments,
            purpose,
            instType,
            witnessName,
            witnessMobile,
            witnessRelation: witnessRelation,
            dateApplied: new Date().toISOString(),
            status: isManager ? 'Pending CEO' : 'Pending Finance Verification',
            civilScoreAtApply: score,
            approvedAmount: 0,
            installments: 0,
            installmentAmount: 0,
            deductionDate: null,
            paidAmount: 0,
            ac: currentUser.ac || '',
            ifsc: currentUser.ifsc || '',
            branch: currentUser.branch || ''
        };
        
        loanApplications.push(newLoan);
        saveData();
        if (isManager) {
            showToast("Loan application submitted directly to CEO.");
        } else {
            showToast("Loan application submitted successfully to Finance Manager.");
        }
        loanAppForm.reset();
        if (typeof renderStaffLoansHistory === 'function') renderStaffLoansHistory();
    });
}

window.renderStaffLoansHistory = () => {
    const list = document.getElementById('staff-loans-history');
    if (!list) return;
    
    const myLoans = loanApplications.filter(l => l.staffId === currentUser.id);
    if (myLoans.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 1rem;">No loan history found.</div>`;
        return;
    }
    
    myLoans.sort((a,b) => new Date(b.dateApplied) - new Date(a.dateApplied));
    
    list.innerHTML = myLoans.map(l => {
        let badgeColor = 'rgba(255,255,255,0.2)';
        if (l.status === 'Active') badgeColor = 'rgba(16, 185, 129, 0.2)';
        if (l.status === 'Completed') badgeColor = 'rgba(59, 130, 246, 0.2)';
        if (l.status === 'Rejected') badgeColor = 'rgba(239, 68, 68, 0.2)';
        if (l.status.includes('Pending')) badgeColor = 'rgba(245, 158, 11, 0.2)';

        // Repayment progress bar for active/completed loans
        let progressHtml = '';
        if ((l.status === 'Active' || l.status === 'Completed') && l.approvedAmount > 0) {
            const paidAmt = l.paidAmount || 0;
            const paidInst = l.installmentsPaid || 0;
            const totalInst = l.installments || 1;
            const remaining = Math.max(0, totalInst - paidInst);
            const pct = Math.min(100, Math.round((paidAmt / l.approvedAmount) * 100));
            progressHtml = `
                <div style="margin-top: 0.5rem; font-size: 0.78rem; color: #94a3b8;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                        <span>💰 Paid: ₹${paidAmt.toFixed(2)} (${paidInst}/${totalInst} EMIs)</span>
                        <span style="color: #f59e0b;">Remaining: ${remaining} EMIs</span>
                    </div>
                    <div style="background: rgba(0,0,0,0.3); border-radius: 4px; height: 5px;">
                        <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 4px;"></div>
                    </div>
                    <div style="text-align: right; font-size: 0.7rem; margin-top: 2px;">${pct}% repaid</div>
                </div>
            `;
        }

        return `
            <div class="list-item" style="cursor: pointer;" onclick="openLoanDetails('${l.id}', 'staff')">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #0ea5e9; text-decoration: underline;">${l.id}</strong><br>
                        <span style="font-size: 0.8rem; color: #94a3b8;">₹${l.reqAmount} requested ${l.approvedAmount ? '| ₹' + l.approvedAmount + ' approved' : ''}</span>
                    </div>
                    <span class="badge" style="background: ${badgeColor};">${l.status}</span>
                </div>
                ${progressHtml}
            </div>
        `;
    }).join('');
};

window.renderAdminLoans = () => {
    const list = document.getElementById('admin-loans-tbody');
    const genList = document.getElementById('admin-generated-loans-tbody');
    
    if (list) {
        const visibleLoans = loanApplications.filter(l => 
            !l.staffId.startsWith('MGR-') && !['Managing Director (MD)', 'Finance Manager', 'Operations Manager', 'Auditor', 'Webcam Staff'].includes(l.staffRole) &&
            (l.status === 'Pending Finance Verification' || l.status === 'Pending Bond Generation' || l.status === 'Pending Disbursement')
        );
        if (visibleLoans.length === 0) {
            list.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #94a3b8;">No pending loans for Finance.</td></tr>`;
        } else {
            list.innerHTML = visibleLoans.map(l => {
                let actionHtml = `<button class="btn btn-primary" onclick="openLoanDetails('${l.id}', 'finance')">Manage</button>`;
                return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <td style="padding: 1rem;"><strong style="color: #0ea5e9;">${l.id}</strong></td>
                        <td style="padding: 1rem;">
                            ${new Date(l.dateApplied).toLocaleDateString()}<br>
                            <strong>${l.staffName}</strong> (${l.staffRole})
                        </td>
                        <td style="padding: 1rem;"><span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fcd34d;">${l.status}</span></td>
                        <td style="padding: 1rem; text-align: right;">${actionHtml}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    if (genList) {
        const genLoans = loanApplications.filter(l => 
            !l.staffId.startsWith('MGR-') && !['Managing Director (MD)', 'Finance Manager', 'Operations Manager', 'Auditor', 'Webcam Staff'].includes(l.staffRole) &&
            (l.status === 'Active' || l.status === 'Completed' || l.status === 'Pending Staff Acceptance')
        );
        if (genLoans.length === 0) {
            genList.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 1rem; color: #94a3b8;">No generated loans.</td></tr>`;
        } else {
            genList.innerHTML = genLoans.map(l => {
                let actionHtml = `<button class="btn" style="background: transparent; border: 1px solid #10b981; color: #10b981; margin-right: 0.5rem;" onclick="openLoanDetails('${l.id}', 'finance')">View</button>`;
                actionHtml += `<button class="btn" style="background: #ef4444; border: 1px solid #ef4444; color: white;" onclick="deleteLoan('${l.id}')">Delete</button>`;
                return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <td style="padding: 1rem;"><strong style="color: #10b981;">${l.id}</strong> <span style="font-size: 0.8rem; margin-left: 0.5rem; color: #94a3b8;">(${l.status})</span></td>
                        <td style="padding: 1rem; text-align: right;">${actionHtml}</td>
                    </tr>
                `;
            }).join('');
        }
    }
};

window.renderCeoLoans = () => {
    const list = document.getElementById('ceo-loans-tbody');
    if (!list) return;
    
    const managerLoans = loanApplications.filter(l => 
        (l.staffId.startsWith('MGR-') || ['Managing Director (MD)', 'Finance Manager', 'Operations Manager', 'Auditor', 'Webcam Staff'].includes(l.staffRole)) &&
        l.status !== 'Completed' && l.status !== 'Rejected'
    );
    
    if (managerLoans.length === 0) {
        list.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1rem; color: #10b981;">No active Corporate Manager loan requests.</td></tr>`;
        return;
    }
    
    list.innerHTML = managerLoans.map(l => {
        let actionHtml = `<button class="btn btn-primary" style="background: #10b981; border-color: #10b981;" onclick="openLoanDetails('${l.id}', 'ceo')">Manage</button>`;
        return `
            <tr style="border-bottom: 1px solid rgba(16,185,129,0.1);">
                <td style="padding: 1rem;">${new Date(l.dateApplied).toLocaleDateString()}</td>
                <td style="padding: 1rem;"><strong>${l.staffName}</strong> (${l.staffRole})</td>
                <td style="padding: 1rem; color: #f59e0b; font-weight: bold;">₹${l.reqAmount}</td>
                <td style="padding: 1rem;">${l.reqInstallments} Installments (${l.instType})</td>
                <td style="padding: 1rem; text-align: right;">${actionHtml}</td>
            </tr>
        `;
    }).join('');
};

window.renderMDLoans = () => {
    const list = document.getElementById('md-loans-tbody');
    if (!list) return;
    
    const visibleLoans = loanApplications.filter(l => 
        !l.staffId.startsWith('MGR-') && !['Managing Director (MD)', 'Finance Manager', 'Operations Manager', 'Auditor', 'Webcam Staff'].includes(l.staffRole) &&
        l.status === 'Pending MD Approval'
    );
    if (visibleLoans.length === 0) {
        list.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1rem; color: #94a3b8;">No pending loans for MD verification.</td></tr>`;
        return;
    }
    
    list.innerHTML = visibleLoans.map(l => {
        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                <td style="padding: 1rem;">${new Date(l.dateApplied).toLocaleDateString()}</td>
                <td style="padding: 1rem;">
                    <strong>${l.staffName}</strong><br>
                    <span style="font-size: 0.8rem; color: #94a3b8;">${l.staffRole}</span>
                </td>
                <td style="padding: 1rem;">₹${l.approvedAmount}</td>
                <td style="padding: 1rem;">
                    ${l.installments} x ₹${l.installmentAmount}<br>
                    <span style="font-size: 0.8rem; color: #94a3b8;">${l.instType}</span>
                </td>
                <td style="padding: 1rem; text-align: right;">
                    <button class="btn btn-primary" onclick="mdApproveLoan('${l.id}')">Approve</button>
                    <button class="btn" style="background: #ef4444; border: none; color: white;" onclick="mdRejectLoan('${l.id}')">Reject</button>
                </td>
            </tr>
        `;
    }).join('');
};

let currentViewedLoanId = null;

window.openLoanDetails = (id, role) => {
    const loan = loanApplications.find(l => l.id === id);
    if (!loan) return;
    currentViewedLoanId = id;
    
    // Fetch staff info for extra details
    const staff = staffList.find(s => s.id === loan.staffId) || {};
    
    // Show loan details in modal
    // Staff Details
    document.getElementById('dtl-loan-name').textContent = loan.staffName;
    document.getElementById('dtl-loan-id').textContent = loan.id;
    document.getElementById('dtl-loan-designation').textContent = staff.designation || loan.staffRole;
    document.getElementById('dtl-loan-department').textContent = staff.department || 'General';
    document.getElementById('dtl-loan-mobile').textContent = staff.mobile || 'N/A';
    document.getElementById('dtl-loan-email').textContent = loan.email || 'N/A';

    // Loan Details
    document.getElementById('dtl-loan-req').textContent = '₹' + loan.reqAmount;
    document.getElementById('dtl-loan-purpose').textContent = loan.purpose || 'N/A';
    document.getElementById('dtl-loan-type').textContent = loan.instType;
    document.getElementById('dtl-loan-req-inst').textContent = loan.installments || loan.reqInstallments || 1;
    document.getElementById('dtl-loan-status').textContent = loan.status;
    document.getElementById('dtl-loan-approved-amt').textContent = loan.approvedAmount ? '₹' + loan.approvedAmount : 'Pending';
    
    // Bank Details
    document.getElementById('dtl-loan-bank-name').textContent = loan.staffName;
    document.getElementById('dtl-loan-bank-ac').textContent = loan.ac || staff.ac || 'N/A';
    document.getElementById('dtl-loan-bank-ifsc').textContent = loan.ifsc || staff.ifsc || 'N/A';
    document.getElementById('dtl-loan-bank-bankname').textContent = 'N/A'; // Not captured yet
    document.getElementById('dtl-loan-bank-branch').textContent = loan.branch || staff.branch || 'N/A';

    // Witness Details
    document.getElementById('dtl-loan-witness-name').textContent = loan.witnessName || 'N/A';
    document.getElementById('dtl-loan-witness-mobile').textContent = loan.witnessMobile || 'N/A';
    document.getElementById('dtl-loan-witness-relation').textContent = loan.witnessRelation || 'N/A';
    
    const cibilData = getCibilRange(loan.civilScoreAtApply || calculateAgencyCibil(loan.staffId));
    document.getElementById('dtl-loan-cibil-score').textContent = loan.civilScoreAtApply || calculateAgencyCibil(loan.staffId);
    document.getElementById('dtl-loan-cibil-score').style.color = cibilData.color;
    document.getElementById('dtl-loan-cibil-badge').textContent = cibilData.label;
    document.getElementById('dtl-loan-cibil-badge').style.background = cibilData.color;

    // Show repayment progress for active/completed loans
    const repaySection = document.getElementById('dtl-repayment-section');
    if ((loan.status === 'Active' || loan.status === 'Completed') && loan.approvedAmount > 0) {
        repaySection.style.display = 'block';
        const paidAmt = loan.paidAmount || 0;
        const paidInst = loan.installmentsPaid || 0;
        const totalInst = loan.installments || 1;
        const remaining = Math.max(0, totalInst - paidInst);
        const outstanding = Math.max(0, loan.approvedAmount - paidAmt);
        const pct = Math.min(100, Math.round((paidAmt / loan.approvedAmount) * 100));
        document.getElementById('dtl-inst-paid').textContent = paidInst + ' of ' + totalInst;
        document.getElementById('dtl-inst-remaining').textContent = remaining;
        document.getElementById('dtl-total-paid').textContent = '₹' + paidAmt.toFixed(2);
        document.getElementById('dtl-outstanding').textContent = '₹' + outstanding.toFixed(2);
        document.getElementById('dtl-repay-bar').style.width = pct + '%';
        document.getElementById('dtl-repay-pct').textContent = pct + '% repaid';
    } else {
        repaySection.style.display = 'none';
    }
    
    // Reset Action areas
    const staffAction = document.getElementById('dtl-action-staff');
    const financeAction = document.getElementById('dtl-action-finance');
    staffAction.style.display = 'none';
    financeAction.style.display = 'none';
    
    if (role === 'staff') {
        if (loan.status === 'Pending Staff Acceptance') {
            staffAction.style.display = 'flex';
            staffAction.style.gap = '1rem';
            staffAction.innerHTML = `
                <button class="btn btn-primary" style="flex: 1;" onclick="openBondView('${loan.id}', 'staff'); closeModal('modal-loan-details')">Review & Sign</button>
                <button class="btn btn-danger" style="flex: 1; background: #ef4444; border: none; color: white;" onclick="rejectLoanTerms('${loan.id}')">Reject Terms</button>
            `;
        } else if (loan.status === 'Active' || loan.status === 'Completed' || loan.status === 'Pending Disbursement') {
            staffAction.style.display = 'block';
            staffAction.innerHTML = `<button class="btn btn-secondary" style="width: 100%;" onclick="openBondView('${loan.id}', 'view'); closeModal('modal-loan-details')">View Signed Agreement</button>`;
        }
    } else if (role === 'finance') {
        financeAction.style.display = 'flex';
        if (loan.status === 'Pending Finance Verification') {
            financeAction.innerHTML = `<button class="btn btn-primary" style="flex:1;" onclick="openVerifyModal('${loan.id}')">Review & Set Terms</button>`;
        } else if (loan.status === 'Pending Bond Generation') {
            financeAction.innerHTML = `<button class="btn btn-primary" style="flex:1;" onclick="openBondPrepModal('${loan.id}')">Generate Agreement Bond</button>`;
        } else if (loan.status === 'Pending Disbursement') {
            financeAction.innerHTML = `<button class="btn btn-primary" style="flex:1; background: #10b981;" onclick="openBondView('${loan.id}', 'finance'); closeModal('modal-loan-details')">Verify Signature & Disburse</button>`;
        } else {
            financeAction.innerHTML = `<button class="btn" style="flex:1;" onclick="openBondView('${loan.id}', 'view'); closeModal('modal-loan-details')">View Details</button>`;
        }
        financeAction.innerHTML += `<button class="btn" style="flex: 0.5; background: #ef4444; color: white;" onclick="deleteLoan('${loan.id}')">Delete</button>`;
    } else if (role === 'ceo') {
        financeAction.style.display = 'flex';
        if (loan.status === 'Pending CEO') {
            financeAction.innerHTML = `
                <button class="btn btn-primary" style="flex:1; background: #10b981;" onclick="ceoApproveManagerLoan('${loan.id}')">Approve Loan</button>
                <button class="btn" style="flex: 0.5; background: #ef4444; color: white;" onclick="ceoRejectManagerLoan('${loan.id}')">Reject</button>
            `;
        } else {
            financeAction.innerHTML = `<button class="btn" style="flex:1;" onclick="openBondView('${loan.id}', 'view'); closeModal('modal-loan-details')">View Details</button>`;
        }
    }
    
    openModal('modal-loan-details');
};

window.ceoApproveManagerLoan = (id) => {
    const loan = loanApplications.find(l => l.id === id);
    if (!loan) return;
    
    const amountStr = prompt("Enter approved loan amount for Manager:", loan.reqAmount);
    if (amountStr === null) return;
    const amount = parseFloat(amountStr);
    
    const installmentsStr = prompt("Enter number of installments:", loan.reqInstallments);
    if (installmentsStr === null) return;
    const installments = parseInt(installmentsStr);
    
    if (amount > 0 && installments > 0) {
        loan.approvedAmount = amount;
        loan.installments = installments;
        loan.installmentAmount = parseFloat((amount / installments).toFixed(2));
        loan.status = 'Active'; // Skips all bond steps
        
        // Deduct from Admin Wallet
        adminWallet.balance -= amount;
        
        saveData();
        renderCeoLoans();
        closeModal('modal-loan-details');
        showToast("Manager loan approved! Amount deducted from Admin Wallet.");
    }
};

window.ceoRejectManagerLoan = (id) => {
    if(!confirm("Are you sure you want to reject this Manager loan?")) return;
    const loan = loanApplications.find(l => l.id === id);
    if (!loan) return;
    loan.status = 'Rejected';
    saveData();
    renderCeoLoans();
    closeModal('modal-loan-details');
    showToast("Manager loan rejected.");
};

window.rejectLoanTerms = (id) => {
    if(!confirm("Are you sure you want to reject the terms? The loan will go back to the Finance Manager for renegotiation.")) return;
    const loan = loanApplications.find(l => l.id === id);
    if (!loan) return;
    loan.status = 'Pending Finance Verification'; // Go directly back to Finance, skipping MD
    saveData();
    if (currentUser && (currentUser.role === 'staff' || currentUser.role === 'Delivery' || currentUser.role === 'Technical')) {
        renderStaffLoans();
    }
    closeModal('modal-loan-details');
    showToast("Loan returned to Finance Manager for renegotiation.");
};

window.deleteLoan = (id) => {
    if(!confirm("Are you sure you want to permanently delete this loan? This will remove it from all records.")) return;
    loanApplications = loanApplications.filter(l => l.id !== id);
    saveData();
    renderAdminLoans();
    renderMDLoans();
    if (currentUser && (currentUser.role === 'staff' || currentUser.role === 'Delivery' || currentUser.role === 'Technical')) {
        renderStaffLoans();
    }
    closeModal('modal-loan-details');
    showToast("Loan successfully deleted from the system.");
};
window.openVerifyModal = (id) => {
    closeModal('modal-loan-details');
    const loan = loanApplications.find(l => l.id === id);
    if (!loan) return;
    
    document.getElementById('verify-loan-id').value = id;
    document.getElementById('verify-loan-approved').value = loan.reqAmount;
    document.getElementById('verify-loan-installment-amt').value = '';
    document.getElementById('verify-loan-total-installments').value = loan.reqInstallments || '';
    openModal('modal-loan-verify');
};

const verifyForm = document.getElementById('loan-verify-form');
if (verifyForm) {
    verifyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('verify-loan-id').value;
        const loan = loanApplications.find(l => l.id === id);
        if (loan) {
            loan.approvedAmount = parseFloat(document.getElementById('verify-loan-approved').value);
            loan.installments = parseInt(document.getElementById('verify-loan-total-installments').value);
            loan.installmentAmount = parseFloat(document.getElementById('verify-loan-installment-amt').value);
            
            if (loan.mdApproved) {
                loan.status = 'Pending Bond Generation';
                showToast("Terms updated. Ready for Bond Generation.");
            } else {
                loan.status = 'Pending MD Approval';
                showToast("Application verified. Sent to MD for approval.");
            }
            
            saveData();
            closeModal('modal-loan-verify');
            refreshAdminData();
        }
    });
}

window.mdApproveLoan = (id) => {
    const loan = loanApplications.find(l => l.id === id);
    if (loan) {
        if (adminWallet.balance < loan.approvedAmount) {
            showToast("Not enough balance in Agency Admin Account.");
            return;
        }
        
        loan.status = 'Pending Bond Generation';
        loan.mdApproved = true;
        saveData();
        showToast("Loan Approved! Sent for Bond Generation.");
        refreshAdminData();
    }
};

window.mdRejectLoan = (id) => {
    const loan = loanApplications.find(l => l.id === id);
    if (loan) {
        loan.status = 'Rejected';
        loan.rejectReason = 'Rejected by Managing Director';
        saveData();
        showToast("Loan Rejected.");
        refreshAdminData();
    }
};

window.openBondPrepModal = (id) => {
    closeModal('modal-loan-details');
    document.getElementById('bond-prep-loan-id').value = id;
    openModal('modal-bond-prep');
};

const bondPrepForm = document.getElementById('bond-prep-form');
if (bondPrepForm) {
    bondPrepForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('bond-prep-loan-id').value;
        const loan = loanApplications.find(l => l.id === id);
        if (loan) {
            loan.deductionDate = document.getElementById('bond-deduction-date').value;
            loan.status = 'Pending Staff Acceptance';
            saveData();
            closeModal('modal-bond-prep');
            showToast("Agreement Bond generated. Pending Staff Signature.");
            refreshAdminData();
        }
    });
}

let activeBondLoanId = null;
window.openBondView = (id, role) => {
    const loan = loanApplications.find(l => l.id === id);
    if (!loan) return;
    
    activeBondLoanId = id;
    
    document.getElementById('bond-txt-name').textContent = loan.staffName;
    document.getElementById('bond-txt-id').textContent = loan.staffId;
    const staff = staffList.find(s => s.id === loan.staffId);
    document.getElementById('bond-txt-mobile').textContent = (staff && staff.mobile) ? staff.mobile : 'N/A';
    document.getElementById('bond-txt-role').textContent = loan.staffRole;
    document.getElementById('bond-txt-ac').textContent = loan.ac;
    document.getElementById('bond-txt-ifsc').textContent = loan.ifsc;
    
    document.getElementById('bond-txt-amount').textContent = loan.approvedAmount;
    document.getElementById('bond-txt-installments').textContent = loan.installments;
    document.getElementById('bond-txt-installment-amt').textContent = loan.installmentAmount;
    document.getElementById('bond-txt-type').textContent = loan.instType;
    document.getElementById('bond-txt-deduction-date').textContent = loan.deductionDate ? new Date(loan.deductionDate).toLocaleDateString() : 'TBD';
    document.getElementById('bond-txt-loan-id').textContent = loan.id;

    // CEO Signature
    const bondCeoSig = document.getElementById('bond-ceo-signature');
    if (bondCeoSig) {
        bondCeoSig.textContent = ceoDigitalSignature || "CEO";
    }
    
    // Generate QR
    const qrDiv = document.getElementById('bond-qrcode');
    qrDiv.innerHTML = '';
    if (window.QRCode) {
        const qrText = `AURA LOAN AGREEMENT\n` +
                       `Loan ID: ${loan.id}\n` +
                       `Name: ${loan.staffName}\n` +
                       `Amount: Rs.${loan.approvedAmount}\n` +
                       `Terms: ${loan.installments} ${loan.instType}\n` +
                       `Account: ${loan.ac}`;
        new QRCode(qrDiv, {
            text: qrText,
            width: 100,
            height: 100
        });
    } else {
        qrDiv.textContent = "[QR Code]";
    }
    
    const staffActions = document.getElementById('bond-staff-actions');
    const financeActions = document.getElementById('bond-finance-actions');
    document.getElementById('bond-signature-area').textContent = loan.signature || '';
    
    staffActions.style.display = 'none';
    financeActions.style.display = 'none';
    
    if (role === 'staff' && loan.status === 'Pending Staff Acceptance') {
        staffActions.style.display = 'block';
    } else if (role === 'finance' && loan.status === 'Pending Disbursement') {
        financeActions.style.display = 'block';
    }
    
    openModal('modal-bond-view');
};

window.staffAcceptBond = () => {
    const sig = document.getElementById('bond-accept-signature').value;
    if (!sig) { showToast("Please type your signature to accept."); return; }
    
    const loan = loanApplications.find(l => l.id === activeBondLoanId);
    if (loan) {
        loan.signature = sig;
        loan.status = 'Pending Disbursement';
        saveData();
        closeModal('modal-bond-view');
        showToast("Agreement Signed! Awaiting final disbursement by Finance.");
        if (typeof renderStaffLoansHistory === 'function') renderStaffLoansHistory();
    }
};

window.financeDisburseLoan = () => {
    const loan = loanApplications.find(l => l.id === activeBondLoanId);
    if (loan) {
        if (adminWallet.balance < loan.approvedAmount) {
            showToast("Not enough balance in Agency Admin Account to disburse.");
            return;
        }
        
        adminWallet.balance -= loan.approvedAmount;
        
        const staff = staffList.find(s => s.id === loan.staffId);
        if (staff) {
            staff.earnings = (staff.earnings || 0) + loan.approvedAmount;
            if (!staff.transactions) staff.transactions = [];
            staff.transactions.push({
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                source: `Loan Disbursed: ${loan.id}`,
                amount: loan.approvedAmount
            });
        }
        
        loan.status = 'Active';
        saveData();
        closeModal('modal-bond-view');
        showToast(`Loan ${loan.id} disbursed successfully! Amount credited to staff.`);
        refreshAdminData();
    }
};

// Automatic Repayment Logic (To be invoked by daily EOD or monthly Salary processes)
window.processLoanDeductions = (staffId, amountAvailable, isMonthly = false) => {
    const activeLoans = loanApplications.filter(l => l.staffId === staffId && l.status === 'Active');
    let totalDeducted = 0;
    
    activeLoans.forEach(loan => {
        // Match deduction type
        const matchesDaily = (!isMonthly && loan.instType === 'Daily');
        const matchesMonthly = (isMonthly && loan.instType === 'Monthly');
        
        if (matchesDaily || matchesMonthly) {
            // Check if deduction date has started
            const today = new Date();
            const startDeductionDate = loan.deductionDate ? new Date(loan.deductionDate) : null;
            if (!startDeductionDate || today >= startDeductionDate) {
                const remainingBal = loan.approvedAmount - (loan.paidAmount || 0);
                const deductAmt = Math.min(loan.installmentAmount, remainingBal, amountAvailable - totalDeducted);
                
                if (deductAmt > 0) {
                    loan.paidAmount = (loan.paidAmount || 0) + deductAmt;
                    loan.installmentsPaid = (loan.installmentsPaid || 0) + 1;
                    totalDeducted += deductAmt;
                    
                    if (loan.paidAmount >= loan.approvedAmount) {
                        loan.status = 'Completed';
                        loan.paidAmount = loan.approvedAmount;
                    }
                }
            }
        }
    });
    
    return totalDeducted;
};

window.clearAllData = () => {
    if(!confirm("⚠️ WARNING: You are about to permanently delete ALL data in the agency (Staff, Shops, Transactions, Salaries, Attendance, etc). This cannot be undone. Are you absolutely sure?")) return;
    
    const userConfirm = prompt("To confirm deletion, please type 'DELETE ALL'");
    if(userConfirm !== 'DELETE ALL') {
        alert("Deletion cancelled.");
        return;
    }
    
    // Wipe all global state
    staffList = [];
    shops = [];
    payments = [];
    techPayouts = [];
    eodDistributions = [];
    adminWallet = { balance: 0, pendingTech: 0, pendingDelivery: 0, deliveryReserve: 0 };
    commissionSettings = { admin: 60, delivery: 40, tech: 10 };
    dailyAttendance = {};
    attendanceHistory = {};
    pendingAudit = null;
    ceoSalariesPaid = [];
    absenteeDeductions = [];
    walletTransfers = [];
    dailySalaryReports = [];
    auditorSignature = null;
    emiCreditsHistory = [];
    ceoLowPayThreshold = 380;
    cibilLoanCutoff = 150;
    dailyDeliveries = {};
    leaveRequests = [];
    otpLogs = [];
    idCards = [];
    lastAttendanceDate = '';
    officialAnnouncements = [];
    loanApplications = [];
    staffComplaints = [];
    barcodeAttendanceLogs = [];
    ceoDigitalSignature = "";
    omSignature = null;
    fmSignature = null;
    mdSignature = null;
    agencyTimings = { checkInStart: '09:00', checkInEnd: '10:30', checkOutStart: '18:00', checkOutEnd: '20:00', halfDayMinutes: 240 };
    
    // Wipe localStorage locally just in case
    localStorage.clear();

    // Save the empty state (which automatically updates MongoDB and broadcasts to all clients)
    saveData();
    
    alert("System has been completely wiped. The app will now reload.");
    setTimeout(() => {
        window.location.reload();
    }, 1000); // Wait 1 second to ensure socket.emit completes before the connection is killed
};

window.fireStaffMember = () => {
    const staffId = document.getElementById('ceo-fire-staff-select').value;
    if (!staffId) {
        showToast('Please select a staff member to fire.');
        return;
    }
    
    const staffIndex = staffList.findIndex(s => s.id === staffId);
    if (staffIndex === -1) return;
    
    const staffName = staffList[staffIndex].name;
    
    if (!confirm(`CRITICAL WARNING: Are you sure you want to permanently fire ${staffName} (${staffId})? This will delete their profile and all their data.`)) {
        return;
    }
    
    // Remove from staffList
    staffList.splice(staffIndex, 1);
    
    saveData();
    refreshAdminData();
    showToast(`${staffName} has been terminated from the agency.`);
};


window.renderAdminLeaves = () => {
    const tbody = document.getElementById('admin-leaves-tbody');
    if (!tbody) return;
    if (leaveRequests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 1rem; color: #94a3b8;">No leave requests found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = leaveRequests.map((lr, idx) => {
        let actionHTML = '';
        if (lr.status && lr.status.includes('Pending')) {
            const role = currentUser.originalRole || currentUser.role;
            let canApprove = false;
            
            if ((lr.status === 'Pending MD' || lr.status === 'Pending CEO') && ['Managing Director (MD)', 'CEO', 'superadmin'].includes(role)) {
                canApprove = true;
            } else if (lr.status === 'Pending Operations' && ['Operations Manager', 'CEO', 'superadmin'].includes(role)) {
                canApprove = true;
            }
            
            if (canApprove) {
                actionHTML = `<button class="btn btn-sm" style="background: #10b981; border: none; margin-right: 5px;" onclick="updateLeaveStatus(${idx}, 'Approved')">Approve</button>
                              <button class="btn btn-sm" style="background: #ef4444; border: none;" onclick="updateLeaveStatus(${idx}, 'Rejected')">Reject</button>`;
            } else {
                actionHTML = `<span style="color: #f59e0b;">Waiting on ${lr.status.replace('Pending ', '')}</span>`;
            }
        } else {
            actionHTML = `<span style="color: ${lr.status === 'Approved' ? '#10b981' : '#ef4444'}">${lr.status}</span>`;
        }
        
        let daysStr = "Unknown";
        if (lr.startDate && lr.endDate) {
            const sd = new Date(lr.startDate);
            const ed = new Date(lr.endDate);
            const diffTime = Math.abs(ed - sd);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            daysStr = diffDays + (diffDays > 1 ? " days" : " day");
        }

        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 1rem;">${lr.name || lr.staffName}</td>
                <td style="padding: 1rem;"><span class="badge" style="background: rgba(255,255,255,0.1);">${lr.role || lr.type || 'Staff'}</span></td>
                <td style="padding: 1rem;">${lr.startDate || lr.date} to ${lr.endDate || lr.date}</td>
                <td style="padding: 1rem;">${daysStr}</td>
                <td style="padding: 1rem; max-width: 200px; word-wrap: break-word;">${lr.reason}</td>
                <td style="padding: 1rem;">
                    <span style="display:inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; background: ${lr.status === 'Pending' ? '#f59e0b' : (lr.status === 'Approved' ? '#10b981' : '#ef4444')}">
                        ${lr.status}
                    </span>
                </td>
                <td style="padding: 1rem; text-align: right;">${actionHTML}
                    <button class="btn btn-sm" style="background: #ef4444; border: none; margin-left: 5px; color: white;" onclick="deleteLeaveRequest(${idx})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
};

window.deleteLeaveRequest = (idx) => {
    if (confirm("Are you sure you want to delete this leave request?")) {
        leaveRequests.splice(idx, 1);
        saveData();
        refreshAdminData();
        showToast('Leave request deleted.');
    }
};

window.updateLeaveStatus = (idx, status) => {
    if (leaveRequests[idx]) {
        const lr = leaveRequests[idx];
        
        if (status === 'Approved' && (lr.status === 'Pending MD' || lr.status === 'Pending CEO')) {
            lr.status = 'Pending Operations';
            saveData();
            refreshAdminData();
            showToast('Leave forwarded to Operations Manager.');
            return;
        }
        
        lr.status = status;
        saveData();
        refreshAdminData();
        showToast('Leave ' + status);
    }
};

window.renderAdminIDCards = () => {
    // Populate select
    const select = document.getElementById('idcard-staff-select');
    if (select) {
        select.innerHTML = '<option value="">Choose Staff...</option>' + staffList.map(s => `<option value="${s.id}">${s.name} (${s.id})</option>`).join('');
    }
    
    // Populate table
    const tbody = document.getElementById('ops-idcards-tbody');
    if (!tbody) return;
    if (idCards.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 1rem; color: #94a3b8;">No ID Cards generated yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = idCards.map(c => {
        const staff = staffList.find(s => s.id === c.staffId);
        const sName = staff ? staff.name : 'Unknown';
        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 1rem;">${c.staffId}</td>
                <td style="padding: 1rem;">${sName}</td>
                <td style="padding: 1rem;">${c.department}</td>
                <td style="padding: 1rem;">${c.validTill}</td>
                <td style="padding: 1rem; text-align: right;">
                    <button class="btn btn-sm" style="background: #2196F3; border: none; margin-right: 5px;" onclick="showIDCard('${c.staffId}')">View</button>
                    <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444;" onclick="removeIDCard('${c.staffId}')">Remove</button>
                </td>
            </tr>
        `;
    }).join('');
};

window.renderMasterReport = () => {
    try {
        const container = document.getElementById('master-report-content');
        const dateFilter = document.getElementById('report-date-filter');
        if (!container || !dateFilter) return;
        
        const filterDate = dateFilter.value;
        const isSameDate = (item) => {
            if(!filterDate) return true;
            if(!item) return false;
            
            const dateString = item.date;
            if(!dateString) {
                if(item.isoDate) return item.isoDate.startsWith(filterDate);
                return false;
            }
            
            const d = new Date(dateString);
            if (!isNaN(d)) {
                const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if(ds === filterDate) return true;
            }
            
            const parts = dateString.split(',')[0].split('/');
            if(parts.length === 3) {
                const altDs = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                if(altDs === filterDate) return true;
                const altDs2 = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                if(altDs2 === filterDate) return true;
            }
            
            if(item.isoDate) return item.isoDate.startsWith(filterDate);
            
            return false;
        };

        const filteredPayments = (payments || []).filter(isSameDate);
        const filteredEod = (eodDistributions || []).filter(isSameDate);

        const tStyle = 'width: 100%; border-collapse: collapse; margin-bottom: 2rem; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);';
        const thStyle = 'padding: 1rem; background: linear-gradient(90deg, #4f46e5 0%, #ec4899 100%); color: white; font-weight: 600; text-align: left; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.05em; border: none;';
        const tdStyle = 'padding: 1rem; border-bottom: 1px solid #e2e8f0; color: #334155; background: rgba(255, 255, 255, 0.9); font-weight: 500; border-right: none; border-left: none;';

        const getNames = (ids) => {
            if (!ids) return '-';
            const idArr = Array.isArray(ids) ? ids : [ids];
            if (idArr.length === 0) return '-';
            return idArr.map(id => {
                const staff = (staffList || []).find(s => s && s.id === id);
                return staff ? `${staff.name}` : id;
            }).join(', ');
        };

        // Section: Shops
        let shopsHtml = `<div id="section-shops" class="report-section mb-4"><h3>Registered Shops</h3><table style="${tStyle}"><thead><tr><th style="${thStyle}">Shop</th><th style="${thStyle}">Delivery Staff</th><th style="${thStyle}">Tech Staff</th></tr></thead><tbody>`;
        if((shops || []).length === 0) shopsHtml += `<tr><td colspan="3" style="${tdStyle}">No shops registered.</td></tr>`;
        shopsHtml += (shops || []).map(s => `<tr><td style="${tdStyle}">${s.name}</td><td style="${tdStyle}">${getNames(s.deliveryStaff)}</td><td style="${tdStyle}">${getNames(s.technicalStaff)}</td></tr>`).join('');
        shopsHtml += `</tbody></table></div>`;

        // Section: Staff
        const totalStaff = (staffList || []).length;
        const totalDelivery = (staffList || []).filter(s => s.role === 'Delivery' || s.role === 'Delivery Staff').length;
        const totalTechnical = (staffList || []).filter(s => s.role === 'Technical' || s.role === 'Technical Staff').length;
        const totalCorporate = (staffList || []).filter(s => s.id && s.id.startsWith('MGR-')).length;

        let staffHtml = `<div id="section-staff" class="report-section mb-4">
            <h3>All Registered Staff</h3>
            <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                <div style="background: rgba(255,255,255,0.1); padding: 0.5rem 1rem; border-radius: 4px;">Total Staff: <strong>${totalStaff}</strong></div>
                <div style="background: rgba(255,255,255,0.1); padding: 0.5rem 1rem; border-radius: 4px;">Delivery Staff: <strong>${totalDelivery}</strong></div>
                <div style="background: rgba(255,255,255,0.1); padding: 0.5rem 1rem; border-radius: 4px;">Technical Staff: <strong>${totalTechnical}</strong></div>
                <div style="background: rgba(255,255,255,0.1); padding: 0.5rem 1rem; border-radius: 4px;">Corporate Manager Payroll: <strong>${totalCorporate}</strong></div>
            </div>
            <table style="${tStyle}"><thead><tr><th style="${thStyle}">ID</th><th style="${thStyle}">Name</th><th style="${thStyle}">Role</th><th style="${thStyle}">Password</th></tr></thead><tbody>`;
        if((staffList || []).length === 0) staffHtml += `<tr><td colspan="4" style="${tdStyle}">No staff registered.</td></tr>`;
        staffHtml += (staffList || []).map(s => `<tr><td style="${tdStyle}"><a href="#" onclick="window.showJoiningLetter('${s.id}'); return false;" style="color: #3b82f6; text-decoration: underline;">${s.id}</a></td><td style="${tdStyle}">${s.name}</td><td style="${tdStyle}">${s.role}</td><td style="${tdStyle}">${s.password || '-'}</td></tr>`).join('');
        staffHtml += `</tbody></table></div>`;

        // Section: Transactions (Fixed amount -> total)
        let transHtml = `<div id="section-transactions" class="report-section mb-4"><h3>Shop Commission Transactions</h3><table style="${tStyle}"><thead><tr><th style="${thStyle}">Date</th><th style="${thStyle}">Shop</th><th style="${thStyle}">Amount (₹)</th></tr></thead><tbody>`;
        if(filteredPayments.length === 0) transHtml += `<tr><td colspan="3" style="${tdStyle}">No transactions for this date.</td></tr>`;
        transHtml += filteredPayments.map(p => `<tr><td style="${tdStyle}">${p.date}</td><td style="${tdStyle}">${p.shopName}</td><td style="${tdStyle}">${Number(p.total||0).toFixed(2)}</td></tr>`).join('');
        transHtml += `</tbody></table></div>`;

        // Section: Shop Summary (Fixed amount -> total)
        const shopSummary = {};
        filteredPayments.forEach(p => {
            if(!shopSummary[p.shopName]) shopSummary[p.shopName] = 0;
            shopSummary[p.shopName] += Number(p.total || 0);
        });
        let shopSumHtml = `<div id="section-shopsummary" class="report-section mb-4"><h3>Shop-Wise Summary</h3><table style="${tStyle}"><thead><tr><th style="${thStyle}">Shop</th><th style="${thStyle}">Total Collected (₹)</th></tr></thead><tbody>`;
        if(Object.keys(shopSummary).length === 0) shopSumHtml += `<tr><td colspan="2" style="${tdStyle}">No summary available.</td></tr>`;
        Object.keys(shopSummary).forEach(shop => {
            shopSumHtml += `<tr><td style="${tdStyle}">${shop}</td><td style="${tdStyle}">${shopSummary[shop].toFixed(2)}</td></tr>`;
        });
        shopSumHtml += `</tbody></table></div>`;

            // Section: Staff Earnings
        let earningsHtml = `<div id="section-staffearnings" class="report-section mb-4"><h3>Staff Earnings Summary</h3><table style="${tStyle}"><thead><tr><th style="${thStyle}">Staff Name</th><th style="${thStyle}">Role</th><th style="${thStyle}">Earnings (₹)</th></tr></thead><tbody>`;
        if((staffList || []).length === 0) earningsHtml += `<tr><td colspan="3" style="${tdStyle}">No staff data available.</td></tr>`;
        
        earningsHtml += (staffList || []).map(s => {
            let dayEarnings = 0;
            if (s.transactions && s.transactions.length > 0) {
                const dayTxs = s.transactions.filter(isSameDate);
                dayEarnings = dayTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
            } else if (!filterDate) {
                dayEarnings = s.earnings || 0;
            }
            return `<tr><td style="${tdStyle}">${s.name}</td><td style="${tdStyle}">${s.role}</td><td style="${tdStyle}">${Number(dayEarnings).toFixed(2)}</td></tr>`;
        }).join('');
        
        earningsHtml += `</tbody></table></div>`;

        container.innerHTML = shopsHtml + staffHtml + transHtml + shopSumHtml + earningsHtml;
    } catch(err) {
        console.error("Master Report Error:", err);
    }
};


window.forceResetCycle = () => {
    if (confirm("Are you sure you want to FORCE CANCEL the current End of Day cycle? All unsaved audit progress will be lost.")) {
        pendingAudit = null;
        saveData();
        refreshAdminData();
        showToast('Audit Cycle has been forcefully reset and funds restored.');
    }
};


window.approvePendingAudit = () => {
    if (!pendingAudit || pendingAudit.status !== 'PENDING_MD_VERIFICATION') {
        showToast('Not in MD Verification state.');
        return;
    }
    
    pendingAudit.status = 'PENDING_AUDITOR_FINAL';
    saveData();
    refreshAdminData();
    showToast('MD Verification Complete! Sent to Auditor for final verification.');
};


window.mdRefundStaff = () => {
    const staffId = document.getElementById('md-refund-staff').value;
    const amount = parseFloat(document.getElementById('md-refund-amount').value);
    const reason = document.getElementById('md-refund-reason').value;

    if (!staffId || isNaN(amount) || amount <= 0 || !reason) {
        showToast('Please select staff, enter a valid amount, and provide a reason.');
        return;
    }

    if (adminWallet.balance < amount) {
        showToast('Insufficient funds in Agency Admin Account.');
        return;
    }

    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;

    adminWallet.balance -= amount;
    staff.earnings = (staff.earnings || 0) + amount;
    if (!staff.transactions) staff.transactions = [];
    staff.transactions.push({
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        source: `MD Top-Up / Refund: ${reason}`,
        amount: amount
    });

    document.getElementById('md-refund-amount').value = '';
    document.getElementById('md-refund-reason').value = '';

    saveData();
    refreshAdminData();
    showToast(`Successfully transferred ₹${amount} to ${staff.name}`);
};

window.mdSweepDeliveryReserve = () => {
    if (!adminWallet.deliveryReserve || adminWallet.deliveryReserve <= 0) {
        showToast('Delivery Boy Reserve is empty.');
        return;
    }
    
    const amount = adminWallet.deliveryReserve;
    if (confirm(`Are you sure you want to sweep ₹${amount.toFixed(2)} from the Delivery Boy Reserve into the Agency Admin Account?`)) {
        adminWallet.balance += amount;
        adminWallet.deliveryReserve = 0;
        saveData();
        refreshAdminData();
        showToast(`Successfully swept ₹${amount.toFixed(2)} into the Agency Admin Account.`);
    }
};


window.viewDailySalaryReport = (id) => {
    const r = dailySalaryReports.find(x => x.id === id);
    if(!r) return;
    
    document.getElementById('rpt-id').innerText = r.id;
    document.getElementById('rpt-date').innerText = r.date;
    document.getElementById('rpt-submit-date').innerText = r.date;
    
    document.getElementById('rpt-basic-salary').innerText = Number(r.totalBasic).toFixed(2);
    document.getElementById('rpt-bonus').innerText = Number(r.totalBonus).toFixed(2);
    document.getElementById('rpt-deductions').innerText = Number(r.totalDeductions).toFixed(2);
    document.getElementById('rpt-net-salary').innerText = Number(r.netPaid).toFixed(2);
    
    document.getElementById('rpt-att-total').innerText = r.attTotal;
    document.getElementById('rpt-att-present').innerText = r.attPresent;
    document.getElementById('rpt-att-half').innerText = r.attHalf;
    document.getElementById('rpt-att-absent').innerText = r.attAbsent;
    document.getElementById('rpt-att-leave').innerText = r.attLeave;
    
    document.getElementById('rpt-dept-del-count').innerText = r.delCount;
    document.getElementById('rpt-dept-del-amt').innerText = Number(r.delAmt).toFixed(2);
    document.getElementById('rpt-dept-tech-count').innerText = r.techCount;
    document.getElementById('rpt-dept-tech-amt').innerText = Number(r.techAmt).toFixed(2);
    document.getElementById('rpt-dept-grand').innerText = Number(r.netPaid).toFixed(2);
    
    // Set UI disabled mode for viewing
    const modal = document.getElementById('auditor-report-modal');
    modal.style.display = 'block';
    
    // Hide submit button & signature pad
    const btn = document.getElementById('finalize-report-btn');
    if (btn) btn.style.display = 'none';
    const sigPad = document.getElementById('rpt-auditor-signature-pad');
    const clearBtn = document.getElementById('rpt-clear-signature');
    if (sigPad) sigPad.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    
    // Show Print and Delete buttons
    document.getElementById('print-auditor-report-btn').style.display = 'inline-block';
    document.getElementById('delete-auditor-report-btn').style.display = 'inline-block';
    
    // Fill Auditor details & disable inputs
    document.getElementById('rpt-auditor-name').value = r.auditorName || '';
    document.getElementById('rpt-auditor-name').readOnly = true;
    
    // Handle remarks split by ' | '
    const remarksArr = (r.remarks || '').split(' | ');
    for (let i = 1; i <= 3; i++) {
        const el = document.getElementById('rpt-remarks-' + i);
        if (el) {
            el.value = remarksArr[i-1] || '';
            el.readOnly = true;
        }
    }
    
    // Handle Radios
    const payMethods = document.querySelectorAll('input[name="rpt-pay-method"]');
    payMethods.forEach(rad => {
        rad.checked = (rad.value === r.paymentMethod);
        rad.disabled = true;
    });
    
    const verifyStatuses = document.querySelectorAll('input[name="rpt-verify-status"]');
    verifyStatuses.forEach(rad => {
        rad.checked = (rad.value === r.verificationStatus);
        rad.disabled = true;
    });
    
    // Signatures
    const asigTxt = document.getElementById('rpt-auditor-sig-text');
    const asigImg = document.getElementById('rpt-auditor-sig-img');
    asigTxt.style.display = 'none';
    asigImg.style.display = 'none';
    
    if(r.auditorSignature) {
        if(r.auditorSignature.startsWith('data:image')) {
            asigImg.src = r.auditorSignature;
            asigImg.style.display = 'block';
        } else {
            asigTxt.innerText = r.auditorSignature;
            asigTxt.style.display = 'block';
        }
    }
    
    const csigTxt = document.getElementById('rpt-ceo-sig-text');
    const csigImg = document.getElementById('rpt-ceo-sig-img');
    if (csigTxt) csigTxt.style.display = 'none';
    if (csigImg) csigImg.style.display = 'none';
    
    if (r.ceoSignature) {
        if (r.ceoSignature.startsWith('data:image')) {
            if (csigImg) {
                csigImg.src = r.ceoSignature;
                csigImg.style.display = 'block';
            }
        } else {
            if (csigTxt) {
                csigTxt.innerText = r.ceoSignature;
                csigTxt.style.display = 'block';
            }
        }
    }
    
    const msigTxt = document.getElementById('rpt-md-sig-text');
    const fsigTxt = document.getElementById('rpt-fm-sig-text');
    const osigTxt = document.getElementById('rpt-om-sig-text');
    
    if (msigTxt) msigTxt.style.display = 'none';
    if (fsigTxt) fsigTxt.style.display = 'none';
    if (osigTxt) osigTxt.style.display = 'none';
    
    if (r.mdSignature && msigTxt) { msigTxt.innerText = r.mdSignature; msigTxt.style.display = 'block'; }
    if (r.fmSignature && fsigTxt) { fsigTxt.innerText = r.fmSignature; fsigTxt.style.display = 'block'; }
    if (r.omSignature && osigTxt) { osigTxt.innerText = r.omSignature; osigTxt.style.display = 'block'; }
    
    // We add a close handler to reset display of button when closed
    const closeBtn = modal.querySelector('button[onclick*="display=\'none\'"]');
    closeBtn.onclick = () => {
        modal.style.display = 'none';
        
        // Reset state for next NEW report
        if (btn) btn.style.display = 'inline-block';
        if (sigPad) sigPad.style.display = 'block';
        if (clearBtn) clearBtn.style.display = 'inline-block';
        
        document.getElementById('rpt-auditor-name').readOnly = false;
        document.getElementById('rpt-auditor-name').value = '';
        
        for (let i = 1; i <= 3; i++) {
            const el = document.getElementById('rpt-remarks-' + i);
            if (el) {
                el.readOnly = false;
                el.value = '';
            }
        }
        
        payMethods.forEach(rad => { rad.disabled = false; rad.checked = false; });
        verifyStatuses.forEach(rad => { rad.disabled = false; rad.checked = false; });
    };
};

// =========================================================
// Responsive Enhancements
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    // Make all tables responsive on mobile by wrapping them in a scrollable div
    document.querySelectorAll('table').forEach(table => {
        if (!table.parentElement.classList.contains('table-responsive')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            // Insert wrapper before table in the DOM tree
            table.parentNode.insertBefore(wrapper, table);
            // Move table into wrapper
            wrapper.appendChild(table);
        }
    });
});
