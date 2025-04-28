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

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const googleSignInBtn = document.getElementById('google-signin');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');

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
const requestNotes = document.getElementById('request-notes');

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
    // Set RTL and Arabic font
    document.body.setAttribute('dir', 'rtl');
    document.body.style.fontFamily = "'Tajawal', sans-serif";
    
    // Event listeners
    googleSignInBtn.addEventListener('click', signInWithGoogle);
    logoutBtn.addEventListener('click', handleLogout);
    newRequestLink.addEventListener('click', showNewRequestSection);
    myRequestsLink.addEventListener('click', showMyRequestsSection);
    allRequestsLink.addEventListener('click', showAllRequestsSection);
    purchaseRequestForm.addEventListener('submit', submitPurchaseRequest);
    addItemBtn.addEventListener('click', addItemRow);
    modalApproveBtn.addEventListener('click', approveRequest);
    modalDeclineBtn.addEventListener('click', showDeclineReasonModal);
    submitDeclineBtn.addEventListener('click', submitDecline);

    // Add first item row
    addItemRow();

    // Setup mobile UI
    setupMobileUI();

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

// Google Sign-In
async function signInWithGoogle() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        
        // Check if user exists in Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // Create new user document
            await db.collection('users').doc(user.uid).set({
                name: user.displayName,
                email: user.email,
                isAdmin: false, // Default to worker role
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        showNotification('نجاح', 'تم تسجيل الدخول بنجاح');
    } catch (error) {
        console.error('Error signing in with Google:', error);
        showNotification('خطأ', 'فشل في تسجيل الدخول: ' + error.message);
    }
}

// Logout
function handleLogout() {
    auth.signOut()
        .then(() => showNotification('نجاح', 'تم تسجيل الخروج بنجاح'))
        .catch(error => showNotification('خطأ', error.message));
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
            <input type="text" class="form-control quantity" placeholder="الكمية" required>
        </div>
        <div class="col-md-3">
            <input type="text" class="form-control units" value="قطعة" placeholder="الوحدة" required>
        </div>
        <div class="col-md-5">
            <input type="text" class="form-control item-name" placeholder="اسم الصنف" required>
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
            showNotification('تنبيه', 'يجب إضافة صنف واحد على الأقل');
        }
    });
}

