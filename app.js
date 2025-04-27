// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA5h26hiZRX2WA3tRCjUY2NlA6rnRV0E24",
  authDomain: "namozag-3b281.firebaseapp.com",
  databaseURL: "https://namozag-3b281-default-rtdb.firebaseio.com",
  projectId: "namozag-3b281",
  storageBucket: "namozag-3b281.firebasestorage.app",
  messagingSenderId: "183249580094",
  appId: "1:183249580094:web:af1070013478332698616f",
  measurementId: "G-CE1RNHKMQG"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');
const isAdminCheckbox = document.getElementById('isAdmin');

// Navigation
const newRequestLink = document.getElementById('new-request-link');
const myRequestsLink = document.getElementById('my-requests-link');
const allRequestsLink = document.getElementById('all-requests-link');
const adminRequestsItem = document.getElementById('admin-requests-item');

// Sections
const newRequestSection = document.getElementById('new-request-section');
const myRequestsSection = document.getElementById('my-requests-section');
const allRequestsSection = document.getElementById('all-requests-section');

// Forms
const purchaseRequestForm = document.getElementById('purchase-request-form');
const itemsContainer = document.getElementById('items-container');
const addItemBtn = document.getElementById('add-item');

// Tables
const myRequestsTable = document.getElementById('my-requests-table');
const allRequestsTable = document.getElementById('all-requests-table');

// Modals
const requestDetailsModal = new bootstrap.Modal(document.getElementById('requestDetailsModal'));
const declineReasonModal = new bootstrap.Modal(document.getElementById('declineReasonModal'));
const requestDetailsContent = document.getElementById('request-details-content');

// Modal buttons
const modalApproveBtn = document.getElementById('modal-approve-btn');
const modalDeclineBtn = document.getElementById('modal-decline-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const submitDeclineBtn = document.getElementById('submit-decline');
const declineReasonText = document.getElementById('decline-reason-text');

// Notification toast
const notificationToast = new bootstrap.Toast(document.getElementById('notification-toast'));
const toastTitle = document.getElementById('toast-title');
const toastMessage = document.getElementById('toast-message');

// Global variables
let currentUser = null;
let isAdmin = false;
let currentRequestId = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // Event listeners
    authForm.addEventListener('submit', handleAuth);
    registerBtn.addEventListener('click', handleRegister);
    logoutBtn.addEventListener('click', handleLogout);
    newRequestLink.addEventListener('click', showNewRequestSection);
    myRequestsLink.addEventListener('click', showMyRequestsSection);
    allRequestsLink.addEventListener('click', showAllRequestsSection);
    purchaseRequestForm.addEventListener('submit', submitPurchaseRequest);
    addItemBtn.addEventListener('click', addItemRow);
    modalApproveBtn.addEventListener('click', approveRequest);
    modalDeclineBtn.addEventListener('click', showDeclineReasonModal);
    modalCancelBtn.addEventListener('click', cancelRequest);
    submitDeclineBtn.addEventListener('click', submitDecline);

    // Add first item row
    addItemRow();

    // Auth state listener
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            userEmailSpan.textContent = user.email;
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            
            // Check if user is admin
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    isAdmin = doc.data().isAdmin;
                    if (isAdmin) {
                        adminRequestsItem.style.display = 'block';
                        showAllRequestsSection();
                    } else {
                        adminRequestsItem.style.display = 'none';
                        showNewRequestSection();
                    }
                }
            });
            
            // Setup real-time listeners
            setupRealTimeListeners();
        } else {
            currentUser = null;
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
        }
    });
}

// Authentication functions
function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => showNotification('Success', 'Logged in successfully'))
        .catch(error => showNotification('Error', error.message));
}

