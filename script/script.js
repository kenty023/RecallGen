window.addEventListener('load', () => {
    const loadingText = document.getElementById('loading-text');
    const continueBtn = document.getElementById('continue-btn');
    const loadingScreen = document.getElementById('loading-screen');

    setTimeout(() => {
        if (loadingText) loadingText.style.display = 'none';
        if (continueBtn) continueBtn.style.display = 'block';
    
        loadingScreen.style.cursor = 'pointer';
    }, 2500); 
});

document.getElementById('loading-screen').addEventListener('click', () => {
    const btn = document.getElementById('continue-btn');
    const screen = document.getElementById('loading-screen');

    if (btn.style.display === 'block') {
        screen.style.opacity = '0'; 
        setTimeout(() => {
            window.location.href = 'login.html'; 
        }, 500); 
    }
});