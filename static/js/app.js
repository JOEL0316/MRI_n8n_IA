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
    
    // Configuración del Webhook n8n - Asegúrate que esta URL es correcta
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
            if (width >= 90) clearInterval(interval); // Detener al 90% para esperar respuesta
        }, 100);
        
        try {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                body: formData,
                mode: 'cors', // Habilitar CORS explícitamente
                headers: {
                    // Asegúrate que n8n tenga estos headers configurados también
                    'Accept': 'application/json'
                }
            });
            
            // Verificar si la respuesta es OK (status 200-299)
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message || 
                    `Error del servidor: ${response.status} ${response.statusText}`
                );
            }
            
            // Procesar la respuesta exitosa
            const data = await response.json();
            
            // Validar estructura básica de la respuesta
            if (!data.result || data.probability === undefined) {
                throw new Error('Respuesta del servidor no válida');
            }
            
            // Mostrar resultados
            displayResults(data);
            loadingBar.style.width = '100%'; // Completar la barra al terminar
            
        } catch (error) {
            console.error('Error en la solicitud:', error);
            
            // Manejar específicamente errores de CORS
            if (error.message.includes('Failed to fetch') || 
                error.message.includes('CORS policy')) {
                showError('Error de conexión con el servidor. Verifica tu conexión o intenta más tarde.');
            } else {
                showError(error.message || 'Error al procesar la imagen. Por favor intenta nuevamente.');
            }
            
            // Resetear la barra de progreso
            loadingBar.style.width = '0';
        } finally {
            clearInterval(interval);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-search"></i> Analizar Imagen';
            loadingContainer.style.display = 'none';
        }
    });
    
    function displayResults(data) {
        try {
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
            
            // Mostrar imágenes con manejo de errores
            const originalImage = document.getElementById('original-image');
            const maskImage = document.getElementById('mask-image');
            const overlayImage = document.getElementById('overlay-image');
            const maskCard = document.getElementById('mask-card');
            const overlayCard = document.getElementById('overlay-card');
            
            // Función para manejar errores en imágenes
            const handleImageError = (imgElement, fallbackText) => {
                imgElement.onerror = null;
                imgElement.parentElement.innerHTML = `
                    <i class="fas fa-image" style="font-size:3rem;color:#ccc"></i>
                    <p>${fallbackText}</p>
                `;
            };
            
            // Cargar imágenes con manejo de errores
            originalImage.src = data.original_image;
            originalImage.onerror = () => handleImageError(originalImage, 'Imagen no disponible');
            
            if (data.mask) {
                maskImage.src = data.mask;
                maskImage.onerror = () => handleImageError(maskImage, 'Máscara no disponible');
                maskCard.style.display = 'block';
            } else {
                maskCard.style.display = 'none';
            }
            
            if (data.overlay_image) {
                overlayImage.src = data.overlay_image;
                overlayImage.onerror = () => handleImageError(overlayImage, 'Superposición no disponible');
                overlayCard.style.display = 'block';
            } else {
                overlayCard.style.display = 'none';
            }
            
            // Mostrar contenedor de resultados
            resultContainer.style.display = 'block';
            
        } catch (error) {
            console.error('Error mostrando resultados:', error);
            showError('Error al mostrar los resultados. Los datos pueden estar incompletos.');
        }
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorContainer.style.display = 'flex';
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
});