function handleRegister() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const isAdmin = document.getElementById('isAdmin').checked;
    
    if (!email || !password) {
        showNotification('Error', 'Please enter email and password');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            return db.collection('users').doc(userCredential.user.uid).set({
                email: email,
                isAdmin: isAdmin,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => showNotification('Success', 'Account created successfully'))
        .catch(error => showNotification('Error', error.message));
}

function handleLogout() {
    auth.signOut()
        .then(() => showNotification('Success', 'Logged out successfully'))
        .catch(error => showNotification('Error', error.message));
}

// Navigation functions
function showNewRequestSection(e) {
    if (e) e.preventDefault();
    newRequestSection.style.display = 'block';
    myRequestsSection.style.display = 'none';
    allRequestsSection.style.display = 'none';
    
    // Reset form and add first item
    purchaseRequestForm.reset();
    itemsContainer.innerHTML = '';
    addItemRow();
}

function showMyRequestsSection(e) {
    if (e) e.preventDefault();
    newRequestSection.style.display = 'none';
    myRequestsSection.style.display = 'block';
    allRequestsSection.style.display = 'none';
    loadMyRequests();
}

function showAllRequestsSection(e) {
    if (e) e.preventDefault();
    newRequestSection.style.display = 'none';
    myRequestsSection.style.display = 'none';
    allRequestsSection.style.display = 'block';
    if (isAdmin) loadAllRequests();
}

// Request form functions
function addItemRow() {
    const row = document.createElement('div');
    row.className = 'item-row row';
    row.innerHTML = `
        <div class="col-md-3">
            <input type="number" class="form-control quantity" step="0.001" value="1" placeholder="Quantity" required>
        </div>
        <div class="col-md-3">
            <input type="text" class="form-control units" value="pcs" placeholder="Units" required>
        </div>
        <div class="col-md-5">
            <input type="text" class="form-control item-name" placeholder="Item name" required>
        </div>
        <div class="col-md-1 d-flex align-items-center">
            <button type="button" class="btn btn-danger btn-sm remove-item">X</button>
        </div>
    `;
    
    itemsContainer.appendChild(row);
    
    // Add remove event listener
    row.querySelector('.remove-item').addEventListener('click', () => {
        if (itemsContainer.children.length > 1) {
            row.remove();
        } else {
            showNotification('Info', 'You need at least one item');
        }
    });
}

function submitPurchaseRequest(e) {
    e.preventDefault();
    
    const workerName = document.getElementById('worker-name').value.trim();
    const projectName = document.getElementById('project-name').value.trim();
    
    // Validate inputs
    if (!workerName || !projectName) {
        showNotification('Error', 'Please fill in all fields');
        return;
    }
    
    // Collect items
    const items = [];
    const itemRows = itemsContainer.querySelectorAll('.item-row');
    
    itemRows.forEach(row => {
        const quantity = parseFloat(row.querySelector('.quantity').value);
        const units = row.querySelector('.units').value.trim();
        const name = row.querySelector('.item-name').value.trim();
        
        if (!name || isNaN(quantity)) {
            showNotification('Error', 'Please fill in all item fields correctly');
            throw new Error('Invalid item data');
        }
        
        items.push({ quantity, units, name });
    });
    
    // Create request
    const request = {
        workerName,
        workerEmail: currentUser.email,
        projectName,
        items,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Save to Firestore
    db.collection('purchaseRequests').add(request)
        .then(() => {
            showNotification('Success', 'Request submitted successfully');
            purchaseRequestForm.reset();
            itemsContainer.innerHTML = '';
            addItemRow();
            showMyRequestsSection();
            
            // Notify admins
            if (!isAdmin) notifyAdmins(workerName);
        })
        .catch(error => showNotification('Error', 'Failed to submit request: ' + error.message));
}

function notifyAdmins(workerName) {
    db.collection('users').where('isAdmin', '==', true).get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                db.collection('notifications').add({
                    userId: doc.id,
                    message: `New request from ${workerName}`,
                    type: 'new_request',
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        });
}

// Request management functions
function loadMyRequests() {
    myRequestsTable.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
    
    db.collection('purchaseRequests')
        .where('workerEmail', '==', currentUser.email)
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                myRequestsTable.innerHTML = '<tr><td colspan="5" class="text-center">No requests found</td></tr>';
                return;
            }
            
            myRequestsTable.innerHTML = '';
            snapshot.forEach(doc => {
                const request = doc.data();
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${request.createdAt.toDate().toLocaleString()}</td>
                    <td>${request.projectName}</td>
                    <td>${request.items.length} items</td>
                    <td class="status-${request.status}">${request.status}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-details" data-id="${doc.id}">View</button>
                        ${request.status === 'pending' ? 
                            `<button class="btn btn-sm btn-warning cancel-request" data-id="${doc.id}">Cancel</button>` : ''}
                    </td>
                `;
                myRequestsTable.appendChild(row);
                
                // Add event listeners
                row.querySelector('.view-details').addEventListener('click', () => viewRequestDetails(doc.id));
                const cancelBtn = row.querySelector('.cancel-request');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        cancelRequest(doc.id);
                    });
                }
            });
        })
        .catch(error => {
            showNotification('Error', 'Failed to load requests: ' + error.message);
            myRequestsTable.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading requests</td></tr>';
        });
}

function loadAllRequests() {
    allRequestsTable.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
    
    db.collection('purchaseRequests')
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                allRequestsTable.innerHTML = '<tr><td colspan="6" class="text-center">No requests found</td></tr>';
                return;
            }
            
            allRequestsTable.innerHTML = '';
            snapshot.forEach(doc => {
                const request = doc.data();
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${request.createdAt.toDate().toLocaleString()}</td>
                    <td>${request.workerName} (${request.workerEmail})</td>
                    <td>${request.projectName}</td>
                    <td>${request.items.length} items</td>
                    <td class="status-${request.status}">${request.status}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-details" data-id="${doc.id}">View</button>
                        ${request.status === 'pending' ? 
                            `<button class="btn btn-sm btn-warning process-request" data-id="${doc.id}">Process</button>` : ''}
                    </td>
                `;
                allRequestsTable.appendChild(row);
                
                // Add event listeners
                row.querySelector('.view-details').addEventListener('click', () => viewRequestDetails(doc.id));
                const processBtn = row.querySelector('.process-request');
                if (processBtn) {
                    processBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        currentRequestId = doc.id;
                        viewRequestDetails(doc.id);
                        requestDetailsModal.show();
                    });
                }
            });
        })
        .catch(error => {
            showNotification('Error', 'Failed to load requests: ' + error.message);
            allRequestsTable.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading requests</td></tr>';
        });
}

