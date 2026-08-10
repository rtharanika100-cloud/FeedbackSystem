// ResolveFlow Feedback & Escalation System Logic

document.addEventListener('DOMContentLoaded', () => {
    
    // Core Application State (using localStorage to persist changes)
    let state = {
        tickets: JSON.parse(localStorage.getItem('resolveflow_tickets')) || [],
        selectedTicketId: null,
        currentUser: {
            username: localStorage.getItem('resolveflow_username') || null,
            role: localStorage.getItem('resolveflow_role') || null,
            token: localStorage.getItem('resolveflow_token') || null
        }
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
                customer: "Customer Alice",
                assignee: null,
                createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
                updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
                history: [
                    {
                        oldStatus: null,
                        newStatus: "CREATED",
                        notes: "Feedback ticket submitted by Customer Alice.",
                        actionBy: "Customer Alice",
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
                customer: "Bob Roberts",
                assignee: "Agent Smith",
                createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 24 hours ago
                updatedAt: new Date(Date.now() - 3600000 * 22).toISOString(),
                history: [
                    {
                        oldStatus: null,
                        newStatus: "CREATED",
                        notes: "Ticket created by Bob Roberts.",
                        actionBy: "Bob Roberts",
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
        saveState();
    }

    // DOM Elements
    const btnCustomerView = document.getElementById('btn-customer-view');
    const btnStaffView = document.getElementById('btn-staff-view');
    const customerView = document.getElementById('customer-view');
    const staffView = document.getElementById('staff-view');
    const feedbackForm = document.getElementById('feedback-form');
    const customerTicketsList = document.getElementById('customer-tickets-list');
    const staffTicketsTbody = document.getElementById('staff-tickets-tbody');
    const staffFilterStatus = document.getElementById('staff-filter-status');
    
    // Detailed Panel DOM
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

    // Customer Actions in Inspect panel
    const customerVerifyBox = document.getElementById('customer-verify-box');
    const btnCustomerFixed = document.getElementById('btn-customer-fixed');
    const btnCustomerReopen = document.getElementById('btn-customer-reopen');

    // ==========================================
    // View Switch Navigation
    // ==========================================
    btnCustomerView.addEventListener('click', () => {
        btnCustomerView.classList.add('active');
        btnStaffView.classList.remove('active');
        customerView.classList.add('active');
        staffView.classList.remove('active');
        state.selectedTicketId = null;
        updateDetailPanel();
        renderCustomerTickets();
    });

    btnStaffView.addEventListener('click', () => {
        if (!state.currentUser.token) {
            showToast("Please log in first!");
            showAuthModal();
            return;
        }
        if (state.currentUser.role === 'CUSTOMER') {
            showToast("Access Denied: Customers cannot access Staff Workspace!");
            return;
        }
        btnStaffView.classList.add('active');
        btnCustomerView.classList.remove('active');
        staffView.classList.add('active');
        customerView.classList.remove('active');
        state.selectedTicketId = null;
        updateDetailPanel();
        renderStaffTickets();
    });

    // ==========================================
    // Form Submission
    // ==========================================
    feedbackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
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
                    notes: "Feedback ticket submitted successfully by Customer Alice.",
                    actionBy: state.currentUser.username,
                    timestamp: new Date().toISOString()
                }
            ]
        };

        state.tickets.push(newTicket);
        saveState();
        feedbackForm.reset();
        renderCustomerTickets();

        // Toast/Notification mock alert
        showToast("Ticket #" + newTicket.id + " submitted successfully!");
    });

    // ==========================================
    // Update Workflow Status & Assignee
    // ==========================================
    btnUpdateTicket.addEventListener('click', () => {
        if (!state.selectedTicketId) return;

        const ticketIndex = state.tickets.findIndex(t => t.id === state.selectedTicketId);
        if (ticketIndex === -1) return;

        const ticket = state.tickets[ticketIndex];
        const oldStatus = ticket.status;
        const newStatus = actionStatus.value;
        const newAssignee = actionAssignee.value || null;
        const notes = actionNotes.value.trim() || `Workflow update by ${state.currentUser.username}.`;

        // Check if anything changed
        const statusChanged = oldStatus !== newStatus;
        const assigneeChanged = ticket.assignee !== newAssignee;

        if (!statusChanged && !assigneeChanged) {
            showToast("No changes selected.");
            return;
        }

        // Update properties
        ticket.status = newStatus;
        ticket.assignee = newAssignee;
        ticket.updatedAt = new Date().toISOString();

        // Append to history log
        ticket.history.push({
            oldStatus: oldStatus,
            newStatus: newStatus,
            notes: notes + (assigneeChanged ? ` (Assignee updated to: ${newAssignee || 'Unassigned'})` : ''),
            actionBy: state.currentUser.username,
            timestamp: new Date().toISOString()
        });

        saveState();
        actionNotes.value = "";
        showToast("Workflow ticket #" + ticket.id + " updated.");

        if (btnStaffView.classList.contains('active')) {
            renderStaffTickets();
        } else {
            renderCustomerTickets();
        }
        updateDetailPanel();
    });

    // ==========================================
    // Customer Action buttons (Verify Fix / Reopen)
    // ==========================================
    btnCustomerFixed.addEventListener('click', () => {
        transitionTicketStatusByCustomer("CLOSED", "Customer confirmed the issue is fixed. Ticket closed.");
    });

    btnCustomerReopen.addEventListener('click', () => {
        transitionTicketStatusByCustomer("REOPENED", "Customer reported the issue is not fixed. Reopening for investigation.");
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
            actionBy: "Customer Alice", // Simulated Customer Action
            timestamp: new Date().toISOString()
        });

        saveState();
        showToast(`Ticket status updated to ${targetStatus}`);
        
        if (btnCustomerView.classList.contains('active')) {
            renderCustomerTickets();
        } else {
            renderStaffTickets();
        }
        updateDetailPanel();
    }

    // ==========================================
    // Render Functions
    // ==========================================
    function renderCustomerTickets() {
        customerTicketsList.innerHTML = "";
        
        // Show only tickets created by "Customer Alice" or mock customer
        const customerTickets = state.tickets.filter(t => t.customer === "Customer Alice");

        if (customerTickets.length === 0) {
            customerTicketsList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox empty-icon"></i>
                    <p>No feedback submitted yet. Use the form on the left to start.</p>
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
                // Add select class to DOM elements
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
                        No tickets matching the filter criteria found in the queue.
                    </td>
                </tr>
            `;
            return;
        }

        filteredTickets.forEach(ticket => {
            const tr = document.createElement('tr');
            if (state.selectedTicketId === ticket.id) {
                tr.className = "selected";
            }

            const catBadge = getCategoryBadgeClass(ticket.category);
            const priBadge = getPriorityBadgeClass(ticket.priority);
            const statusBadge = getStatusBadgeClass(ticket.status);

            tr.innerHTML = `
                <td>#${ticket.id}</td>
                <td><strong>${escapeHTML(ticket.title)}</strong></td>
                <td><span class="badge ${catBadge}">${ticket.category}</span></td>
                <td><span class="badge ${priBadge}">${ticket.priority}</span></td>
                <td><span class="badge ${statusBadge}">${ticket.status.replace('_', ' ')}</span></td>
                <td><span class="assignee-text">${ticket.assignee || '<em>Unassigned</em>'}</span></td>
                <td>
                    <button class="btn btn-primary btn-sm inspect-btn">
                        <i class="fa-solid fa-magnifying-glass"></i> Inspect
                    </button>
                </td>
            `;

            // Click table row to inspect
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

        // Text mappings
        detailTicketId.textContent = `#TKT-${ticket.id}`;
        detailTicketTitle.textContent = ticket.title;
        detailTicketDesc.textContent = ticket.description;
        detailTicketCategory.textContent = ticket.category;
        detailTicketPriority.textContent = ticket.priority;
        detailTicketDate.textContent = new Date(ticket.createdAt).toLocaleString();

        // Status Badge Mapping
        detailTicketStatus.textContent = ticket.status.replace('_', ' ');
        detailTicketStatus.className = `badge ${getStatusBadgeClass(ticket.status)}`;

        // Dropdowns setup
        actionStatus.value = ticket.status;
        actionAssignee.value = ticket.assignee || "";

        // Verify Box: only visible for Customers when status is RESOLVED
        // (For testing purposes, we also display it in staff view to easily test the Customer confirmation action)
        if (ticket.status === "RESOLVED") {
            customerVerifyBox.classList.remove('hidden');
        } else {
            customerVerifyBox.classList.add('hidden');
        }

        // Render timeline history
        renderTimeline(ticket.history);
    }

    function renderTimeline(historyList) {
        timelineList.innerHTML = "";
        
        // Reverse array to show most recent action on top
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
    // Helpers
    // ==========================================
    function saveState() {
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
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Inject Toast styling inline to keep styles file neat
    const toastStyle = document.createElement('style');
    toastStyle.textContent = `
        .toast-msg {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: rgba(15, 17, 28, 0.9);
            border: 1px solid var(--primary);
            color: #fff;
            padding: 12px 24px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
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

    // ==========================================
    // Authentication & Session Management
    // ==========================================
    const authModal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const toggleToRegister = document.getElementById('toggle-to-register');
    const toggleToLogin = document.getElementById('toggle-to-login');
    const authErrorMsg = document.getElementById('auth-error-message');
    const authSubtitle = document.getElementById('auth-subtitle');
    
    const userDisplayName = document.getElementById('user-display-name');
    const userDisplayRole = document.getElementById('user-display-role');
    const btnLogout = document.getElementById('btn-logout');

    function showAuthModal() {
        authModal.classList.remove('hidden');
        authModal.style.display = 'flex';
        loginForm.reset();
        registerForm.reset();
        authErrorMsg.classList.add('hidden');
        showLoginForm();
    }

    function hideAuthModal() {
        authModal.classList.add('hidden');
        authModal.style.display = 'none';
    }

    function showLoginForm() {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        authSubtitle.textContent = "Login to access your workspace";
    }

    function showRegisterForm() {
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        authSubtitle.textContent = "Create an account to submit or manage feedback";
    }

    toggleToRegister.addEventListener('click', showRegisterForm);
    toggleToLogin.addEventListener('click', showLoginForm);

    function updateHeaderUI() {
        if (state.currentUser.token) {
            userDisplayName.textContent = state.currentUser.username;
            userDisplayRole.textContent = state.currentUser.role;
            userDisplayRole.className = `user-role-badge role-${state.currentUser.role.toLowerCase()}`;
            btnLogout.classList.remove('hidden');
            
            if (state.currentUser.role === 'CUSTOMER') {
                btnStaffView.style.opacity = '0.5';
                btnStaffView.title = 'Access Denied: Only support staff can enter this workspace';
            } else {
                btnStaffView.style.opacity = '1';
                btnStaffView.removeAttribute('title');
            }
        } else {
            userDisplayName.textContent = "Guest";
            userDisplayRole.textContent = "GUEST";
            userDisplayRole.className = "user-role-badge";
            btnLogout.classList.add('hidden');
        }
    }

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authErrorMsg.classList.add('hidden');
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const errMsg = await response.text();
                throw new Error(errMsg || "Invalid credentials. Please try again.");
            }

            const data = await response.json();
            loginSession(data);
        } catch (error) {
            authErrorMsg.textContent = error.message;
            authErrorMsg.classList.remove('hidden');
        }
    });

    // Handle Register
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authErrorMsg.classList.add('hidden');
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const role = document.getElementById('register-role').value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, role })
            });

            if (!response.ok) {
                const errMsg = await response.text();
                throw new Error(errMsg || "Registration failed. Try a different username/email.");
            }

            const data = await response.json();
            loginSession(data);
        } catch (error) {
            authErrorMsg.textContent = error.message;
            authErrorMsg.classList.remove('hidden');
        }
    });

    function loginSession(data) {
        state.currentUser = {
            username: data.username,
            role: data.role,
            token: data.token
        };
        localStorage.setItem('resolveflow_username', data.username);
        localStorage.setItem('resolveflow_role', data.role);
        localStorage.setItem('resolveflow_token', data.token);

        hideAuthModal();
        updateHeaderUI();
        showToast(`Welcome back, ${data.username}!`);

        if (data.role === 'CUSTOMER') {
            btnCustomerView.click();
        } else {
            btnStaffView.click();
        }
    }

    btnLogout.addEventListener('click', () => {
        state.currentUser = { username: null, role: null, token: null };
        localStorage.removeItem('resolveflow_username');
        localStorage.removeItem('resolveflow_role');
        localStorage.removeItem('resolveflow_token');
        updateHeaderUI();
        showAuthModal();
        showToast("Logged out successfully.");
    });

    // Initialize application view state
    function initApp() {
        if (state.currentUser.token) {
            hideAuthModal();
            updateHeaderUI();
            if (state.currentUser.role === 'CUSTOMER') {
                btnCustomerView.click();
            } else {
                btnStaffView.click();
            }
        } else {
            showAuthModal();
            updateHeaderUI();
            renderCustomerTickets();
        }
    }

    initApp();

});
