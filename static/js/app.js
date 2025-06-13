document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const form = document.getElementById('predict-form');
    const fileInput = document.getElementById('image');
    const fileNameDisplay = document.getElementById('file-name');
    const loadingContainer = document.getElementById('loading-container');
    const loadingBar = document.getElementById('loading-bar');
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const resultContainer = document.getElementById('result-container');
    
    // URL del webhook n8n - VERIFICA QUE SEA CORRECTA
    const WEBHOOK_URL = 'https://joeldelacruzr.app.n8n.cloud/webhook-test/mri-analysis';
    
    // Manejar cambio de archivo
    fileInput.addEventListener('change', function(e) {
        fileNameDisplay.textContent = e.target.files[0]?.name || 'Haz clic para seleccionar una imagen';
        errorContainer.style.display = 'none';
    });
    
    // Manejar envío del formulario
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validar que se haya seleccionado un archivo
        if (!fileInput.files[0]) {
            showError('Por favor selecciona una imagen');
            return;
        }
        
        // Configurar estado de carga
        startLoading();
        
        try {
            // Preparar datos del formulario
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);  // Usar 'file' o 'image' según n8n
            
            // Enviar solicitud al servidor
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            // Manejar errores HTTP
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error del servidor (${response.status}): ${errorText || 'Sin detalles'}`);
            }
            
            // Procesar respuesta
            const responseText = await response.text();
            if (!responseText.trim()) {
                throw new Error('El servidor devolvió una respuesta vacía');
            }
            
            const data = JSON.parse(responseText);
            validateResponse(data);
            displayResults(data);
            
        } catch (error) {
            handleRequestError(error);
        } finally {
            finishLoading();
        }
    });
    
    // Función para iniciar carga
    function startLoading() {
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
            if (width >= 90) clearInterval(interval);
        }, 100);
    }
    
    // Función para finalizar carga
    function finishLoading() {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-search"></i> Analizar Imagen';
        loadingContainer.style.display = 'none';
    }
    
    // Función para validar respuesta del servidor
    function validateResponse(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Formato de respuesta inválido');
        }
        if (!data.result || data.probability === undefined) {
            throw new Error('Datos de respuesta incompletos');
        }
    }
    
    // Función para mostrar resultados
    function displayResults(data) {
        try {
            // Actualizar diagnóstico
            document.getElementById('result-content').textContent = data.result;
            document.getElementById('probability-value').textContent = (data.probability * 100).toFixed(2);
            
            // Actualizar estilos según resultado
            const resultSpan = document.getElementById('result-text');
            const icon = resultSpan.querySelector('i');
            if (data.result.includes('Tumor detectado')) {
                resultSpan.className = 'tumor-detected';
                icon.className = 'fas fa-exclamation-circle';
            } else {
                resultSpan.className = 'no-tumor';
                icon.className = 'fas fa-check-circle';
            }
            
            // Mostrar imágenes
            displayImage('original-image', data.original_image, 'Imagen original no disponible');
            
            if (data.mask) {
                displayImage('mask-image', data.mask, 'Máscara no disponible');
                document.getElementById('mask-card').style.display = 'block';
            } else {
                document.getElementById('mask-card').style.display = 'none';
            }
            
            if (data.overlay_image) {
                displayImage('overlay-image', data.overlay_image, 'Superposición no disponible');
                document.getElementById('overlay-card').style.display = 'block';
            } else {
                document.getElementById('overlay-card').style.display = 'none';
            }
            
            // Mostrar contenedor de resultados
            resultContainer.style.display = 'block';
            loadingBar.style.width = '100%';
            
        } catch (error) {
            console.error('Error mostrando resultados:', error);
            throw new Error('Error al mostrar los resultados');
        }
    }
    
    // Función auxiliar para mostrar imágenes con manejo de errores
    function displayImage(elementId, src, errorMessage) {
        const imgElement = document.getElementById(elementId);
        imgElement.src = src;
        imgElement.onerror = function() {
            this.onerror = null;
            this.parentElement.innerHTML = `
                <i class="fas fa-image" style="font-size:3rem;color:#ccc"></i>
                <p>${errorMessage}</p>
            `;
        };
    }
    
    // Función para manejar errores de la solicitud
    function handleRequestError(error) {
        console.error('Error completo:', error);
        
        let userMessage = 'Error al procesar la solicitud';
        if (error.message.includes('Failed to fetch')) {
            userMessage = 'No se pudo conectar al servidor. Verifica tu conexión.';
        } else if (error.message.includes('Unexpected end of JSON')) {
            userMessage = 'El servidor devolvió una respuesta no válida.';
        } else if (error.message.includes('CORS')) {
            userMessage = 'Error de configuración del servidor. Intente más tarde.';
        }
        
        showError(userMessage);
        loadingBar.style.width = '0';
    }
    
    // Función para mostrar errores
    function showError(message) {
        errorMessage.textContent = message;
        errorContainer.style.display = 'flex';
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
});
