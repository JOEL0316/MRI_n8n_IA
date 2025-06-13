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
    
    // URL del webhook n8n - VERIFICAR QUE SEA CORRECTA
    const WEBHOOK_URL = 'https://joeldelacruzr.app.n8n.cloud/webhook/mri-analysis';
    
    // Evento para mostrar nombre de archivo seleccionado
    fileInput.addEventListener('change', function(e) {
        fileNameDisplay.textContent = e.target.files[0]?.name || 'Haz clic para seleccionar una imagen';
        errorContainer.style.display = 'none';
    });
    
    // Manejar envío del formulario
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validar que se seleccionó un archivo
        if (!fileInput.files[0]) {
            showError('Por favor selecciona una imagen');
            return;
        }
        
        // Configurar estado de carga
        startLoading();
        
        try {
            // Preparar FormData
            const formData = new FormData();
            formData.append('image', fileInput.files[0]);
            
            // Enviar solicitud al webhook n8n
            const response = await fetchWithTimeout(WEBHOOK_URL, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            }, 30000); // 30 segundos de timeout
            
            // Validar respuesta
            const data = await validateResponse(response);
            
            // Mostrar resultados
            displayResults(data);
            
        } catch (error) {
            handleRequestError(error);
        } finally {
            finishLoading();
        }
    });
    
    // Función para fetch con timeout
    async function fetchWithTimeout(url, options, timeout) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw new Error(error.name === 'AbortError' ? 
                'La solicitud tardó demasiado. Intenta con una imagen más pequeña.' : 
                error.message);
        }
    }
    
    // Función para validar respuesta del servidor
    async function validateResponse(response) {
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Sin detalles');
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }
        
        const responseText = await response.text();
        
        if (!responseText.trim()) {
            throw new Error('El servidor devolvió una respuesta vacía');
        }
        
        try {
            const data = JSON.parse(responseText);
            
            // Validar estructura mínima de respuesta
            if (!data.result || data.probability === undefined || !data.original_image) {
                throw new Error('La respuesta no tiene el formato esperado');
            }
            
            // Validar que original_image es base64
            if (!data.original_image.startsWith('data:image')) {
                throw new Error('Formato de imagen original no válido');
            }
            
            return data;
            
        } catch (error) {
            throw new Error(`Error procesando respuesta: ${error.message}`);
        }
    }
    
    // Función para mostrar resultados
    function displayResults(data) {
        try {
            // Actualizar diagnóstico
            document.getElementById('result-content').textContent = data.result;
            document.getElementById('probability-value').textContent = 
                (data.probability * 100).toFixed(2);
            
            // Actualizar estilos según resultado
            updateResultStyle(data.result, data.probability);
            
            // Mostrar imágenes
            displayImage('original-image', data.original_image, 'Imagen original no disponible');
            
            // Mostrar máscara y overlay si existen
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
    
    // Función para actualizar estilos del resultado
    function updateResultStyle(result, probability) {
        const resultSpan = document.getElementById('result-text');
        const icon = resultSpan.querySelector('i');
        
        if (result.includes('Tumor detectado')) {
            resultSpan.className = 'tumor-detected';
            icon.className = 'fas fa-exclamation-circle';
            
            // Opcional: Cambiar color basado en probabilidad
            const intensity = Math.min(probability * 2, 1);
            resultSpan.style.setProperty('--danger', `rgba(247, 37, 133, ${intensity})`);
        } else {
            resultSpan.className = 'no-tumor';
            icon.className = 'fas fa-check-circle';
        }
    }
    
    // Función para mostrar imágenes con manejo de errores
    function displayImage(elementId, src, errorMessage) {
        const imgElement = document.getElementById(elementId);
        if (!src) {
            imgElement.parentElement.innerHTML = `
                <i class="fas fa-image" style="font-size:3rem;color:#ccc"></i>
                <p>${errorMessage}</p>
            `;
            return;
        }
        
        imgElement.src = src;
        imgElement.onerror = function() {
            this.onerror = null;
            this.parentElement.innerHTML = `
                <i class="fas fa-image" style="font-size:3rem;color:#ccc"></i>
                <p>${errorMessage}</p>
            `;
        };
    }
    
    // Función para manejar errores
    function handleRequestError(error) {
        console.error('Error completo:', error);
        
        let userMessage = 'Error al procesar la solicitud';
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('AbortError')) {
            userMessage = 'No se pudo conectar al servidor. Verifica tu conexión.';
        } else if (error.message.includes('Unexpected end of JSON')) {
            userMessage = 'El servidor devolvió una respuesta no válida.';
        } else if (error.message.includes('timeout')) {
            userMessage = 'La solicitud tardó demasiado. Intenta con una imagen más pequeña.';
        } else {
            userMessage = error.message;
        }
        
        showError(userMessage);
        loadingBar.style.width = '0';
    }
    
    // Función para mostrar estado de carga
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
    
    // Función para mostrar errores
    function showError(message) {
        errorMessage.innerHTML = message;
        errorContainer.style.display = 'flex';
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
});
