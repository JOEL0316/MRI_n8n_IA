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
    
    // URL del webhook n8n - ¡VERIFICA QUE SEA CORRECTA!
    const WEBHOOK_URL = 'https://joeldelacruzr.app.n8n.cloud/webhook-test/mri-analysis';
    
    // 1. Mostrar nombre del archivo seleccionado
    fileInput.addEventListener('change', function(e) {
        fileNameDisplay.textContent = e.target.files[0]?.name || 'Selecciona una imagen';
        errorContainer.style.display = 'none';
    });
    
    // 2. Manejar envío del formulario
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!fileInput.files[0]) {
            showError('⚠️ Por favor, sube una imagen');
            return;
        }
        
        startLoading();
        
        try {
            const formData = new FormData();
            // Probar con 'file' o 'image' según lo que espere n8n
            formData.append('image', fileInput.files[0]);
            
            const response = await fetchWithTimeout(WEBHOOK_URL, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            }, 30000); // 30 segundos de timeout
            
            const data = await processResponse(response);
            displayResults(data);
            
        } catch (error) {
            handleRequestError(error);
        } finally {
            finishLoading();
        }
    });
    
    // 3. Función para fetch con timeout
    async function fetchWithTimeout(url, options, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw new Error(error.name === 'AbortError' ? 
                '⌛ La solicitud tardó demasiado. Intenta con una imagen más pequeña.' : 
                '🔌 Error de conexión: ' + error.message);
        }
    }
    
    // 4. Procesar respuesta del servidor
    async function processResponse(response) {
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Sin detalles');
            throw new Error(`❌ Error del servidor (${response.status}): ${errorText}`);
        }
        
        const responseText = await response.text();
        
        if (!responseText.trim()) {
            throw new Error('🔴 El servidor no devolvió datos');
        }
        
        try {
            const data = JSON.parse(responseText);
            console.log('Datos recibidos:', data); // Para diagnóstico
            
            // Convertir array a objeto si es necesario
            const responseData = Array.isArray(data) ? data[0] : data;
            
            // Validar estructura mínima
            if (!responseData || typeof responseData !== 'object') {
                throw new Error('Estructura de datos inválida');
            }
            
            // Campos obligatorios
            const requiredFields = {
                result: 'string',
                probability: 'number',
                original_image: 'string'
            };
            
            for (const [field, type] of Object.entries(requiredFields)) {
                if (responseData[field] === undefined) {
                    throw new Error(`Falta el campo requerido: ${field}`);
                }
                if (typeof responseData[field] !== type) {
                    throw new Error(`El campo ${field} debe ser ${type}`);
                }
            }
            
            return responseData;
            
        } catch (error) {
            throw new Error(`📛 Error procesando respuesta: ${error.message}`);
        }
    }
    
    // 5. Mostrar resultados
    function displayResults(data) {
        // Actualizar diagnóstico
        document.getElementById('result-content').textContent = data.result;
        document.getElementById('probability-value').textContent = 
            `${(data.probability * 100).toFixed(2)}%`;
        
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
        
        // Mostrar imágenes con manejo de errores
        displayImage('original-image', data.original_image, 'Imagen no disponible');
        
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
        
        resultContainer.style.display = 'block';
    }
    
    // 6. Mostrar imágenes
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
    
    // 7. Manejar errores
    function handleRequestError(error) {
        console.error('Error completo:', error);
        
        let userMessage = '⛔ Error al procesar la imagen';
        if (error.message.includes('tardó demasiado')) userMessage = error.message;
        if (error.message.includes('conexión')) userMessage = error.message;
        if (error.message.includes('servidor')) userMessage = error.message;
        if (error.message.includes('procesando')) userMessage = 'Formato de respuesta incorrecto';
        
        showError(userMessage);
    }
    
    // 8. Animación de carga
    function startLoading() {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando...';
        loadingContainer.style.display = 'block';
        resultContainer.style.display = 'none';
        
        let width = 0;
        const interval = setInterval(() => {
            width += 5;
            loadingBar.style.width = `${width}%`;
            if (width >= 90) clearInterval(interval);
        }, 100);
    }
    
    // 9. Finalizar carga
    function finishLoading() {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-search"></i> Analizar Imagen';
        loadingContainer.style.display = 'none';
    }
    
    // 10. Mostrar errores
    function showError(message) {
        errorMessage.textContent = message;
        errorContainer.style.display = 'flex';
        
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
});
