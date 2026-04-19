(function () {
    const saved = localStorage.getItem('recallgen-theme');
    if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

    function syncToggle() {
        const toggle = document.getElementById('dark-mode-toggle');
        if (toggle) toggle.checked = isDark();

        const label = document.getElementById('dark-mode-label');
        if (label) label.textContent = isDark() ? 'Dark Mode' : 'Light Mode';
    }

    function hasCustomBg() {
        const bg = document.body.style.backgroundImage;
        return bg && bg !== 'none' && bg !== '';
    }

    function syncBannerToThemeColor() {
        const banner = document.getElementById('quickstart-banner');
        if (!banner) return;

        const hex = getComputedStyle(document.documentElement)
            .getPropertyValue('--primary-teal')
            .trim();

        if (!hex || hex.length < 4) return;

        let fullHex = hex;
        if (hex.length === 4) {
            fullHex = '#' + hex[1]+hex[1] + hex[2]+hex[2] + hex[3]+hex[3];
        }

        const r = parseInt(fullHex.slice(1, 3), 16);
        const g = parseInt(fullHex.slice(3, 5), 16);
        const b = parseInt(fullHex.slice(5, 7), 16);

        if (isDark()) {
            banner.style.background  = `linear-gradient(135deg, rgba(${r},${g},${b},0.18), rgba(${r},${g},${b},0.07))`;
            banner.style.borderColor = `rgba(${r},${g},${b},0.4)`;
        } else {
            banner.style.background  = `linear-gradient(135deg, rgba(${r},${g},${b},0.12), rgba(${r},${g},${b},0.04))`;
            banner.style.borderColor = `rgba(${r},${g},${b},0.3)`;
        }

        document.querySelectorAll('.qs-step-icon').forEach(el => {
            el.style.background = `rgba(${r},${g},${b},${isDark() ? '0.2' : '0.12'})`;
            el.style.color = fullHex;
        });

        document.querySelectorAll('.qs-step-num').forEach(el => {
            el.style.background = fullHex;
            el.style.color = '#fff';
        });

        const qsTitle = document.querySelector('.qs-title');
        if (qsTitle) qsTitle.style.color = fullHex;
    }

    function applyTheme(dark) {
        if (dark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('recallgen-theme', 'dark');
            if (!hasCustomBg()) {
                document.body.style.backgroundImage = 'linear-gradient(135deg, #0d0f18 0%, #1a1d2e 100%)';
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
            }
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('recallgen-theme', 'light');
            if (!hasCustomBg()) {
                document.body.style.backgroundImage = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
            }
        }
        syncToggle();
        syncBannerToThemeColor();
    }

    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) {
        toggle.addEventListener('change', () => applyTheme(toggle.checked));
    }

    syncToggle();

    setTimeout(syncBannerToThemeColor, 50);
});