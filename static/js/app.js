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
    
    // URL del webhook n8n (¡Verifica que sea la correcta!)
    const WEBHOOK_URL = 'https://joeldelacruzr.app.n8n.cloud/webhook-test/mri-analysis';
    
    // 1. Mostrar nombre del archivo seleccionado
    fileInput.addEventListener('change', function(e) {
        fileNameDisplay.textContent = e.target.files[0]?.name || 'Selecciona una imagen';
        errorContainer.style.display = 'none';
    });
    
    // 2. Manejar envío del formulario
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validar que se seleccionó una imagen
        if (!fileInput.files[0]) {
            showError('⚠️ Por favor, sube una imagen');
            return;
        }
        
        // Mostrar carga
        startLoading();
        
        try {
            // Preparar FormData
            const formData = new FormData();
            formData.append('image', fileInput.files[0]);
            
            // Enviar solicitud al webhook n8n
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
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
    
    // 3. Validar respuesta del servidor
    async function validateResponse(response) {
        // Si el servidor devuelve error HTTP
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Error desconocido');
            throw new Error(`❌ Error del servidor (${response.status}): ${errorText}`);
        }
        
        // Verificar si la respuesta está vacía
        const responseText = await response.text();
        if (!responseText.trim()) {
            throw new Error('🔴 El servidor no devolvió datos');
        }
        
        // Intentar parsear JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (error) {
            throw new Error('📛 La respuesta no es un JSON válido');
        }
        
        // Validar estructura mínima
        if (!data.result || typeof data.probability !== 'number' || !data.original_image) {
            console.error('Estructura incorrecta:', data);
            throw new Error('📦 La respuesta no tiene el formato esperado');
        }
        
        return data;
    }
    
    // 4. Mostrar resultados en el frontend
    function displayResults(data) {
        // Actualizar diagnóstico
        document.getElementById('result-content').textContent = data.result;
        document.getElementById('probability-value').textContent = `${(data.probability * 100).toFixed(2)}%`;
        
        // Cambiar estilo según el resultado
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
        displayImage('original-image', data.original_image, 'Imagen no disponible');
        
        // Mostrar máscara y overlay si hay tumor
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
        
        // Mostrar resultados
        resultContainer.style.display = 'block';
        loadingBar.style.width = '100%';
    }
    
    // 5. Mostrar imágenes con manejo de errores
    function displayImage(elementId, src, errorMessage) {
        const imgElement = document.getElementById(elementId);
        imgElement.onerror = () => {
            imgElement.parentElement.innerHTML = `
                <i class="fas fa-image" style="font-size:3rem;color:#ccc"></i>
                <p>${errorMessage}</p>
            `;
        };
        imgElement.src = src;
    }
    
    // 6. Manejar errores
    function handleRequestError(error) {
        console.error('Error completo:', error);
        
        let userMessage = '⛔ Error al procesar la imagen';
        if (error.message.includes('Failed to fetch')) {
            userMessage = '🔌 No se pudo conectar al servidor. Revisa tu conexión.';
        } else if (error.message.includes('JSON')) {
            userMessage = '📛 Respuesta inválida del servidor';
        }
        
        showError(userMessage);
        loadingBar.style.width = '0';
    }
    
    // 7. Animación de carga
    function startLoading() {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando...';
        loadingContainer.style.display = 'block';
        resultContainer.style.display = 'none';
        errorContainer.style.display = 'none';
        
        // Barra de progreso animada
        let width = 0;
        const interval = setInterval(() => {
            width += 5;
            loadingBar.style.width = `${width}%`;
            if (width >= 90) clearInterval(interval);
        }, 100);
    }
    
    // 8. Finalizar carga
    function finishLoading() {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-search"></i> Analizar Imagen';
        loadingContainer.style.display = 'none';
    }
    
    // 9. Mostrar errores
    function showError(message) {
        errorMessage.textContent = message;
        errorContainer.style.display = 'flex';
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
});