function viewRequestDetails(requestId) {
    db.collection('purchaseRequests').doc(requestId).get()
        .then(doc => {
            if (!doc.exists) {
                showNotification('Error', 'Request not found');
                return;
            }
            
            const request = doc.data();
            currentRequestId = requestId;
            
            // Show/hide buttons based on user role and request status
            document.getElementById('admin-actions').style.display = isAdmin ? 'block' : 'none';
            
            const cancelBtn = document.getElementById('modal-cancel-btn');
            if (!isAdmin && request.workerEmail === currentUser.email && request.status === 'pending') {
                cancelBtn.style.display = 'block';
            } else {
                cancelBtn.style.display = 'none';
            }
            
            // Build details HTML
            let itemsHtml = '<table class="table table-sm"><thead><tr><th>Qty</th><th>Units</th><th>Item</th></tr></thead><tbody>';
            request.items.forEach(item => {
                itemsHtml += `<tr><td>${item.quantity}</td><td>${item.units}</td><td>${item.name}</td></tr>`;
            });
            itemsHtml += '</tbody></table>';
            
            let detailsHtml = `
                <h5>Request from ${request.workerName}</h5>
                <p><strong>Project:</strong> ${request.projectName}</p>
                <p><strong>Submitted:</strong> ${request.createdAt.toDate().toLocaleString()}</p>
                <p><strong>Status:</strong> <span class="status-${request.status}">${request.status}</span></p>
                
                <h5 class="mt-4">Items</h5>
                ${itemsHtml}
            `;
            
            if (request.status === 'declined' && request.declineReason) {
                detailsHtml += `
                    <div class="alert alert-danger mt-3">
                        <h6>Decline Reason</h6>
                        <p>${request.declineReason}</p>
                    </div>
                `;
            } else if (request.status === 'canceled' && request.cancelReason) {
                detailsHtml += `
                    <div class="alert alert-warning mt-3">
                        <h6>Cancel Reason</h6>
                        <p>${request.cancelReason}</p>
                    </div>
                `;
            }
            
            requestDetailsContent.innerHTML = detailsHtml;
            requestDetailsModal.show();
        })
        .catch(error => showNotification('Error', 'Failed to load request: ' + error.message));
}

