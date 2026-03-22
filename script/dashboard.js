import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

//CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyDiUes0g8qj-pCRD0kDdcPsmSMsrYDbmwU",
    authDomain: "recallgen-4b38d.firebaseapp.com",
    projectId: "recallgen-4b38d",
    storageBucket: "recallgen-4b38d.firebasestorage.app",
    messagingSenderId: "67954844866",
    appId: "1:67954844866:web:5f52423f12fd30644b475b",
    measurementId: "G-TYTK4RHRBH"
};
const SUPABASE_URL = 'https://xdudxyjihjyteukiaate.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdWR4eWppaGp5dGV1a2lhYXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3OTA4MDksImV4cCI6MjA4NjM2NjgwOX0.szi9C6EK9OZ1TrkYBI1oJZkFkSeDNTdcjnM2MuY8ti4';

//INIT
const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

//Load User Profile & Theme from Supabase
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user.uid)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                // Username
                const username = data.username && data.username.trim() !== ''
                    ? data.username
                    : user.email.split('@')[0];

                document.getElementById('display-username').innerText = username;

                // Profile picture
                if (data.profile_pic && data.profile_pic.startsWith('http')) {
                    document.getElementById('nav-pfp').src = data.profile_pic;
                }

                // Background
                if (data.theme_bg) {
                    document.body.style.backgroundImage    = `url('${data.theme_bg}')`;
                    document.body.style.backgroundSize     = "cover";
                    document.body.style.backgroundPosition = "center";
                }

                // Theme color
                if (data.theme_color) {
                    document.documentElement.style.setProperty('--primary-teal', data.theme_color);
                }
            } else {
                document.getElementById('display-username').innerText = user.email.split('@')[0];
            }

        } catch (error) {
            console.error("Error loading user data:", error);
            document.getElementById('display-username').innerText = user.email.split('@')[0];
        }
    } else {
        if (localStorage.getItem('isRegistering') === 'true') {
            localStorage.removeItem('isRegistering');
            return;
        }
        window.location.href = "login.html";
    }
});

//FILE UPLOAD
const fileInput = document.getElementById('file-input');
if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        const user = auth.currentUser;

        if (file && user) {
            try {
                const fileExt  = file.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `${user.uid}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('modules')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('modules')
                    .getPublicUrl(filePath);

                // Save module
                await supabase.from('user_modules').insert({
                    user_id:    user.uid,
                    file_name:  file.name,
                    file_url:   publicUrl,
                    uploaded_at: new Date().toISOString()
                });

                Swal.fire({
                    title:'Upload Complete!',
                    text: 'Your module has been uploaded successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });

            } catch (error) {
                console.error("Upload Error:", error);
                Swal.fire('Upload Failed', error.message, 'error');
            }
        }
    });
}

//LOGOUT
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => { window.location.href = "login.html"; });
});

//BURGER MENU
const burgerBtn = document.getElementById('burgerBtn');
const sidebar   = document.getElementById('sidebar');
const overlay   = document.getElementById('sidebarOverlay');

burgerBtn.addEventListener('click', () => {
    burgerBtn.classList.toggle('open');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
});

overlay.addEventListener('click', () => {
    burgerBtn.classList.remove('open');
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
});

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        burgerBtn.classList.remove('open');
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
    });
});