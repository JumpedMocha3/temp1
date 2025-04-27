// Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
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

// Navigation links
const newRequestLink = document.getElementById('new-request-link');
const myRequestsLink = document.getElementById('my-requests-link');
const allRequestsLink = document.getElementById('all-requests-link');
const adminRequestsItem = document.getElementById('admin-requests-item');

// Sections
const newRequestSection = document.getElementById('new-request-section');
const myRequestsSection = document.getElementById('my-requests-section');
const allRequestsSection = document.getElementById('all-requests-section');

// Request form elements
const purchaseRequestForm = document.getElementById('purchase-request-form');
const itemsContainer = document.getElementById('items-container');
const addItemBtn = document.getElementById('add-item');

// Tables
const myRequestsTable = document.getElementById('my-requests-table');
const allRequestsTable = document.getElementById('all-requests-table');

// Modals
const requestDetailsModal = new bootstrap.Modal(document.getElementById('requestDetailsModal'));
const adminActionModal = new bootstrap.Modal(document.getElementById('adminActionModal'));
const requestDetailsContent = document.getElementById('request-details-content');

// Admin action elements
const approveBtn = document.getElementById('approve-btn');
const declineBtn = document.getElementById('decline-btn');
const declineReasonContainer = document.getElementById('decline-reason-container');
const declineReason = document.getElementById('decline-reason');
const submitDeclineBtn = document.getElementById('submit-decline');

// Notification toast
const notificationToast = new bootstrap.Toast(document.getElementById('notification-toast'));
const toastTitle = document.getElementById('toast-title');
const toastMessage = document.getElementById('toast-message');

// Global variables
let currentUser = null;
let isAdmin = false;
let currentRequestId = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);
authForm.addEventListener('submit', handleAuth);
registerBtn.addEventListener('click', handleRegister);
logoutBtn.addEventListener('click', handleLogout);
newRequestLink.addEventListener('click', showNewRequestSection);
myRequestsLink.addEventListener('click', showMyRequestsSection);
allRequestsLink.addEventListener('click', showAllRequestsSection);
purchaseRequestForm.addEventListener('submit', submitPurchaseRequest);
addItemBtn.addEventListener('click', addItemRow);
approveBtn.addEventListener('click', showApproveOptions);
declineBtn.addEventListener('click', showDeclineReason);
submitDeclineBtn.addEventListener('click', submitDecline);

// Initialize the application
function initApp() {
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
                        showNewRequestSection();
                    }
                }
            });
            
            // Set up real-time listeners
            setupRealTimeListeners();
        } else {
            currentUser = null;
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
        }
    });
    
    // Add the first item row by default
    addItemRow();
}

// Handle authentication
function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            showNotification('Success', 'Logged in successfully');
        })
        .catch(error => {
            showNotification('Error', error.message);
        });
}

// Handle registration
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
        .then(() => {
            showNotification('Success', 'Account created successfully');
        })
        .catch(error => {
            showNotification('Error', error.message);
        });
}

// Handle logout
function handleLogout() {
    auth.signOut()
        .then(() => {
            showNotification('Success', 'Logged out successfully');
        })
        .catch(error => {
            showNotification('Error', error.message);
        });
}

// Show new request section
function showNewRequestSection(e) {
    if (e) e.preventDefault();
    newRequestSection.style.display = 'block';
    myRequestsSection.style.display = 'none';
    allRequestsSection.style.display = 'none';
    
    // Reset form
    purchaseRequestForm.reset();
    itemsContainer.innerHTML = '';
    addItemRow();
}

// Show my requests section
function showMyRequestsSection(e) {
    if (e) e.preventDefault();
    newRequestSection.style.display = 'none';
    myRequestsSection.style.display = 'block';
    allRequestsSection.style.display = 'none';
    
    loadMyRequests();
}

// Show all requests section (admin)
function showAllRequestsSection(e) {
    if (e) e.preventDefault();
    newRequestSection.style.display = 'none';
    myRequestsSection.style.display = 'none';
    allRequestsSection.style.display = 'block';
    
    if (isAdmin) {
        loadAllRequests();
    }
}