function submitPurchaseRequest(e) {
    e.preventDefault();
    
    const workerName = document.getElementById('worker-name').value.trim();
    const projectName = document.getElementById('project-name').value.trim();
    const notes = requestNotes.value.trim();
    
    // Validate inputs
    if (!workerName || !projectName) {
        showNotification('خطأ', 'الرجاء ملء جميع الحقول المطلوبة');
        return;
    }
    
    // Collect items
    const items = [];
    const itemRows = itemsContainer.querySelectorAll('.item-row');
    
    itemRows.forEach(row => {
        const quantity = row.querySelector('.quantity').value.trim();
        const units = row.querySelector('.units').value.trim();
        const name = row.querySelector('.item-name').value.trim();
        
        if (!name || !quantity) {
            showNotification('خطأ', 'الرجاء ملء جميع حقول الأصناف');
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
        notes,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Save to Firestore
    db.collection('purchaseRequests').add(request)
        .then(() => {
            showNotification('نجاح', 'تم إرسال الطلب بنجاح');
            purchaseRequestForm.reset();
            itemsContainer.innerHTML = '';
            addItemRow();
            showMyRequestsSection();
            
            // Notify admins
            if (!isAdmin) notifyAdmins(workerName);
        })
        .catch(error => showNotification('خطأ', 'فشل في إرسال الطلب: ' + error.message));
}

function notifyAdmins(workerName) {
    db.collection('users').where('isAdmin', '==', true).get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                db.collection('notifications').add({
                    userId: doc.id,
                    message: `طلب جديد من ${workerName}`,
                    type: 'new_request',
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        });
}

// Request management functions
function loadMyRequests() {
    myRequestsTable.innerHTML = '<tr><td colspan="5" class="text-center">جار التحميل...</td></tr>';
    
    db.collection('purchaseRequests')
        .where('workerEmail', '==', currentUser.email)
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                myRequestsTable.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد طلبات</td></tr>';
                return;
            }
            
            myRequestsTable.innerHTML = '';
            snapshot.forEach(doc => {
                const request = doc.data();
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${request.createdAt.toDate().toLocaleString('ar-EG')}</td>
                    <td>${request.projectName}</td>
                    <td>${request.items.length} أصناف</td>
                    <td class="status-${request.status}">${request.status}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-details" data-id="${doc.id}">عرض</button>
                    </td>
                `;
                myRequestsTable.appendChild(row);
                
                // Add event listener
                row.querySelector('.view-details').addEventListener('click', () => viewRequestDetails(doc.id));
            });
        })
        .catch(error => {
            showNotification('خطأ', 'فشل في تحميل الطلبات: ' + error.message);
            myRequestsTable.innerHTML = '<tr><td colspan="5" class="text-center text-danger">خطأ في تحميل الطلبات</td></tr>';
        });
}

function loadAllRequests() {
    allRequestsTable.innerHTML = '<tr><td colspan="6" class="text-center">جار التحميل...</td></tr>';
    
    db.collection('purchaseRequests')
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                allRequestsTable.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد طلبات</td></tr>';
                return;
            }
            
            allRequestsTable.innerHTML = '';
            snapshot.forEach(doc => {
                const request = doc.data();
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${request.createdAt.toDate().toLocaleString('ar-EG')}</td>
                    <td>${request.workerName} (${request.workerEmail})</td>
                    <td>${request.projectName}</td>
                    <td>${request.items.length} أصناف</td>
                    <td class="status-${request.status}">${request.status}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-details" data-id="${doc.id}">عرض</button>
                        ${request.status === 'pending' ? 
                            `<button class="btn btn-sm btn-warning process-request" data-id="${doc.id}">معالجة</button>` : ''}
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
            showNotification('خطأ', 'فشل في تحميل الطلبات: ' + error.message);
            allRequestsTable.innerHTML = '<tr><td colspan="6" class="text-center text-danger">خطأ في تحميل الطلبات</td></tr>';
        });
}

function viewRequestDetails(requestId) {
    db.collection('purchaseRequests').doc(requestId).get()
        .then(doc => {
            if (!doc.exists) {
                showNotification('خطأ', 'الطلب غير موجود');
                return;
            }
            
            const request = doc.data();
            currentRequestId = requestId;
            
            // Show/hide admin actions
            document.getElementById('admin-actions').style.display = isAdmin ? 'block' : 'none';
            
            // Build details HTML
            let itemsHtml = '<table class="table table-sm"><thead><tr><th>الصنف</th><th>الكمية</th><th>الوحدة</th></tr></thead><tbody>';
            request.items.forEach(item => {
                itemsHtml += `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${item.units}</td></tr>`;
            });
            itemsHtml += '</tbody></table>';
            
            let detailsHtml = `
                <h5>طلب من ${request.workerName}</h5>
                <p><strong>رقم الطلب:</strong> ${doc.id}</p>
                <p><strong>المشروع:</strong> ${request.projectName}</p>
                <p><strong>تاريخ الإرسال:</strong> ${request.createdAt.toDate().toLocaleString('ar-EG')}</p>
                <p><strong>الحالة:</strong> <span class="status-${request.status}">${request.status}</span></p>
                
                <h5 class="mt-4">الأصناف</h5>
                ${itemsHtml}
            `;
            
            if (request.notes) {
                detailsHtml += `
                    <h5 class="mt-3">ملاحظات</h5>
                    <p>${request.notes}</p>
                `;
            }
            
            if (request.status === 'declined' && request.declineReason) {
                detailsHtml += `
                    <div class="alert alert-danger mt-3">
                        <h6>سبب الرفض</h6>
                        <p>${request.declineReason}</p>
                    </div>
                `;
            }
            
            requestDetailsContent.innerHTML = detailsHtml;
            requestDetailsModal.show();
        })
        .catch(error => showNotification('خطأ', 'فشل في تحميل تفاصيل الطلب: ' + error.message));
}

// Arabic PDF Generation
async function generateArabicPDF(request, requestId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    // Add Arabic font
    doc.addFont('https://fonts.googleapis.com/css2?family=Tajawal&display=swap', 'Tajawal', 'normal');
    doc.setFont('Tajawal');
    
    // Set RTL direction
    doc.setR2L(true);

    // Header
    doc.setFontSize(18);
    doc.text('أمر شراء', 105, 20, { align: 'center' });

    // Request info
    doc.setFontSize(10);
    doc.text(`رقم الطلب: ${requestId}`, 180, 30, { align: 'right' });
    doc.text(`التاريخ: ${request.createdAt.toDate().toLocaleDateString('ar-EG')}`, 180, 36, { align: 'right' });
    doc.text(`الوقت: ${request.createdAt.toDate().toLocaleTimeString('ar-EG')}`, 180, 42, { align: 'right' });

    // Requester info
    doc.text(`مقدم الطلب: ${request.workerName}`, 100, 30, { align: 'right' });
    doc.text(`البريد الإلكتروني: ${request.workerEmail}`, 100, 36, { align: 'right' });
    doc.text(`المشروع: ${request.projectName}`, 100, 42, { align: 'right' });

    // Notes if available
    if (request.notes) {
        doc.text(`ملاحظات: ${request.notes}`, 180, 50, { align: 'right' });
    }

    // Items table (RTL)
    doc.autoTable({
        startY: request.notes ? 60 : 50,
        head: [['الصنف', 'الكمية', 'الوحدة']],
        headStyles: {
            fillColor: [22, 160, 133],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'right'
        },
        body: request.items.map(item => [item.name, item.quantity, item.units]),
        styles: {
            font: 'Tajawal',
            fontStyle: 'normal',
            halign: 'right'
        },
        columnStyles: {
            0: { cellWidth: 'auto', halign: 'right' },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 30, halign: 'center' }
        },
        margin: { right: 10 }
    });

    // Approval section
    doc.text('التوقيع:', 180, doc.lastAutoTable.finalY + 10, { align: 'right' });
    doc.text('________________________', 180, doc.lastAutoTable.finalY + 20, { align: 'right' });
    doc.text('ختم المؤسسة', 180, doc.lastAutoTable.finalY + 25, { align: 'right' });

    return doc;
}

async function approveRequest() {
    try {
        const doc = await db.collection('purchaseRequests').doc(currentRequestId).get();
        if (!doc.exists) throw new Error('الطلب غير موجود');
        
        const request = doc.data();
        const requestId = doc.id;
        
        // Generate PDF
        const pdfDoc = await generateArabicPDF(request, requestId);
        const pdfName = `طلب_شراء_${requestId}.pdf`;
        pdfDoc.save(pdfName);
        
        // Update request status
        await db.collection('purchaseRequests').doc(currentRequestId).update({
            status: 'approved',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedPdfUrl: pdfName
        });
        
        // Send email to bajiyof761@cyluna.com
        const subject = encodeURIComponent(`طلب شراء جديد #${requestId}`);
        const body = encodeURIComponent(
            `تمت الموافقة على طلب شراء جديد:\n\n` +
            `رقم الطلب: ${requestId}\n` +
            `مقدم الطلب: ${request.workerName}\n` +
            `المشروع: ${request.projectName}\n` +
            `التاريخ: ${new Date().toLocaleString('ar-EG')}\n\n` +
            `الأصناف المطلوبة:\n\n` +
            request.items.map(item => 
                `${item.quantity} ${item.units} من ${item.name}`
            ).join('\n') +
            (request.notes ? `\n\nملاحظات:\n${request.notes}` : '') +
            `\n\nالرجاء تحضير هذه الأصناف للتسليم.`
        );
        
        window.open(`mailto:bajiyof761@cyluna.com?subject=${subject}&body=${body}`);
        
        requestDetailsModal.hide();
        showNotification('نجاح', 'تمت الموافقة على الطلب وتم إنشاء ملف PDF');
        loadAllRequests();
    } catch (error) {
        showNotification('خطأ', 'فشل في الموافقة على الطلب: ' + error.message);
    }
}

function showDeclineReasonModal() {
    declineReasonText.value = '';
    declineReasonModal.show();
}

function submitDecline() {
    const reason = declineReasonText.value.trim();
    
    if (!reason) {
        showNotification('خطأ', 'الرجاء إدخال سبب الرفض');
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
                    message: `تم رفض طلبك للمشروع ${request.projectName}`,
                    type: 'request_update',
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        
        declineReasonModal.hide();
        requestDetailsModal.hide();
        showNotification('نجاح', 'تم رفض الطلب وإعلام المستخدم');
        loadAllRequests();
    })
    .catch(error => showNotification('خطأ', 'فشل في رفض الطلب: ' + error.message));
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
                        showNotification('إشعار', notification.message);
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
                        showNotification('طلب جديد', notification.message);
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

// Mobile UI setup
function setupMobileUI() {
    if (!/Mobi|Android/i.test(navigator.userAgent)) return;
    
    // Adjust form inputs for mobile
    document.querySelectorAll('input, textarea, select').forEach(el => {
        el.style.fontSize = '16px';
    });
    
    // Make buttons more touch-friendly
    document.querySelectorAll('.btn').forEach(btn => {
        btn.style.padding = '10px 15px';
        btn.style.minWidth = '80px';
    });
    
    // Adjust table layout
    document.querySelectorAll('.table-responsive').forEach(table => {
        table.style.overflowX = 'auto';
        table.style.webkitOverflowScrolling = 'touch';
    });
    
    // Make modal more mobile-friendly
    document.querySelectorAll('.modal-dialog').forEach(modal => {
        modal.style.maxWidth = '95%';
        modal.style.margin = '10px auto';
    });
}