function approveRequest() {
    // Generate Excel file
    db.collection('purchaseRequests').doc(currentRequestId).get()
        .then(doc => {
            if (!doc.exists) throw new Error('Request not found');
            
            const request = doc.data();
            const excelData = [
                ['Purchase Order'],
                ['Requester:', request.workerName],
                ['Project:', request.projectName],
                ['Date:', new Date().toLocaleDateString()],
                [],
                ['Quantity', 'Units', 'Item Name']
            ];
            
            request.items.forEach(item => {
                excelData.push([item.quantity, item.units, item.name]);
            });
            
            // Create worksheet and workbook
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Purchase Order");
            
            // Generate file
            XLSX.writeFile(wb, `Purchase_Order_${currentRequestId}.xlsx`);
            
            // Update request status
            return db.collection('purchaseRequests').doc(currentRequestId).update({
                status: 'approved',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            // Notify worker
            db.collection('purchaseRequests').doc(currentRequestId).get()
                .then(doc => {
                    const request = doc.data();
                    
                    db.collection('notifications').add({
                        userId: currentUser.uid,
                        message: `Your request for ${request.projectName} has been approved`,
                        type: 'request_update',
                        read: false,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Open email client
                    const subject = encodeURIComponent(`Purchase Order Approved - ${request.projectName}`);
                    const body = encodeURIComponent(`Dear ${request.workerName},\n\nYour purchase request for project "${request.projectName}" has been approved.\n\nPlease find the attached purchase order.\n\nRegards,\nPurchase Team`);
                    window.open(`mailto:${request.workerEmail}?subject=${subject}&body=${body}`);
                });
            
            requestDetailsModal.hide();
            showNotification('Success', 'Request approved and Excel file downloaded');
            loadAllRequests();
        })
        .catch(error => showNotification('Error', 'Failed to approve request: ' + error.message));
}

function showDeclineReasonModal() {
    declineReasonText.value = '';
    declineReasonModal.show();
}

function submitDecline() {
    const reason = declineReasonText.value.trim();
    
    if (!reason) {
        showNotification('Error', 'Please enter a reason for declining');
        return;
    }
    
    db.collection('purchaseRequests').doc(currentRequestId).update({
        status: 'declined',
        declineReason: reason,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        // Notify worker
        db.collection('purchaseRequests').doc(currentRequestId).get()
            .then(doc => {
                const request = doc.data();
                
                db.collection('notifications').add({
                    userId: currentUser.uid,
                    message: `Your request for ${request.projectName} has been declined`,
                    type: 'request_update',
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Open email client
                const subject = encodeURIComponent(`Purchase Order Declined - ${request.projectName}`);
                const body = encodeURIComponent(`Dear ${request.workerName},\n\nYour purchase request for project "${request.projectName}" has been declined.\n\nReason: ${reason}\n\nRegards,\nPurchase Team`);
                window.open(`mailto:${request.workerEmail}?subject=${subject}&body=${body}`);
            });
        
        declineReasonModal.hide();
        requestDetailsModal.hide();
        showNotification('Success', 'Request declined and worker notified');
        loadAllRequests();
    })
    .catch(error => showNotification('Error', 'Failed to decline request: ' + error.message));
}

function cancelRequest() {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    
    db.collection('purchaseRequests').doc(currentRequestId).update({
        status: 'canceled',
        cancelReason: 'Canceled by requester',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        requestDetailsModal.hide();
        showNotification('Success', 'Request canceled successfully');
        loadMyRequests();
    })
    .catch(error => showNotification('Error', 'Failed to cancel request: ' + error.message));
}

// Notification functions
function setupRealTimeListeners() {
    // Worker notifications
    if (!isAdmin) {
        db.collection('notifications')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added' && !change.doc.data().read) {
                        const notification = change.doc.data();
                        showNotification('Notification', notification.message);
                        change.doc.ref.update({ read: true });
                    }
                });
            });
    }
    
    // Admin notifications for new requests
    if (isAdmin) {
        db.collection('notifications')
            .where('userId', '==', currentUser.uid)
            .where('type', '==', 'new_request')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added' && !change.doc.data().read) {
                        const notification = change.doc.data();
                        showNotification('New Request', notification.message);
                        change.doc.ref.update({ read: true });
                    }
                });
            });
    }
}

function showNotification(title, message) {
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    notificationToast.show();
}