// Add item row to the form
function addItemRow() {
    const row = document.createElement('div');
    row.className = 'item-row row mb-3';
    row.innerHTML = `
        <div class="col-md-3">
            <label class="form-label">Quantity</label>
            <input type="number" class="form-control quantity" step="0.001" value="1" required>
        </div>
        <div class="col-md-3">
            <label class="form-label">Units</label>
            <input type="text" class="form-control units" value="pcs" required>
        </div>
        <div class="col-md-5">
            <label class="form-label">Item Name</label>
            <input type="text" class="form-control item-name" required>
        </div>
        <div class="col-md-1 d-flex align-items-end">
            <button type="button" class="btn btn-danger remove-item">X</button>
        </div>
    `;
    
    itemsContainer.appendChild(row);
    
    // Add event listener to remove button
    row.querySelector('.remove-item').addEventListener('click', () => {
        if (itemsContainer.children.length > 1) {
            row.remove();
        } else {
            showNotification('Info', 'You need at least one item');
        }
    });
}

// Submit purchase request
function submitPurchaseRequest(e) {
    e.preventDefault();
    
    const workerName = document.getElementById('worker-name').value;
    const projectName = document.getElementById('project-name').value;
    
    // Collect items
    const items = [];
    const itemRows = itemsContainer.querySelectorAll('.item-row');
    
    itemRows.forEach(row => {
        items.push({
            quantity: parseFloat(row.querySelector('.quantity').value),
            units: row.querySelector('.units').value,
            name: row.querySelector('.item-name').value
        });
    });
    
    // Create request object
    const request = {
        workerName: workerName,
        workerEmail: currentUser.email,
        projectName: projectName,
        items: items,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Save to Firestore
    db.collection('purchaseRequests').add(request)
        .then(() => {
            showNotification('Success', 'Purchase request submitted successfully');
            purchaseRequestForm.reset();
            itemsContainer.innerHTML = '';
            addItemRow();
            
            // Notify admin if online
            if (isAdmin) return;
            
            db.collection('users').where('isAdmin', '==', true).get()
                .then(snapshot => {
                    snapshot.forEach(doc => {
                        db.collection('notifications').add({
                            userId: doc.id,
                            message: `New purchase request from ${workerName}`,
                            type: 'new_request',
                            read: false,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                });
        })
        .catch(error => {
            showNotification('Error', 'Failed to submit request: ' + error.message);
        });
}

// Load my requests
function loadMyRequests() {
    myRequestsTable.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
    
    db.collection('purchaseRequests')
        .where('workerEmail', '==', currentUser.email)
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            if (snapshot.empty) {
                myRequestsTable.innerHTML = '<tr><td colspan="5" class="text-center">No requests found</td></tr>';
                return;
            }
            
            myRequestsTable.innerHTML = '';
            snapshot.forEach(doc => {
                const request = doc.data();
                const date = request.createdAt.toDate();
                const formattedDate = date.toLocaleString();
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formattedDate}</td>
                    <td>${request.projectName}</td>
                    <td>${request.items.length} items</td>
                    <td class="status-${request.status}">${request.status}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-details" data-id="${doc.id}">View</button>
                    </td>
                `;
                
                myRequestsTable.appendChild(row);
            });
            
            // Add event listeners to view buttons
            document.querySelectorAll('.view-details').forEach(btn => {
                btn.addEventListener('click', () => viewRequestDetails(btn.dataset.id));
            });
        }, error => {
            showNotification('Error', 'Failed to load requests: ' + error.message);
        });
}

// Load all requests (admin)
function loadAllRequests() {
    allRequestsTable.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
    
    db.collection('purchaseRequests')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            if (snapshot.empty) {
                allRequestsTable.innerHTML = '<tr><td colspan="6" class="text-center">No requests found</td></tr>';
                return;
            }
            
            allRequestsTable.innerHTML = '';
            snapshot.forEach(doc => {
                const request = doc.data();
                const date = request.createdAt.toDate();
                const formattedDate = date.toLocaleString();
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formattedDate}</td>
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
            });
            
            // Add event listeners
            document.querySelectorAll('.view-details').forEach(btn => {
                btn.addEventListener('click', () => viewRequestDetails(btn.dataset.id));
            });
            
            document.querySelectorAll('.process-request').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentRequestId = btn.dataset.id;
                    adminActionModal.show();
                });
            });
        }, error => {
            showNotification('Error', 'Failed to load requests: ' + error.message);
        });
}

// View request details
function viewRequestDetails(requestId) {
    db.collection('purchaseRequests').doc(requestId).get()
        .then(doc => {
            if (!doc.exists) {
                showNotification('Error', 'Request not found');
                return;
            }
            
            const request = doc.data();
            const date = request.createdAt.toDate();
            const formattedDate = date.toLocaleString();
            const updatedDate = request.updatedAt.toDate();
            const formattedUpdatedDate = updatedDate.toLocaleString();
            
            let itemsHtml = '<table class="table table-sm"><thead><tr><th>Qty</th><th>Units</th><th>Item</th></tr></thead><tbody>';
            request.items.forEach(item => {
                itemsHtml += `<tr><td>${item.quantity}</td><td>${item.units}</td><td>${item.name}</td></tr>`;
            });
            itemsHtml += '</tbody></table>';
            
            let detailsHtml = `
                <h5>Request from ${request.workerName}</h5>
                <p><strong>Project:</strong> ${request.projectName}</p>
                <p><strong>Submitted:</strong> ${formattedDate}</p>
                <p><strong>Last Updated:</strong> ${formattedUpdatedDate}</p>
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
            }
            
            requestDetailsContent.innerHTML = detailsHtml;
            requestDetailsModal.show();
        })
        .catch(error => {
            showNotification('Error', 'Failed to load request details: ' + error.message);
        });
}

// Show approve options
function showApproveOptions() {
    declineReasonContainer.style.display = 'none';
    
    // Generate Excel file
    db.collection('purchaseRequests').doc(currentRequestId).get()
        .then(doc => {
            if (!doc.exists) {
                showNotification('Error', 'Request not found');
                return;
            }
            
            const request = doc.data();
            const items = request.items;
            
            // Create Excel data
            const excelData = [
                ['Purchase Order'],
                ['Requester:', request.workerName],
                ['Project:', request.projectName],
                ['Date:', new Date().toLocaleDateString()],
                [],
                ['Quantity', 'Units', 'Item Name']
            ];
            
            items.forEach(item => {
                excelData.push([item.quantity, item.units, item.name]);
            });
            
            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Purchase Order");
            
            // Generate file and create download link
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
            
            adminActionModal.hide();
            showNotification('Success', 'Request approved and Excel file downloaded');
        })
        .catch(error => {
            showNotification('Error', 'Failed to approve request: ' + error.message);
        });
}

// Show decline reason input
function showDeclineReason() {
    declineReasonContainer.style.display = 'block';
    declineReason.value = '';
}

// Submit decline
function submitDecline() {
    const reason = declineReason.value.trim();
    
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
        
        declineReasonContainer.style.display = 'none';
        adminActionModal.hide();
        showNotification('Success', 'Request declined and worker notified');
    })
    .catch(error => {
        showNotification('Error', 'Failed to decline request: ' + error.message);
    });
}

// Set up real-time listeners for notifications
function setupRealTimeListeners() {
    // Worker notifications
    if (!isAdmin) {
        db.collection('notifications')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const notification = change.doc.data();
                        showNotification('Notification', notification.message);
                        
                        // Mark as read
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
                    if (change.type === 'added') {
                        const notification = change.doc.data();
                        showNotification('New Request', notification.message);
                        
                        // Mark as read
                        change.doc.ref.update({ read: true });
                    }
                });
            });
    }
}

// Show notification
function showNotification(title, message) {
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    notificationToast.show();
}
