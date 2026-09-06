// Cloud Roblox Studio Frontend Application

const API_BASE_URL = 'http://localhost:3000/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let currentSession = null;
let wsConnection = null;

// DOM Elements
const authModal = document.getElementById('authModal');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const startStudioBtn = document.getElementById('startStudioBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const streamingOverlay = document.getElementById('streamingOverlay');
const streamFrame = document.getElementById('streamFrame');
const stopSessionBtn = document.getElementById('stopSessionBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const userDashboard = document.getElementById('userDashboard');
const logoutBtn = document.getElementById('logoutBtn');
const usernameDisplay = document.getElementById('usernameDisplay');
const sessionStatus = document.getElementById('sessionStatus');
const loadingSpinner = document.getElementById('loadingSpinner');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// Check authentication status
function checkAuth() {
    if (authToken && currentUser) {
        showDashboard();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Auth modal controls
    loginBtn?.addEventListener('click', () => openModal('login'));
    registerBtn?.addEventListener('click', () => openModal('register'));
    
    // Close modal
    document.querySelector('.close-btn')?.addEventListener('click', closeModal);
    authModal?.addEventListener('click', (e) => {
        if (e.target === authModal) closeModal();
    });
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });
    
    // Form submissions
    loginForm?.addEventListener('submit', handleLogin);
    registerForm?.addEventListener('submit', handleRegister);
    
    // Studio controls
    startStudioBtn?.addEventListener('click', handleStartStudio);
    stopSessionBtn?.addEventListener('click', handleStopSession);
    fullscreenBtn?.addEventListener('click', toggleFullscreen);
    
    // Dashboard controls
    logoutBtn?.addEventListener('click', handleLogout);
    document.getElementById('newSessionBtn')?.addEventListener('click', handleStartStudio);
}

// Modal functions
function openModal(tab = 'login') {
    authModal?.classList.add('active');
    switchTab(tab);
}

function closeModal() {
    authModal?.classList.remove('active');
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.toggle('active', form.id === `${tab}Form`);
    });
}

// Authentication handlers
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        authToken = data.token;
        currentUser = data.user;
        
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        closeModal();
        showDashboard();
        showNotification('Welcome back!', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        
        showNotification('Account created! Please login.', 'success');
        switchTab('login');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    currentSession = null;
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    hideDashboard();
    showNotification('Logged out successfully', 'success');
    
    // Close WebSocket if open
    if (wsConnection) {
        wsConnection.close();
        wsConnection = null;
    }
}

// Dashboard functions
function showDashboard() {
    if (currentUser) {
        usernameDisplay.textContent = currentUser.username;
        userDashboard?.classList.remove('hidden');
        startStudioBtn.textContent = '🚀 Continue to Studio';
    }
}

function hideDashboard() {
    userDashboard?.classList.add('hidden');
    startStudioBtn.textContent = '🚀 Start Roblox Studio';
}

// Studio session handlers
async function handleStartStudio() {
    if (!authToken) {
        openModal('login');
        return;
    }
    
    try {
        // Show loading state
        streamingOverlay?.classList.add('active');
        loadingSpinner.style.display = 'block';
        streamFrame.style.display = 'none';
        sessionStatus.textContent = 'Starting your cloud desktop...';
        
        const response = await fetch(`${API_BASE_URL}/start-session`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to start session');
        }
        
        currentSession = data;
        sessionStatus.textContent = 'Connected to Cloud Desktop';
        
        // Wait a bit for the desktop to initialize, then show the stream
        setTimeout(() => {
            loadingSpinner.style.display = 'none';
            streamFrame.style.display = 'block';
            streamFrame.src = data.streamingUrl;
            
            // Connect to WebSocket for real-time communication
            connectWebSocket(data.wsUrl);
            
            // Start monitoring stats
            startStatsMonitoring();
        }, data.estimatedWaitTime || 15000);
        
    } catch (error) {
        console.error('Error starting studio:', error);
        showNotification(error.message, 'error');
        streamingOverlay?.classList.remove('active');
    }
}

async function handleStopSession() {
    if (!currentSession || !authToken) return;
    
    try {
        sessionStatus.textContent = 'Stopping session...';
        
        const response = await fetch(`${API_BASE_URL}/stop-session/${currentSession.sessionId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to stop session');
        }
        
        // Close the overlay
        streamingOverlay?.classList.remove('active');
        streamFrame.src = '';
        currentSession = null;
        
        if (wsConnection) {
            wsConnection.close();
            wsConnection = null;
        }
        
        showNotification('Session stopped successfully', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// WebSocket connection for real-time input
function connectWebSocket(wsUrl) {
    try {
        wsConnection = new WebSocket(wsUrl);
        
        wsConnection.onopen = () => {
            console.log('WebSocket connected');
            // Send heartbeat every 30 seconds
            setInterval(() => {
                if (wsConnection.readyState === WebSocket.OPEN) {
                    wsConnection.send(JSON.stringify({ type: 'heartbeat' }));
                }
            }, 30000);
        };
        
        wsConnection.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('WebSocket message:', data);
            
            // Handle server messages
            if (data.type === 'session_update') {
                updateSessionStatus(data.status);
            }
        };
        
        wsConnection.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        wsConnection.onclose = () => {
            console.log('WebSocket disconnected');
        };
    } catch (error) {
        console.error('Failed to connect WebSocket:', error);
    }
}

// Forward input events to the remote desktop
function forwardInputEvent(type, data) {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
            type: 'input_event',
            eventType: type,
            data: data,
            timestamp: Date.now()
        }));
    }
}

// Fullscreen toggle
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        streamingOverlay?.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Stats monitoring (simulated - in production would get real data from server)
function startStatsMonitoring() {
    const fpsCounter = document.getElementById('fpsCounter');
    const latencyCounter = document.getElementById('latencyCounter');
    const bandwidthCounter = document.getElementById('bandwidthCounter');
    
    // Simulate realistic stats updates
    setInterval(() => {
        if (streamingOverlay?.classList.contains('active')) {
            // Random but realistic values
            const fps = Math.floor(55 + Math.random() * 5); // 55-60 FPS
            const latency = Math.floor(20 + Math.random() * 15); // 20-35ms
            const bandwidth = (8 + Math.random() * 4).toFixed(1); // 8-12 Mbps
            
            fpsCounter.textContent = fps;
            latencyCounter.textContent = `${latency} ms`;
            bandwidthCounter.textContent = `${bandwidth} Mbps`;
        }
    }, 2000);
}

function updateSessionStatus(status) {
    sessionStatus.textContent = status;
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#00a2ff'};
        color: white;
        border-radius: 8px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // F11 for fullscreen
    if (e.key === 'F11' && streamingOverlay?.classList.contains('active')) {
        e.preventDefault();
        toggleFullscreen();
    }
    
    // ESC to minimize overlay
    if (e.key === 'Escape' && streamingOverlay?.classList.contains('active')) {
        // Don't close, just exit fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }
});

console.log('🎮 Cloud Roblox Studio Frontend loaded successfully');
