// ResolveFlow Feedback & Escalation System Logic

document.addEventListener('DOMContentLoaded', () => {
    
    // Core Application State (persisted via localStorage)
    let state = {
        tickets: JSON.parse(localStorage.getItem('resolveflow_tickets')) || [],
        selectedTicketId: null,
        token: localStorage.getItem('resolveflow_token') || null,
        currentUser: JSON.parse(localStorage.getItem('resolveflow_user')) || null
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

    // DOM Elements
    const linkCustomer = document.getElementById('link-customer');
    const linkStaff = document.getElementById('link-staff');
    const customerView = document.getElementById('customer-view');
    const staffView = document.getElementById('staff-view');
    
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

    // Hero CTAs
    const heroBtnSubmit = document.getElementById('hero-btn-submit');
    const heroBtnWorkspace = document.getElementById('hero-btn-workspace');
    const brandHome = document.getElementById('brand-home');

    // Feedback DOM Elements
    const feedbackForm = document.getElementById('feedback-form');
    const customerTicketsList = document.getElementById('customer-tickets-list');
    const staffTicketsTbody = document.getElementById('staff-tickets-tbody');
    const staffFilterStatus = document.getElementById('staff-filter-status');

    // Details Panel DOM
    const detailPanel = document.getElementById('detail-panel');
    const emptyDetailMsg = document.getElementById('empty-detail-msg');
    const detailContent = document.getElementById('detail-content');
    const detailTicketId = document.getElementById('detail-ticket-id');
    const detailTicketStatus = document.getElementById('detail-ticket-status');
    const detailTicketTitle = document.getElementById('detail-ticket-title');
    const detailTicketCategory = document.getElementById('detail-ticket-category');
    const detailTicketPriority = document.getElementById('detail-ticket-priority');
    const detailTicketDate = document.getElementById('detail-ticket-date');
    const detailTicketDesc = document.getElementById('detail-ticket-desc');
    const actionAssignee = document.getElementById('action-assignee');
    const actionStatus = document.getElementById('action-status');
    const actionNotes = document.getElementById('action-notes');
    const btnUpdateTicket = document.getElementById('btn-update-ticket');
    const timelineList = document.getElementById('timeline-list');

    // Customer confirmation Action
    const customerVerifyBox = document.getElementById('customer-verify-box');
    const btnCustomerFixed = document.getElementById('btn-customer-fixed');
    const btnCustomerReopen = document.getElementById('btn-customer-reopen');

    // ==========================================
    // Authentication & Modal Triggers
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

    // Submit Login form (handles live API / Mock fallback)
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
            // Network failure fallback for initial mock testing
            console.warn("API offline, falling back to simulated session authentication");
            let role = "CUSTOMER"; // Default simulated role
            if (username.toLowerCase().includes('agent')) role = "AGENT";
            if (username.toLowerCase().includes('supervisor')) role = "SUPERVISOR";
            if (username.toLowerCase().includes('admin')) role = "ADMIN";

            handleLoginSuccess("mock-jwt-token", username, role);
            showToast(`Simulated Login: Welcome, ${username}!`);
        }
    });

    // Submit Registration form (handles live API / Mock fallback)
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
            showToast("Simulated Registration complete.");
        }
    });

    function handleLoginSuccess(token, username, role) {
        state.token = token;
        state.currentUser = { username, role };
        
        localStorage.setItem('resolveflow_token', token);
        localStorage.setItem('resolveflow_user', JSON.stringify(state.currentUser));

        hideAuthModal();
        updateAuthHeader();

        // Redirect based on role
        if (role === 'CUSTOMER') {
            switchView('customer');
        } else {
            switchView('staff');
        }
    }

    // Logout Action
    btnLogout.addEventListener('click', () => {
        state.token = null;
        state.currentUser = null;
        localStorage.removeItem('resolveflow_token');
        localStorage.removeItem('resolveflow_user');
        
        updateAuthHeader();
        switchView('customer');
        showToast("Logged out successfully.");
    });

    function updateAuthHeader() {
        if (state.currentUser) {
            navAuthActions.classList.add('hidden');
            navUserActions.classList.remove('hidden');
            currentUserLabel.textContent = `${state.currentUser.username} (${state.currentUser.role})`;
        } else {
            navAuthActions.classList.remove('hidden');
            navUserActions.classList.add('hidden');
        }
    }

    // ==========================================
    // Navigation & Workspace Switching
    // ==========================================
    brandHome.addEventListener('click', () => {
        switchView('customer');
    });

    linkCustomer.addEventListener('click', (e) => {
        e.preventDefault();
        switchView('customer');
    });

    linkStaff.addEventListener('click', (e) => {
        e.preventDefault();
        if (!state.currentUser) {
            showToast("Please Login or Sign Up to access the Staff Workspace.");
            showAuthModal('login');
            return;
        }
        if (state.currentUser.role === 'CUSTOMER') {
            showToast("Access Denied: Only staff roles (Agent, Supervisor, Admin) can access the workspace.");
            return;
        }
        switchView('staff');
    });

    // Hero buttons triggers
    heroBtnSubmit.addEventListener('click', () => {
        if (!state.currentUser) {
            showToast("Please sign in to submit feedback tickets.");
            showAuthModal('login');
            return;
        }
        document.getElementById('fb-title').focus();
    });

    heroBtnWorkspace.addEventListener('click', () => {
        if (!state.currentUser) {
            showToast("Please sign in to access the queue.");
            showAuthModal('login');
            return;
        }
        if (state.currentUser.role === 'CUSTOMER') {
            showToast("Access Denied: Customer accounts cannot inspect staff queues.");
            return;
        }
        switchView('staff');
    });

    function switchView(view) {
        state.selectedTicketId = null;
        updateDetailPanel();
        
        if (view === 'customer') {
            linkCustomer.classList.add('active');
            linkStaff.classList.remove('active');
            customerView.classList.add('active');
            staffView.classList.remove('active');
            renderCustomerTickets();
        } else {
            linkStaff.classList.add('active');
            linkCustomer.classList.remove('active');
            staffView.classList.add('active');
            customerView.classList.remove('active');
            renderStaffTickets();
        }
    }

    // ==========================================
    // Submit Feedback Ticket
    // ==========================================
    feedbackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!state.currentUser) {
            showToast("Please log in to submit a ticket.");
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

    // ==========================================
    // Save Changes & Update Status (Staff Actions)
    // ==========================================
    btnUpdateTicket.addEventListener('click', () => {
        if (!state.selectedTicketId) return;

        const ticketIndex = state.tickets.findIndex(t => t.id === state.selectedTicketId);
        if (ticketIndex === -1) return;

        const ticket = state.tickets[ticketIndex];
        const oldStatus = ticket.status;
        const newStatus = actionStatus.value;
        const newAssignee = actionAssignee.value || null;
        const notes = actionNotes.value.trim() || `Status updated by ${state.currentUser.username}.`;

        const statusChanged = oldStatus !== newStatus;
        const assigneeChanged = ticket.assignee !== newAssignee;

        if (!statusChanged && !assigneeChanged) {
            showToast("No changes detected.");
            return;
        }

        // Update Properties
        ticket.status = newStatus;
        ticket.assignee = newAssignee;
        ticket.updatedAt = new Date().toISOString();

        // History Log
        ticket.history.push({
            oldStatus: oldStatus,
            newStatus: newStatus,
            notes: notes + (assigneeChanged ? ` (Assignee: ${newAssignee || 'Unassigned'})` : ''),
            actionBy: state.currentUser.username,
            timestamp: new Date().toISOString()
        });

        saveTickets();
        actionNotes.value = "";
        showToast(`Workflow updated for Ticket #${ticket.id}`);

        if (linkStaff.classList.contains('active')) {
            renderStaffTickets();
        } else {
            renderCustomerTickets();
        }
        updateDetailPanel();
    });

    // ==========================================
    // Customer Actions (Confirm Resolution / Reopen)
    // ==========================================
    btnCustomerFixed.addEventListener('click', () => {
        transitionTicketStatusByCustomer("CLOSED", "Fix confirmed by customer. Closed.");
    });

    btnCustomerReopen.addEventListener('click', () => {
        transitionTicketStatusByCustomer("REOPENED", "Customer reported issue is not resolved. Reopened.");
    });

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
        showToast(`Status updated to ${targetStatus}`);

        if (linkCustomer.classList.contains('active')) {
            renderCustomerTickets();
        } else {
            renderStaffTickets();
        }
        updateDetailPanel();
    }

    // ==========================================
    // Rendering Functions
    // ==========================================
    function renderCustomerTickets() {
        customerTicketsList.innerHTML = "";

        if (!state.currentUser) {
            customerTicketsList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-user-lock empty-icon"></i>
                    <p>Please login to view your feedback tickets.</p>
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
                document.querySelectorAll('.ticket-card').forEach(el => el.classList.remove('selected'));
                card.classList.add('selected');
                updateDetailPanel();
            });

            customerTicketsList.appendChild(card);
        });
    }

    function renderStaffTickets() {
        staffTicketsTbody.innerHTML = "";
        
        const filterVal = staffFilterStatus.value;
        const filteredTickets = state.tickets.filter(t => filterVal === "ALL" || t.status === filterVal);

        if (filteredTickets.length === 0) {
            staffTicketsTbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">
                        No tickets matching the filter in the queue.
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
                <td><span>${ticket.assignee || '<em>Unassigned</em>'}</span></td>
                <td>
                    <button class="btn btn-blue btn-sm">
                        <i class="fa-solid fa-magnifying-glass"></i> Inspect
                    </button>
                </td>
            `;

            tr.addEventListener('click', () => {
                state.selectedTicketId = ticket.id;
                document.querySelectorAll('#staff-tickets-tbody tr').forEach(el => el.classList.remove('selected'));
                tr.classList.add('selected');
                updateDetailPanel();
            });

            staffTicketsTbody.appendChild(tr);
        });
    }

    function updateDetailPanel() {
        if (!state.selectedTicketId) {
            emptyDetailMsg.classList.remove('hidden');
            detailContent.classList.add('hidden');
            return;
        }

        const ticket = state.tickets.find(t => t.id === state.selectedTicketId);
        if (!ticket) return;

        emptyDetailMsg.classList.add('hidden');
        detailContent.classList.remove('hidden');

        detailTicketId.textContent = `#TKT-${ticket.id}`;
        detailTicketTitle.textContent = ticket.title;
        detailTicketDesc.textContent = ticket.description;
        detailTicketCategory.textContent = ticket.category;
        detailTicketPriority.textContent = ticket.priority;
        detailTicketDate.textContent = new Date(ticket.createdAt).toLocaleString();

        detailTicketStatus.textContent = ticket.status.replace('_', ' ');
        detailTicketStatus.className = `badge ${getStatusBadgeClass(ticket.status)}`;

        actionStatus.value = ticket.status;
        actionAssignee.value = ticket.assignee || "";

        // Check if verify panel should show
        if (ticket.status === "RESOLVED") {
            customerVerifyBox.classList.remove('hidden');
        } else {
            customerVerifyBox.classList.add('hidden');
        }

        renderTimeline(ticket.history);
    }

    function renderTimeline(historyList) {
        timelineList.innerHTML = "";
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
            timelineList.appendChild(itemDiv);
        });
    }

    // ==========================================
    // Filter trigger
    // ==========================================
    staffFilterStatus.addEventListener('change', () => {
        renderStaffTickets();
    });

    // ==========================================
    // Helper utilities
    // ==========================================
    function saveTickets() {
        localStorage.setItem('resolveflow_tickets', JSON.stringify(state.tickets));
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

    // Initial setups
    updateAuthHeader();
    renderCustomerTickets();

});
