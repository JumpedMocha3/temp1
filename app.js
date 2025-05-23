// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA5h26hiZRX2WA3tRCjUY2NlA6rnRV0E24",
  authDomain: "namozag-3b281.firebaseapp.com",
  databaseURL: "https://namozag-3b281-default-rtdb.firebaseio.com",
  projectId: "namozag-3b281",
  storageBucket: "namozag-3b281.appspot.com",
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

// Helper function to generate order code
function generateOrderCode(email, orderNumber) {
    const paddedNumber = String(orderNumber).padStart(4, '0');
    const emailPrefix = email.substring(0, 2).toLowerCase();
    const randomChars = Math.random().toString(36).substring(2, 4);
    return `${paddedNumber}${emailPrefix}${randomChars}`;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    document.body.setAttribute('dir', 'rtl');
    document.body.style.fontFamily = "'Tajawal', sans-serif";
    
    // Event listeners
    authForm.addEventListener('submit', handleAuth);
    logoutBtn.addEventListener('click', handleLogout);
    
    newRequestLink.addEventListener('click', showNewRequestSection);
    myRequestsLink.addEventListener('click', showMyRequestsSection);
    allRequestsLink.addEventListener('click', showAllRequestsSection);
    purchaseRequestForm.addEventListener('submit', submitPurchaseRequest);
    addItemBtn.addEventListener('click', addItemRow);
    modalApproveBtn.addEventListener('click', approveRequest);
    modalDeclineBtn.addEventListener('click', showDeclineReasonModal);
    submitDeclineBtn.addEventListener('click', submitDecline);

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
        .then(() => {
            showNotification('نجاح', 'تم تسجيل الدخول بنجاح');
        })
        .catch(error => showNotification('خطأ', error.message));
}

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
    row.className = 'item-row row mb-2';
    row.innerHTML = `
        <div class="col-md-2">
            <input type="text" class="form-control quantity" placeholder="الكمية" required>
        </div>
        <div class="col-md-2">
            <input type="text" class="form-control units" placeholder="الوحدة" required>
        </div>
        <div class="col-md-4">
            <input type="text" class="form-control item-name" placeholder="اسم الصنف" required>
        </div>
        <div class="col-md-3">
            <input type="text" class="form-control item-notes" placeholder="ملاحظات (اختياري)">
        </div>
        <div class="col-md-1 d-flex align-items-center">
            <button type="button" class="btn btn-danger btn-sm remove-item">X</button>
        </div>
    `;
    
    itemsContainer.appendChild(row);
    
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
    
    if (!workerName || !projectName) {
        showNotification('خطأ', 'الرجاء ملء جميع الحقول المطلوبة');
        return;
    }
    
    const items = [];
    const itemRows = itemsContainer.querySelectorAll('.item-row');
    
    itemRows.forEach(row => {
        const quantity = parseFloat(row.querySelector('.quantity').value);
        const units = row.querySelector('.units').value.trim();
        const name = row.querySelector('.item-name').value.trim();
        const itemNotes = row.querySelector('.item-notes').value.trim();
        
        if (!name || isNaN(quantity)) {
            showNotification('خطأ', 'الرجاء ملء جميع حقول الأصناف بشكل صحيح');
            throw new Error('Invalid item data');
        }
        
        items.push({ quantity, units, name, notes: itemNotes });
    });
    
    // Get total count to generate order number
    db.collection('purchaseRequests').get().then(snapshot => {
        const orderNumber = snapshot.size + 1;
        const orderCode = generateOrderCode(currentUser.email, orderNumber);
        
        const request = {
            workerName,
            workerEmail: currentUser.email,
            projectName,
            items,
            notes,
            status: 'pending',
            orderNumber,
            orderCode,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        return db.collection('purchaseRequests').add(request);
    })
    .then(() => {
        showNotification('نجاح', 'تم إرسال الطلب بنجاح');
        purchaseRequestForm.reset();
        itemsContainer.innerHTML = '';
        addItemRow();
        showMyRequestsSection();
        
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
    myRequestsTable.innerHTML = '<tr><td colspan="6" class="text-center">جار التحميل...</td></tr>';
    
    db.collection('purchaseRequests')
        .where('workerEmail', '==', currentUser.email)
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                myRequestsTable.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد طلبات</td></tr>';
                return;
            }
            
            myRequestsTable.innerHTML = '';
            let counter = 1;
            snapshot.forEach(doc => {
                const request = doc.data();
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${counter}</td>
                    <td>${request.createdAt.toDate().toLocaleString('ar-EG')}</td>
                    <td>${request.projectName}</td>
                    <td>${request.items.length} أصناف</td>
                    <td class="status-${request.status}">${request.status}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-details" data-id="${doc.id}">عرض</button>
                    </td>
                `;
                myRequestsTable.appendChild(row);
                counter++;
                
                row.querySelector('.view-details').addEventListener('click', () => viewRequestDetails(doc.id));
            });
        })
        .catch(error => {
            showNotification('خطأ', 'فشل في تحميل الطلبات: ' + error.message);
            myRequestsTable.innerHTML = '<tr><td colspan="6" class="text-center text-danger">خطأ في تحميل الطلبات</td></tr>';
        });
}

function loadAllRequests() {
    allRequestsTable.innerHTML = '<tr><td colspan="7" class="text-center">جار التحميل...</td></tr>';
    
    db.collection('purchaseRequests')
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                allRequestsTable.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد طلبات</td></tr>';
                return;
            }
            
            allRequestsTable.innerHTML = '';
            let counter = 1;
            snapshot.forEach(doc => {
                const request = doc.data();
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${counter}</td>
                    <td>${request.orderCode}</td>
                    <td>${request.createdAt.toDate().toLocaleString('ar-EG')}</td>
                    <td>${request.workerName} (${request.workerEmail})</td>
                    <td>${request.projectName}</td>
                    <td class="status-${request.status}">${request.status}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-details" data-id="${doc.id}">عرض</button>
                        ${request.status === 'pending' ? 
                            `<button class="btn btn-sm btn-warning process-request" data-id="${doc.id}">معالجة</button>` : ''}
                    </td>
                `;
                allRequestsTable.appendChild(row);
                counter++;
                
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
            allRequestsTable.innerHTML = '<tr><td colspan="7" class="text-center text-danger">خطأ في تحميل الطلبات</td></tr>';
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
            
            document.getElementById('admin-actions').style.display = isAdmin ? 'block' : 'none';
            
            let itemsHtml = '<table class="table table-sm"><thead><tr><th>الصنف</th><th>الكمية</th><th>الوحدة</th><th>ملاحظات</th></tr></thead><tbody>';
            request.items.forEach(item => {
                itemsHtml += `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${item.units}</td><td>${item.notes || '-'}</td></tr>`;
            });
            itemsHtml += '</tbody></table>';
            
            let detailsHtml = `
                <h5>طلب من ${request.workerName}</h5>
                <p><strong>كود الطلب:</strong> ${request.orderCode}</p>
                <p><strong>رقم الطلب:</strong> ${request.orderNumber}</p>
                <p><strong>المشروع:</strong> ${request.projectName}</p>
                <p><strong>تاريخ الإرسال:</strong> ${request.createdAt.toDate().toLocaleString('ar-EG')}</p>
                <p><strong>الحالة:</strong> <span class="status-${request.status}">${request.status}</span></p>
                
                <h5 class="mt-4">الأصناف</h5>
                ${itemsHtml}
            `;
            
            if (request.notes) {
                detailsHtml += `
                    <h5 class="mt-3">ملاحظات عامة</h5>
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

async function generateArabicPDF(request, requestId) {
    try {
        const pdfContainer = document.createElement('div');
        pdfContainer.style.position = 'absolute';
        pdfContainer.style.left = '-9999px';
        pdfContainer.style.width = '794px';
        pdfContainer.style.padding = '20px';
        pdfContainer.style.fontFamily = 'Tajawal, sans-serif';
        pdfContainer.style.direction = 'rtl';
        pdfContainer.style.textAlign = 'right';
        pdfContainer.style.backgroundColor = '#fff';
        
        pdfContainer.innerHTML = `
            <h1 style="text-align: center; margin-bottom: 30px;">أمر شراء</h1>
            
            <div style="margin-bottom: 20px;">
                <p><strong>كود الطلب:</strong> ${request.orderCode}</p>
                <p><strong>رقم الطلب:</strong> ${request.orderNumber}</p>
                <p><strong>التاريخ:</strong> ${request.createdAt.toDate().toLocaleDateString('ar-EG')}</p>
                <p><strong>الوقت:</strong> ${request.createdAt.toDate().toLocaleTimeString('ar-EG')}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <p><strong>مقدم الطلب:</strong> ${request.workerName}</p>
                <p><strong>البريد الإلكتروني:</strong> ${request.workerEmail}</p>
                <p><strong>المشروع:</strong> ${request.projectName}</p>
            </div>
            
            ${request.notes ? `
            <div style="margin-bottom: 20px;">
                <h3>ملاحظات عامة:</h3>
                <p>${request.notes}</p>
            </div>
            ` : ''}
            
            <h3 style="margin-bottom: 15px;">الأصناف المطلوبة:</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                    <tr style="background-color: #168572; color: white;">
                        <th style="padding: 10px; border: 1px solid #ddd;">الصنف</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">الكمية</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">الوحدة</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">ملاحظات</th>
                    </tr>
                </thead>
                <tbody>
                    ${request.items.map(item => `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.units}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.notes || '-'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="margin-top: 50px;">
                <p>التوقيع: ________________________</p>
                <p>ختم المؤسسة</p>
            </div>
        `;
        
        document.body.appendChild(pdfContainer);
        
        const canvas = await html2canvas(pdfContainer, {
            scale: 2,
            logging: false,
            useCORS: true
        });
        
        document.body.removeChild(pdfContainer);
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        return pdf;
    } catch (error) {
        console.error('PDF generation error:', error);
        throw new Error('فشل في إنشاء ملف PDF: ' + error.message);
    }
}

async function approveRequest() {
    try {
        if (!currentRequestId) {
            throw new Error('لا يوجد طلب محدد للموافقة');
        }

        if (typeof jsPDF === 'undefined') {
            throw new Error('مكتبة PDF غير محملة بشكل صحيح');
        }

        const doc = await db.collection('purchaseRequests').doc(currentRequestId).get();
        if (!doc.exists) throw new Error('الطلب غير موجود');
        
        const request = doc.data();
        const requestId = doc.id;
        
        // Generate PDF
        const pdfDoc = await generateArabicPDF(request, requestId);
        
        // Create a blob from the PDF
        const pdfBlob = pdfDoc.output('blob');
        const pdfName = `طلب_شراء_${request.orderCode}.pdf`;
        
        // Update request status
        await db.collection('purchaseRequests').doc(currentRequestId).update({
            status: 'approved',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedPdfUrl: pdfName,
            approvedBy: currentUser.email,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(pdfBlob);
        downloadLink.download = pdfName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Prepare email content
        const subject = `طلب شراء #${request.orderCode} - تمت الموافقة`;
        const body = `
            تمت الموافقة على طلب شراء جديد:
            
            كود الطلب: ${request.orderCode}
            مقدم الطلب: ${request.workerName}
            المشروع: ${request.projectName}
            التاريخ: ${new Date().toLocaleString('ar-EG')}
            
            الأصناف المطلوبة:
            ${request.items.map(item => `${item.quantity} ${item.units} من ${item.name}${item.notes ? ` (${item.notes})` : ''}`).join('\n')}
            
            ${request.notes ? `ملاحظات عامة:\n${request.notes}` : ''}
            
            الرجاء تحضير هذه الأصناف للتسليم.
        `;
        
        // Send email to purchaseorder@4walls-group.com
        const emailTo = 'purchaseorder@4walls-group.com';
        const emailSubject = encodeURIComponent(subject);
        const emailBody = encodeURIComponent(body);
        
        // Open email client with the purchase order email as recipient
        window.open(`mailto:${emailTo}?subject=${emailSubject}&body=${emailBody}`);
        
        // Also send notification to worker
        await db.collection('notifications').add({
            userId: currentUser.uid,
            message: `تمت الموافقة على طلبك للمشروع ${request.projectName}`,
            type: 'request_approved',
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        requestDetailsModal.hide();
        showNotification('نجاح', 'تمت الموافقة على الطلب وتم إرسال البريد الإلكتروني إلى قسم المشتريات');
        loadAllRequests();
    } catch (error) {
        console.error('Approval error:', error);
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
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        declinedBy: currentUser.email,
        declinedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        db.collection('purchaseRequests').doc(currentRequestId).get()
            .then(doc => {
                const request = doc.data();
                
                db.collection('notifications').add({
                    userId: currentUser.uid,
                    message: `تم رفض طلبك للمشروع ${request.projectName}`,
                    type: 'request_declined',
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                const subject = encodeURIComponent(`طلب شراء #${request.orderCode} - تم الرفض`);
                const body = encodeURIComponent(`عزيزي ${request.workerName},\n\nنأسف لإبلاغك بأن طلب الشراء الخاص بمشروع "${request.projectName}" قد تم رفضه.\n\nسبب الرفض: ${reason}\n\nمع أطيب التحيات،\nفريق المشتريات`);
                window.open(`mailto:${request.workerEmail}?subject=${subject}&body=${body}`);
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

// Mobile menu close when clicking outside
document.addEventListener('click', function(event) {
    const navbarCollapse = document.querySelector('.navbar-collapse');
    const navbarToggler = document.querySelector('.navbar-toggler');
    
    if (navbarCollapse.classList.contains('show') && 
        !event.target.closest('.navbar-collapse') && 
        !event.target.closest('.navbar-toggler')) {
        navbarToggler.click();
    }
});

// Close menu when a nav link is clicked
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        const navbarToggler = document.querySelector('.navbar-toggler');
        if (window.getComputedStyle(navbarToggler).display !== 'none') {
            navbarToggler.click();
        }
    });
});
