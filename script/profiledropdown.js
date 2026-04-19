export async function initProfileDropdown(user, supabase) {
    const profilePreview = document.querySelector('.profile-preview');
    if (!profilePreview) return;

    const pfpSrc   = document.getElementById('nav-pfp')?.src || 'image/default-pfp.png';
    const username = document.getElementById('display-username')?.innerText || user.email.split('@')[0];
    const email    = user.email;

    const dropdown = document.createElement('div');
    dropdown.className = 'profile-dropdown';
    dropdown.id = 'profileDropdown';
    dropdown.innerHTML = `
        <div class="pd-header">
            <img class="pd-avatar" src="${pfpSrc}" alt="Profile" id="pd-pfp">
            <div>
                <div class="pd-name" id="pd-name">${username}</div>
                <div class="pd-email">${email}</div>
            </div>
        </div>
        <div class="pd-menu">
            <a href="modules.html" class="pd-item">
                <i class="fas fa-folder-open"></i> My uploads
            </a>
            <a href="results.html" class="pd-item">
                <i class="fas fa-history"></i> Quiz history
            </a>
            <a href="settings.html" class="pd-item">
                <i class="fas fa-cog"></i> Settings
            </a>
            <div class="pd-divider"></div>
            <button class="pd-item danger" id="pd-logout-btn">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        </div>
    `;

    profilePreview.appendChild(dropdown);

    profilePreview.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => {
        dropdown.classList.remove('open');
    });

    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    document.getElementById('pd-logout-btn').addEventListener('click', () => {
        document.getElementById('logout-btn').click();
    });

    const observer = new MutationObserver(() => {
        const pdPfp  = document.getElementById('pd-pfp');
        const pdName = document.getElementById('pd-name');
        const navPfp  = document.getElementById('nav-pfp');
        const navName = document.getElementById('display-username');
        if (pdPfp  && navPfp)  pdPfp.src        = navPfp.src;
        if (pdName && navName) pdName.innerText  = navName.innerText;
    });

    const navPfpEl  = document.getElementById('nav-pfp');
    const navNameEl = document.getElementById('display-username');
    if (navPfpEl)  observer.observe(navPfpEl,  { attributes: true, attributeFilter: ['src'] });
    if (navNameEl) observer.observe(navNameEl, { childList: true, subtree: true });
}