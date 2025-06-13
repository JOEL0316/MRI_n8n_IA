document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('predict-form');
    const fileInput = document.getElementById('image');
    const fileNameDisplay = document.getElementById('file-name');
    const loadingContainer = document.getElementById('loading-container');
    const loadingBar = document.getElementById('loading-bar');
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const resultContainer = document.getElementById('result-container');
    
    // Configuración del Webhook n8n
    const WEBHOOK_URL = 'https://joeldelacruzr.app.n8n.cloud/webhook-test/mri-analysis';
    
    fileInput.addEventListener('change', function(e) {
        fileNameDisplay.textContent = e.target.files[0]?.name || 'Haz clic para seleccionar una imagen';
        errorContainer.style.display = 'none';
    });
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!fileInput.files[0]) {
            showError('Por favor selecciona una imagen');
            return;
        }
        
        // Mostrar carga
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        loadingContainer.style.display = 'block';
        resultContainer.style.display = 'none';
        errorContainer.style.display = 'none';
        
        // Animación de carga
        let width = 0;
        const interval = setInterval(() => {
            width += 5;
            loadingBar.style.width = `${width}%`;
            if (width >= 100) clearInterval(interval);
        }, 100);
        
        try {
            const formData = new FormData();
            formData.append('image', fileInput.files[0]);
            
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Mostrar resultados
            displayResults(data);
            
        } catch (error) {
            console.error('Error:', error);
            showError('Error al procesar la imagen. Por favor intenta nuevamente.');
        } finally {
            clearInterval(interval);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-search"></i> Analizar Imagen';
            loadingContainer.style.display = 'none';
            loadingBar.style.width = '0';
        }
    });
    
    function displayResults(data) {
        // Actualizar el diagnóstico
        const resultText = document.getElementById('result-content');
        const probabilityValue = document.getElementById('probability-value');
        const resultSpan = document.getElementById('result-text');
        
        resultText.textContent = data.result;
        probabilityValue.textContent = (data.probability * 100).toFixed(2);
        
        // Actualizar clases CSS según el resultado
        const icon = resultSpan.querySelector('i');
        if (data.result.includes('Tumor detectado')) {
            resultSpan.className = 'tumor-detected';
            icon.className = 'fas fa-exclamation-circle';
        } else {
            resultSpan.className = 'no-tumor';
            icon.className = 'fas fa-check-circle';
        }
        
        // Mostrar imágenes
        const originalImage = document.getElementById('original-image');
        const maskImage = document.getElementById('mask-image');
        const overlayImage = document.getElementById('overlay-image');
        const maskCard = document.getElementById('mask-card');
        const overlayCard = document.getElementById('overlay-card');
        
        originalImage.src = data.original_image;
        
        if (data.mask) {
            maskImage.src = data.mask;
            maskCard.style.display = 'block';
        } else {
            maskCard.style.display = 'none';
        }
        
        if (data.overlay_image) {
            overlayImage.src = data.overlay_image;
            overlayCard.style.display = 'block';
        } else {
            overlayCard.style.display = 'none';
        }
        
        // Mostrar contenedor de resultados
        resultContainer.style.display = 'block';
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorContainer.style.display = 'flex';
    }
});