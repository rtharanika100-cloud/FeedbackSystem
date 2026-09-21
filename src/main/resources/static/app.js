// Escavo Feedback & Escalation System Logic

document.addEventListener('DOMContentLoaded', () => {
    
    // Core Application State (persisted via localStorage)
    let state = {
        tickets: JSON.parse(localStorage.getItem('escavo_tickets') || localStorage.getItem('resolveflow_tickets')) || [],
        selectedTicketId: null,
        token: localStorage.getItem('escavo_token') || localStorage.getItem('resolveflow_token') || null,
        currentUser: JSON.parse(localStorage.getItem('escavo_user') || localStorage.getItem('resolveflow_user')) || null
    };

    // Initialize mock tickets if empty
    if (state.tickets.length === 0) {
        state.tickets = [
            {
                id: 1,
                title: "In-app Billing Double Charge on Invoice #1024",
                description: "I was double charged on my monthly subscription invoice. The system charged my card twice ($29.99 each). Please refund the duplicate payment.",
                category: "BILLING",
                priority: "HIGH",
                status: "CREATED",
                customer: "alice",
                assignee: null,
                createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
                updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
                history: [
                    {
                        oldStatus: null,
                        newStatus: "CREATED",
                        notes: "Feedback ticket submitted by customer.",
                        actionBy: "alice",
                        timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
                    }
                ]
            },
            {
                id: 2,
                title: "Android App Crashes instantly on Android 14 launch",
                description: "The mobile app crash on my Pixel 7 immediately when opening. I cleared cache and reinstalled but the crash persists.",
                category: "TECHNICAL",
                priority: "URGENT",
                status: "ASSIGNED",
                customer: "bob",
                assignee: "Agent Smith",
                createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
                updatedAt: new Date(Date.now() - 3600000 * 22).toISOString(),
                history: [
                    {
                        oldStatus: null,
                        newStatus: "CREATED",
                        notes: "Ticket created by Bob.",
                        actionBy: "bob",
                        timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
                    },
                    {
                        oldStatus: "CREATED",
                        newStatus: "UNDER_REVIEW",
                        notes: "Moved ticket to under review queue.",
                        actionBy: "Supervisor Johnson",
                        timestamp: new Date(Date.now() - 3600000 * 23).toISOString()
                    },
                    {
                        oldStatus: "UNDER_REVIEW",
                        newStatus: "ASSIGNED",
                        notes: "Assigned to Android team (Agent Smith). Escalating severity to Urgent.",
                        actionBy: "Supervisor Johnson",
                        timestamp: new Date(Date.now() - 3600000 * 22).toISOString()
                    }
                ]
            }
        ];
        saveTickets();
    }

    // Navigation Links
    const linkCustomerView = document.getElementById('link-customer-view');
    const linkAgentView = document.getElementById('link-agent-view');
    const linkAdminView = document.getElementById('link-admin-view');
    const brandHome = document.getElementById('brand-home');

    // Views
    const customerView = document.getElementById('customer-view');
    const agentView = document.getElementById('agent-view');
    const adminView = document.getElementById('admin-view');
    
    // Auth DOM Elements
    const authModal = document.getElementById('auth-modal');
    const btnCloseAuth = document.getElementById('btn-close-auth');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const btnLoginTrigger = document.getElementById('btn-login-trigger');
    const btnSignupTrigger = document.getElementById('btn-signup-trigger');
    const navAuthActions = document.getElementById('nav-auth-actions');
    const navUserActions = document.getElementById('nav-user-actions');
    const currentUserLabel = document.getElementById('current-user-name');
    const btnLogout = document.getElementById('btn-logout');

    // Instructions Modal Elements & Triggers
    const instructionsModal = document.getElementById('instructions-modal');
    const btnGuideTrigger = document.getElementById('btn-guide-trigger');
    const btnGuideUserTrigger = document.getElementById('btn-guide-user-trigger');
    const btnCloseInstructions = document.getElementById('btn-close-instructions');
    const btnGuideGotIt = document.getElementById('btn-guide-got-it');

    if (btnGuideTrigger) btnGuideTrigger.addEventListener('click', showInstructionsModal);
    if (btnGuideUserTrigger) btnGuideUserTrigger.addEventListener('click', showInstructionsModal);
    if (btnCloseInstructions) btnCloseInstructions.addEventListener('click', hideInstructionsModal);
    if (btnGuideGotIt) btnGuideGotIt.addEventListener('click', hideInstructionsModal);

    function showInstructionsModal() {
        if (instructionsModal) instructionsModal.classList.remove('hidden');
    }

    function hideInstructionsModal() {
        if (instructionsModal) instructionsModal.classList.add('hidden');
    }

    // Customer Ticket Inspection Modal
    const customerTicketModal = document.getElementById('customer-ticket-modal');
    const btnCloseCustomerModal = document.getElementById('btn-close-customer-modal');
    const custModalTicketId = document.getElementById('cust-modal-ticket-id');
    const custModalTicketStatus = document.getElementById('cust-modal-ticket-status');
    const custModalTicketTitle = document.getElementById('cust-modal-ticket-title');
    const custModalTicketCategory = document.getElementById('cust-modal-ticket-category');
    const custModalTicketPriority = document.getElementById('cust-modal-ticket-priority');
    const custModalTicketAgent = document.getElementById('cust-modal-ticket-agent');
    const custModalTicketDesc = document.getElementById('cust-modal-ticket-desc');
    const custModalVerifyBox = document.getElementById('cust-modal-verify-box');
    const btnCustConfirmClose = document.getElementById('btn-cust-confirm-close');
    const btnCustReopen = document.getElementById('btn-cust-reopen');
    const custModalTimeline = document.getElementById('cust-modal-timeline');

    if (btnCloseCustomerModal) {
        btnCloseCustomerModal.addEventListener('click', () => {
            customerTicketModal.classList.add('hidden');
        });
    }

    // Hero CTAs
    const heroBtnSubmit = document.getElementById('hero-btn-submit');
    const heroBtnWorkspace = document.getElementById('hero-btn-workspace');

    // Customer Feedback DOM
    const feedbackForm = document.getElementById('feedback-form');
    const customerTicketsList = document.getElementById('customer-tickets-list');

    // Agent Workspace DOM
    const agentTicketsTbody = document.getElementById('agent-tickets-tbody');
    const agentFilterStatus = document.getElementById('agent-filter-status');
    const agentEmptyDetailMsg = document.getElementById('agent-empty-detail-msg');
    const agentDetailContent = document.getElementById('agent-detail-content');
    const agentDetailTicketId = document.getElementById('agent-detail-ticket-id');
    const agentDetailTicketStatus = document.getElementById('agent-detail-ticket-status');
    const agentDetailTicketTitle = document.getElementById('agent-detail-ticket-title');
    const agentDetailTicketCategory = document.getElementById('agent-detail-ticket-category');
    const agentDetailTicketPriority = document.getElementById('agent-detail-ticket-priority');
    const agentDetailTicketCustomer = document.getElementById('agent-detail-ticket-customer');
    const agentDetailTicketDesc = document.getElementById('agent-detail-ticket-desc');
    const agentActionStatus = document.getElementById('agent-action-status');
    const agentActionNotes = document.getElementById('agent-action-notes');
    const btnAgentUpdateTicket = document.getElementById('btn-agent-update-ticket');
    const btnAgentEscalateTicket = document.getElementById('btn-agent-escalate-ticket');
    const agentTimelineList = document.getElementById('agent-timeline-list');

    // Admin Workspace DOM
    const adminTicketsTbody = document.getElementById('admin-tickets-tbody');
    const adminFilterStatus = document.getElementById('admin-filter-status');
    const adminEmptyDetailMsg = document.getElementById('admin-empty-detail-msg');
    const adminDetailContent = document.getElementById('admin-detail-content');
    const adminDetailTicketId = document.getElementById('admin-detail-ticket-id');
    const adminDetailTicketStatus = document.getElementById('admin-detail-ticket-status');
    const adminDetailTicketTitle = document.getElementById('admin-detail-ticket-title');
    const adminDetailTicketCategory = document.getElementById('admin-detail-ticket-category');
    const adminDetailTicketPriority = document.getElementById('admin-detail-ticket-priority');
    const adminDetailTicketCustomer = document.getElementById('admin-detail-ticket-customer');
    const adminDetailTicketDesc = document.getElementById('admin-detail-ticket-desc');
    const adminActionAssignee = document.getElementById('admin-action-assignee');
    const adminActionPriority = document.getElementById('admin-action-priority');
    const adminActionStatus = document.getElementById('admin-action-status');
    const adminActionNotes = document.getElementById('admin-action-notes');
    const btnAdminUpdateTicket = document.getElementById('btn-admin-update-ticket');
    const adminTimelineList = document.getElementById('admin-timeline-list');

    // Admin Stats DOM
    const statTotalTickets = document.getElementById('stat-total-tickets');
    const statEscalatedTickets = document.getElementById('stat-escalated-tickets');
    const statUnassignedTickets = document.getElementById('stat-unassigned-tickets');
    const statResolvedTickets = document.getElementById('stat-resolved-tickets');

    // ==========================================
    // Authentication & Role Permissions
    // ==========================================
    btnLoginTrigger.addEventListener('click', () => showAuthModal('login'));
    btnSignupTrigger.addEventListener('click', () => showAuthModal('register'));
    btnCloseAuth.addEventListener('click', hideAuthModal);
    
    tabLogin.addEventListener('click', () => toggleAuthTab('login'));
    tabRegister.addEventListener('click', () => toggleAuthTab('register'));

    function showAuthModal(mode) {
        authModal.classList.remove('hidden');
        toggleAuthTab(mode);
    }

    function hideAuthModal() {
        authModal.classList.add('hidden');
    }

    function toggleAuthTab(mode) {
        if (mode === 'login') {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            formLogin.classList.remove('hidden');
            formRegister.classList.add('hidden');
        } else {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            formRegister.classList.remove('hidden');
            formLogin.classList.add('hidden');
        }
    }

    // Submit Login form
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                handleLoginSuccess(data.token, data.username, data.role);
            } else {
                const errMsg = await response.text();
                showToast("Login failed: " + errMsg);
            }
        } catch (error) {
            console.warn("API offline, falling back to simulated session authentication");
            let role = "CUSTOMER";
            const lowerName = username.toLowerCase();
            if (lowerName.includes('agent')) role = "AGENT";
            if (lowerName.includes('supervisor') || lowerName.includes('admin')) role = "ADMIN";

            handleLoginSuccess("mock-jwt-token", username, role);
            showToast(`Welcome, ${username}! (${role} role)`);
        }
    });

    // Submit Registration form
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const role = document.getElementById('reg-role').value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, role })
            });

            if (response.ok) {
                const data = await response.json();
                handleLoginSuccess(data.token, data.username, data.role);
            } else {
                const errMsg = await response.text();
                showToast("Registration failed: " + errMsg);
            }
        } catch (error) {
            console.warn("API offline, falling back to simulated registration");
            handleLoginSuccess("mock-jwt-token", username, role);
            showToast(`Account created as ${role}!`);
        }
    });

    function handleLoginSuccess(token, username, role) {
        state.token = token;
        state.currentUser = { username, role };
        
        localStorage.setItem('escavo_token', token);
        localStorage.setItem('escavo_user', JSON.stringify(state.currentUser));

        hideAuthModal();
        applyRolePermissions();

        // Redirect to role workspace
        if (role === 'AGENT') {
            switchView('agent');
        } else if (role === 'SUPERVISOR' || role === 'ADMIN') {
            switchView('admin');
        } else {
            switchView('customer');
        }
    }

    // Logout Action
    btnLogout.addEventListener('click', () => {
        state.token = null;
        state.currentUser = null;
        localStorage.removeItem('escavo_token');
        localStorage.removeItem('escavo_user');
        localStorage.removeItem('resolveflow_token');
        localStorage.removeItem('resolveflow_user');
        
        applyRolePermissions();
        switchView('customer');
        showToast("Logged out successfully.");
    });

    function applyRolePermissions() {
        if (state.currentUser) {
            navAuthActions.classList.add('hidden');
            navUserActions.classList.remove('hidden');
            currentUserLabel.textContent = `${state.currentUser.username} (${state.currentUser.role})`;

            const role = state.currentUser.role;
            if (role === 'CUSTOMER') {
                linkCustomerView.classList.remove('hidden');
                linkAgentView.classList.add('hidden');
                linkAdminView.classList.add('hidden');
            } else if (role === 'AGENT') {
                linkCustomerView.classList.remove('hidden');
                linkAgentView.classList.remove('hidden');
                linkAdminView.classList.add('hidden');
            } else if (role === 'SUPERVISOR' || role === 'ADMIN') {
                linkCustomerView.classList.remove('hidden');
                linkAgentView.classList.remove('hidden');
                linkAdminView.classList.remove('hidden');
            }
        } else {
            navAuthActions.classList.remove('hidden');
            navUserActions.classList.add('hidden');
            linkCustomerView.classList.remove('hidden');
            linkAgentView.classList.add('hidden');
            linkAdminView.classList.add('hidden');
        }
    }

    // ==========================================
    // Navigation Routing & Workspace Switching
    // ==========================================
    brandHome.addEventListener('click', () => switchView('customer'));

    if (linkCustomerView) {
        linkCustomerView.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('customer');
        });
    }

    if (linkAgentView) {
        linkAgentView.addEventListener('click', (e) => {
            e.preventDefault();
            if (!state.currentUser || state.currentUser.role === 'CUSTOMER') {
                showToast("Access Denied: Agent role required.");
                return;
            }
            switchView('agent');
        });
    }

    if (linkAdminView) {
        linkAdminView.addEventListener('click', (e) => {
            e.preventDefault();
            if (!state.currentUser || (state.currentUser.role !== 'ADMIN' && state.currentUser.role !== 'SUPERVISOR')) {
                showToast("Access Denied: Admin or Supervisor role required.");
                return;
            }
            switchView('admin');
        });
    }

    heroBtnSubmit.addEventListener('click', () => {
        if (!state.currentUser) {
            showToast("Please login or register to submit feedback.");
            showAuthModal('login');
            return;
        }
        switchView('customer');
        document.getElementById('fb-title').focus();
    });

    heroBtnWorkspace.addEventListener('click', () => {
        if (!state.currentUser) {
            showToast("Please login to access workspace queues.");
            showAuthModal('login');
            return;
        }
        if (state.currentUser.role === 'CUSTOMER') {
            showToast("Customer accounts track issues in Customer Portal.");
            switchView('customer');
        } else if (state.currentUser.role === 'AGENT') {
            switchView('agent');
        } else {
            switchView('admin');
        }
    });

    function switchView(view) {
        state.selectedTicketId = null;
        
        // Remove active states from nav
        linkCustomerView.classList.remove('active');
        linkAgentView.classList.remove('active');
        linkAdminView.classList.remove('active');

        // Hide all views
        customerView.classList.add('hidden');
        customerView.classList.remove('active');
        agentView.classList.add('hidden');
        agentView.classList.remove('active');
        adminView.classList.add('hidden');
        adminView.classList.remove('active');

        if (view === 'agent') {
            linkAgentView.classList.add('active');
            agentView.classList.remove('hidden');
            agentView.classList.add('active');
            renderAgentTickets();
            updateAgentDetailPanel();
        } else if (view === 'admin') {
            linkAdminView.classList.add('active');
            adminView.classList.remove('hidden');
            adminView.classList.add('active');
            renderAdminTickets();
            updateAdminDetailPanel();
        } else {
            linkCustomerView.classList.add('active');
            customerView.classList.remove('hidden');
            customerView.classList.add('active');
            renderCustomerTickets();
        }
    }

    // ==========================================
    // Customer Portal Functions
    // ==========================================
    feedbackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!state.currentUser) {
            showToast("Please login to submit feedback.");
            showAuthModal('login');
            return;
        }

        const title = document.getElementById('fb-title').value.trim();
        const category = document.getElementById('fb-category').value;
        const priority = document.getElementById('fb-priority').value;
        const description = document.getElementById('fb-description').value.trim();

        const newTicket = {
            id: state.tickets.length > 0 ? Math.max(...state.tickets.map(t => t.id)) + 1 : 1,
            title: title,
            description: description,
            category: category,
            priority: priority,
            status: "CREATED",
            customer: state.currentUser.username,
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            history: [
                {
                    oldStatus: null,
                    newStatus: "CREATED",
                    notes: `Ticket created by ${state.currentUser.username}.`,
                    actionBy: state.currentUser.username,
                    timestamp: new Date().toISOString()
                }
            ]
        };

        state.tickets.push(newTicket);
        saveTickets();
        feedbackForm.reset();
        renderCustomerTickets();
        showToast(`Ticket #${newTicket.id} submitted successfully!`);
    });

    function renderCustomerTickets() {
        customerTicketsList.innerHTML = "";

        if (!state.currentUser) {
            customerTicketsList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-user-lock empty-icon"></i>
                    <p>Please login to view your submitted feedback tickets.</p>
                </div>
            `;
            return;
        }

        const customerTickets = state.tickets.filter(t => t.customer === state.currentUser.username);

        if (customerTickets.length === 0) {
            customerTicketsList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox empty-icon"></i>
                    <p>No feedback tickets submitted yet. Use the form on the left to start.</p>
                </div>
            `;
            return;
        }

        customerTickets.forEach(ticket => {
            const card = document.createElement('div');
            card.className = `ticket-card ${state.selectedTicketId === ticket.id ? 'selected' : ''}`;
            
            const catBadge = getCategoryBadgeClass(ticket.category);
            const priBadge = getPriorityBadgeClass(ticket.priority);
            const statusBadge = getStatusBadgeClass(ticket.status);

            card.innerHTML = `
                <div class="ticket-header">
                    <span class="ticket-id">#TKT-${ticket.id}</span>
                    <span class="badge ${statusBadge}">${ticket.status.replace('_', ' ')}</span>
                </div>
                <h3>${escapeHTML(ticket.title)}</h3>
                <p class="ticket-desc-snippet">${escapeHTML(ticket.description)}</p>
                <div class="ticket-footer">
                    <span class="badge ${catBadge}">${ticket.category}</span>
                    <span class="badge ${priBadge}">${ticket.priority}</span>
                </div>
            `;

            card.addEventListener('click', () => {
                state.selectedTicketId = ticket.id;
                openCustomerTicketModal(ticket);
            });

            customerTicketsList.appendChild(card);
        });
    }

    function openCustomerTicketModal(ticket) {
        custModalTicketId.textContent = `#TKT-${ticket.id}`;
        custModalTicketStatus.textContent = ticket.status.replace('_', ' ');
        custModalTicketStatus.className = `badge ${getStatusBadgeClass(ticket.status)}`;
        custModalTicketTitle.textContent = ticket.title;
        custModalTicketCategory.textContent = ticket.category;
        custModalTicketPriority.textContent = ticket.priority;
        custModalTicketAgent.textContent = ticket.assignee || "Unassigned";
        custModalTicketDesc.textContent = ticket.description;

        if (ticket.status === "RESOLVED") {
            custModalVerifyBox.classList.remove('hidden');
        } else {
            custModalVerifyBox.classList.add('hidden');
        }

        renderTimelineIntoContainer(ticket.history, custModalTimeline);
        customerTicketModal.classList.remove('hidden');
    }

    if (btnCustConfirmClose) {
        btnCustConfirmClose.addEventListener('click', () => {
            transitionTicketStatusByCustomer("CLOSED", "Fix confirmed by customer. Ticket closed.");
        });
    }

    if (btnCustReopen) {
        btnCustReopen.addEventListener('click', () => {
            transitionTicketStatusByCustomer("REOPENED", "Customer reported issue not fixed. Reopened.");
        });
    }

    function transitionTicketStatusByCustomer(targetStatus, notes) {
        if (!state.selectedTicketId) return;

        const ticketIndex = state.tickets.findIndex(t => t.id === state.selectedTicketId);
        if (ticketIndex === -1) return;

        const ticket = state.tickets[ticketIndex];
        const oldStatus = ticket.status;

        ticket.status = targetStatus;
        ticket.updatedAt = new Date().toISOString();
        ticket.history.push({
            oldStatus: oldStatus,
            newStatus: targetStatus,
            notes: notes,
            actionBy: state.currentUser ? state.currentUser.username : "Customer",
            timestamp: new Date().toISOString()
        });

        saveTickets();
        customerTicketModal.classList.add('hidden');
        showToast(`Ticket #${ticket.id} status updated to ${targetStatus}`);
        renderCustomerTickets();
    }

    // ==========================================
    // Agent Workspace Functions & Escalation
    // ==========================================
    if (agentFilterStatus) {
        agentFilterStatus.addEventListener('change', renderAgentTickets);
    }

    function renderAgentTickets() {
        agentTicketsTbody.innerHTML = "";
        
        const filterVal = agentFilterStatus ? agentFilterStatus.value : "ALL";
        const filteredTickets = state.tickets.filter(t => filterVal === "ALL" || t.status === filterVal);

        if (filteredTickets.length === 0) {
            agentTicketsTbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">
                        No tickets matching the filter in agent queue.
                    </td>
                </tr>
            `;
            return;
        }

        filteredTickets.forEach(ticket => {
            const tr = document.createElement('tr');
            if (state.selectedTicketId === ticket.id) tr.className = "selected";

            const catBadge = getCategoryBadgeClass(ticket.category);
            const priBadge = getPriorityBadgeClass(ticket.priority);
            const statusBadge = getStatusBadgeClass(ticket.status);

            tr.innerHTML = `
                <td>#${ticket.id}</td>
                <td><strong>${escapeHTML(ticket.title)}</strong></td>
                <td><span class="badge ${catBadge}">${ticket.category}</span></td>
                <td><span class="badge ${priBadge}">${ticket.priority}</span></td>
                <td><span class="badge ${statusBadge}">${ticket.status.replace('_', ' ')}</span></td>
                <td><span>${ticket.customer}</span></td>
                <td>
                    <button class="btn btn-blue btn-sm">
                        <i class="fa-solid fa-magnifying-glass"></i> Inspect
                    </button>
                </td>
            `;

            tr.addEventListener('click', () => {
                state.selectedTicketId = ticket.id;
                document.querySelectorAll('#agent-tickets-tbody tr').forEach(el => el.classList.remove('selected'));
                tr.classList.add('selected');
                updateAgentDetailPanel();
            });

            agentTicketsTbody.appendChild(tr);
        });
    }

    function updateAgentDetailPanel() {
        if (!state.selectedTicketId) {
            agentEmptyDetailMsg.classList.remove('hidden');
            agentDetailContent.classList.add('hidden');
            return;
        }

        const ticket = state.tickets.find(t => t.id === state.selectedTicketId);
        if (!ticket) return;

        agentEmptyDetailMsg.classList.add('hidden');
        agentDetailContent.classList.remove('hidden');

        agentDetailTicketId.textContent = `#TKT-${ticket.id}`;
        agentDetailTicketTitle.textContent = ticket.title;
        agentDetailTicketDesc.textContent = ticket.description;
        agentDetailTicketCategory.textContent = ticket.category;
        agentDetailTicketPriority.textContent = ticket.priority;
        agentDetailTicketCustomer.textContent = ticket.customer;

        agentDetailTicketStatus.textContent = ticket.status.replace('_', ' ');
        agentDetailTicketStatus.className = `badge ${getStatusBadgeClass(ticket.status)}`;

        agentActionStatus.value = ticket.status === "ESCALATED" ? "UNDER_REVIEW" : ticket.status;
        renderTimelineIntoContainer(ticket.history, agentTimelineList);
    }

    if (btnAgentUpdateTicket) {
        btnAgentUpdateTicket.addEventListener('click', () => {
            if (!state.selectedTicketId) return;

            const ticketIndex = state.tickets.findIndex(t => t.id === state.selectedTicketId);
            if (ticketIndex === -1) return;

            const ticket = state.tickets[ticketIndex];
            const oldStatus = ticket.status;
            const newStatus = agentActionStatus.value;
            const notes = agentActionNotes.value.trim() || `Agent update by ${state.currentUser.username}`;

            if (oldStatus === newStatus && !agentActionNotes.value.trim()) {
                showToast("No changes detected.");
                return;
            }

            ticket.status = newStatus;
            ticket.updatedAt = new Date().toISOString();
            if (!ticket.assignee) ticket.assignee = state.currentUser.username;

            ticket.history.push({
                oldStatus: oldStatus,
                newStatus: newStatus,
                notes: notes,
                actionBy: state.currentUser.username,
                timestamp: new Date().toISOString()
            });

            saveTickets();
            agentActionNotes.value = "";
            showToast(`Agent updated Ticket #${ticket.id}`);
            renderAgentTickets();
            updateAgentDetailPanel();
        });
    }

    // ESCALATE FEATURE FOR AGENTS
    if (btnAgentEscalateTicket) {
        btnAgentEscalateTicket.addEventListener('click', () => {
            if (!state.selectedTicketId) return;

            const ticketIndex = state.tickets.findIndex(t => t.id === state.selectedTicketId);
            if (ticketIndex === -1) return;

            const ticket = state.tickets[ticketIndex];
            const oldStatus = ticket.status;
            const userReason = agentActionNotes.value.trim() || "Agent requested high-priority escalation to Supervisor/Admin.";

            ticket.status = "ESCALATED";
            ticket.priority = "URGENT";
            ticket.isEscalated = true;
            ticket.updatedAt = new Date().toISOString();

            ticket.history.push({
                oldStatus: oldStatus,
                newStatus: "ESCALATED",
                notes: `⚡ ESCALATED TO SUPERVISOR: ${userReason}`,
                actionBy: state.currentUser.username,
                timestamp: new Date().toISOString()
            });

            saveTickets();
            agentActionNotes.value = "";
            showToast(`⚡ Ticket #${ticket.id} escalated to Supervisor/Admin!`);
            renderAgentTickets();
            updateAgentDetailPanel();
        });
    }

    // ==========================================
    // Admin & Supervisor Dashboard Functions
    // ==========================================
    if (adminFilterStatus) {
        adminFilterStatus.addEventListener('change', renderAdminTickets);
    }

    function renderAdminTickets() {
        adminTicketsTbody.innerHTML = "";

        // Update Stats Bar
        const total = state.tickets.length;
        const escalated = state.tickets.filter(t => t.status === "ESCALATED" || t.priority === "URGENT" || t.isEscalated).length;
        const unassigned = state.tickets.filter(t => !t.assignee).length;
        const resolved = state.tickets.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length;

        statTotalTickets.textContent = total;
        statEscalatedTickets.textContent = escalated;
        statUnassignedTickets.textContent = unassigned;
        statResolvedTickets.textContent = resolved;

        const filterVal = adminFilterStatus ? adminFilterStatus.value : "ALL";
        const filteredTickets = state.tickets.filter(t => {
            if (filterVal === "ALL") return true;
            if (filterVal === "ESCALATED") return t.status === "ESCALATED" || t.priority === "URGENT" || t.isEscalated;
            return t.status === filterVal;
        });

        if (filteredTickets.length === 0) {
            adminTicketsTbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">
                        No tickets matching administrative filter criteria.
                    </td>
                </tr>
            `;
            return;
        }

        filteredTickets.forEach(ticket => {
            const tr = document.createElement('tr');
            if (state.selectedTicketId === ticket.id) tr.className = "selected";

            const catBadge = getCategoryBadgeClass(ticket.category);
            const priBadge = getPriorityBadgeClass(ticket.priority);
            const statusBadge = getStatusBadgeClass(ticket.status);

            tr.innerHTML = `
                <td>#${ticket.id}</td>
                <td><strong>${escapeHTML(ticket.title)}</strong></td>
                <td><span class="badge ${catBadge}">${ticket.category}</span></td>
                <td><span class="badge ${priBadge}">${ticket.priority}</span></td>
                <td><span class="badge ${statusBadge}">${ticket.status.replace('_', ' ')}</span></td>
                <td><span>${ticket.assignee ? `<strong>${ticket.assignee}</strong>` : '<em>Unassigned</em>'}</span></td>
                <td>
                    <button class="btn btn-blue btn-sm">
                        <i class="fa-solid fa-sliders"></i> Manage
                    </button>
                </td>
            `;

            tr.addEventListener('click', () => {
                state.selectedTicketId = ticket.id;
                document.querySelectorAll('#admin-tickets-tbody tr').forEach(el => el.classList.remove('selected'));
                tr.classList.add('selected');
                updateAdminDetailPanel();
            });

            adminTicketsTbody.appendChild(tr);
        });
    }

    function updateAdminDetailPanel() {
        if (!state.selectedTicketId) {
            adminEmptyDetailMsg.classList.remove('hidden');
            adminDetailContent.classList.add('hidden');
            return;
        }

        const ticket = state.tickets.find(t => t.id === state.selectedTicketId);
        if (!ticket) return;

        adminEmptyDetailMsg.classList.add('hidden');
        adminDetailContent.classList.remove('hidden');

        adminDetailTicketId.textContent = `#TKT-${ticket.id}`;
        adminDetailTicketTitle.textContent = ticket.title;
        adminDetailTicketDesc.textContent = ticket.description;
        adminDetailTicketCategory.textContent = ticket.category;
        adminDetailTicketPriority.textContent = ticket.priority;
        adminDetailTicketCustomer.textContent = ticket.customer;

        adminDetailTicketStatus.textContent = ticket.status.replace('_', ' ');
        adminDetailTicketStatus.className = `badge ${getStatusBadgeClass(ticket.status)}`;

        adminActionAssignee.value = ticket.assignee || "";
        adminActionPriority.value = ticket.priority;
        adminActionStatus.value = ticket.status;

        renderTimelineIntoContainer(ticket.history, adminTimelineList);
    }

    if (btnAdminUpdateTicket) {
        btnAdminUpdateTicket.addEventListener('click', () => {
            if (!state.selectedTicketId) return;

            const ticketIndex = state.tickets.findIndex(t => t.id === state.selectedTicketId);
            if (ticketIndex === -1) return;

            const ticket = state.tickets[ticketIndex];
            const oldStatus = ticket.status;
            const newStatus = adminActionStatus.value;
            const newPriority = adminActionPriority.value;
            const newAssignee = adminActionAssignee.value || null;
            const notes = adminActionNotes.value.trim() || `Admin update by ${state.currentUser.username}`;

            ticket.status = newStatus;
            ticket.priority = newPriority;
            ticket.assignee = newAssignee;
            ticket.updatedAt = new Date().toISOString();

            ticket.history.push({
                oldStatus: oldStatus,
                newStatus: newStatus,
                notes: `Admin change (Priority: ${newPriority}, Agent: ${newAssignee || 'Unassigned'}). ${notes}`,
                actionBy: state.currentUser.username,
                timestamp: new Date().toISOString()
            });

            saveTickets();
            adminActionNotes.value = "";
            showToast(`Admin changes applied to Ticket #${ticket.id}`);
            renderAdminTickets();
            updateAdminDetailPanel();
        });
    }

    // Timeline renderer helper
    function renderTimelineIntoContainer(historyList, containerEl) {
        if (!containerEl) return;
        containerEl.innerHTML = "";
        const reversedHistory = [...historyList].reverse();

        reversedHistory.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `timeline-item status-${item.newStatus.toLowerCase().replace('_', '-')}`;
            
            const dateStr = new Date(item.timestamp).toLocaleString();
            
            itemDiv.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-meta">
                    <span class="timeline-user"><i class="fa-solid fa-user-tag"></i> ${item.actionBy}</span>
                    <span>${dateStr}</span>
                </div>
                <div class="timeline-change">
                    Status: 
                    ${item.oldStatus ? `<span class="badge ${getStatusBadgeClass(item.oldStatus)}">${item.oldStatus.replace('_', ' ')}</span> →` : ''} 
                    <span class="badge ${getStatusBadgeClass(item.newStatus)}">${item.newStatus.replace('_', ' ')}</span>
                </div>
                ${item.notes ? `<div class="timeline-notes">${escapeHTML(item.notes)}</div>` : ''}
            `;
            containerEl.appendChild(itemDiv);
        });
    }

    // Helper utilities
    function saveTickets() {
        localStorage.setItem('escavo_tickets', JSON.stringify(state.tickets));
    }

    function getCategoryBadgeClass(category) {
        switch(category) {
            case 'TECHNICAL': return 'badge-tech';
            case 'BILLING': return 'badge-billing';
            case 'PRODUCT_FEEDBACK': return 'badge-prod';
            case 'GENERAL_INQUIRY': return 'badge-general';
            default: return 'badge-other';
        }
    }

    function getPriorityBadgeClass(priority) {
        switch(priority) {
            case 'LOW': return 'badge-low';
            case 'MEDIUM': return 'badge-medium';
            case 'HIGH': return 'badge-high';
            case 'URGENT': return 'badge-urgent';
            default: return 'badge-medium';
        }
    }

    function getStatusBadgeClass(status) {
        switch(status) {
            case 'CREATED': return 'badge-created';
            case 'UNDER_REVIEW': return 'badge-review';
            case 'ASSIGNED': return 'badge-assigned';
            case 'INVESTIGATING': return 'badge-investigating';
            case 'ESCALATED': return 'badge-escalated';
            case 'RESOLVED': return 'badge-resolved';
            case 'CLOSED': return 'badge-closed';
            case 'REOPENED': return 'badge-reopened';
            default: return 'badge-created';
        }
    }

    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    const toastStyle = document.createElement('style');
    toastStyle.textContent = `
        .toast-msg {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #0f172a;
            border: 1px solid var(--primary);
            color: #fff;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.3s ease;
        }
        .toast-msg.show {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(toastStyle);

    // Initial setup
    applyRolePermissions();
    switchView('customer');

});
