import { base_redirect_path } from './functions';

export const request = async (url, data = {}, method = 'POST', time = 500, headers = {}, showErrorAlert, useToken) => {

    if (useToken) {
        const token = localStorage.getItem('token');
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
    }

    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;

    const options = {
        method,
        headers: {
            ...headers
        },
    };
    if (!isFormData) {
        options.headers['Content-Type'] = 'application/json';
    }
    if (data) {
        options.body = isFormData ? data : JSON.stringify(data);
    }

    if (time != 0) {
        window.Swal.fire({
            showConfirmButton: false,
            allowOutsideClick: false,
            customClass: {},
            willOpen: function () {
                Swal.showLoading();
            }
        });
    }
    // Timeout de 15 segundos para evitar que se quede colgado
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    options.signal = controller.signal;

    return fetch(url, options).then(async response => {
        clearTimeout(timeoutId);
        if (response.redirected)
            window.location.href = response.url;

        if (response.status == 401) {
            throw new Error(JSON.stringify({
                msg: 'Por favor inicia sesión nuevamente',
                title: 'Sesión expirada',
                error: 'Error general',
                status: 401
            }));
        } else if (response.status == 403) {
            throw new Error(JSON.stringify({
                msg: 'No tienes permisos para acceder a este recurso',
                title: 'Permiso denegado',
                error: 'Error general',
                status: 403
            }));
        }

        if (!response.ok) {
            const errorData = await response.json();

            // Algunos endpoints (ej. JournalEntryController) devuelven solo {"error": "..."}
            // sin msg/message. Aceptamos cualquiera de los tres para no mostrar
            // "Error desconocido" cuando el backend si dio un mensaje claro.
            const backendMsg = errorData.msg || errorData.message || errorData.error;
            // QA Bloque PA Bug 10/11 (2026-05-09): propagar campos extra que algunos
            // endpoints incluyen en el body de error (ej. affectedUsers en deleteRole).
            // Sin esto el frontend no puede mostrar la lista detallada al usuario.
            const extraKeys = ['affectedUsers', 'affectedUsersCount', 'usersWithOnlyThisRole', 'data'];
            const extra = {};
            extraKeys.forEach(k => { if (errorData[k] !== undefined) extra[k] = errorData[k]; });
            throw new Error(JSON.stringify({
                msg: backendMsg || 'Error desconocido',
                title: errorData.title || 'Error en la consulta',
                error: errorData.error || 'Error general',
                status: response.status,
                errors: errorData.errors || errorData.details || [],
                ...extra
            }));
        }

        const responseData = await response.json();
        return new Promise(resolve => {
            window.Swal.close();
            resolve(responseData);
        });
    }).catch(async error => {
        clearTimeout(timeoutId);
        window.Swal.close();
        // Errores de red (fetch fail por backend caido, CORS, abort) usan
        // console.debug para no llenar la consola en escenarios esperados
        // (ej. NotificationBell polling durante reload del backend).
        // Errores estructurados del backend (JSON con msg) sí loguean a error.
        // Nota: este chequeo basico es para decidir el nivel de log; mas abajo
        // hay un isNetworkError extendido (con includes) para decidir reintentos.
        const isNetworkErrorEarly = error instanceof TypeError
            || (error && error.name === 'AbortError');
        if (isNetworkErrorEarly) {
            console.debug('[fetch network]', error.message);
        } else {
            console.error(error);
        }
        // 🟡 Error controlado del backend (JSON)
        let error_parse;
        try {
            error_parse = JSON.parse(error.message);
        } catch {
            error_parse = {
                title: 'Error',
                msg: 'Error inesperado',
                error: error.message
            };
        }

        if (error_parse.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            window.Swal.fire({
                title: error_parse.title,
                text: error_parse.msg,
                icon: "warning",
                confirmButtonText: "Ir al login",
                allowOutsideClick: false,
                showConfirmButton: true,
                showCancelButton: false,
                showCloseButton: false,
                customClass: {
                    confirmButton: 'btn btn-primary waves-effect'
                }
            });

            window.location.href = base_redirect_path(true);

            return Promise.reject(error_parse);
        } else if (error_parse.status === 403) {
            if (showErrorAlert) {
                window.Swal.fire({
                    icon: 'error',
                    title: error_parse.title,
                    text: error_parse.msg || error_parse.error,
                    allowOutsideClick: false,
                    customClass: {
                        confirmButton: 'btn btn-primary waves-effect'
                    }
                });
            }
            return Promise.reject(error_parse);
        } else if (error_parse.status === 400 && error_parse.msg === 'Usuario no encontrado') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }

        // 🔴 Error de red (backend caído, conexión rechazada, CORS)
        const isNetworkError = error instanceof TypeError ||
            error.name === 'AbortError' ||
            (error.message && (
                error.message.includes('Failed to fetch') ||
                error.message.includes('NetworkError') ||
                error.message.includes('Network request failed') ||
                error.message.includes('Load failed') ||
                error.message.includes('The operation was aborted') ||
                error.message.includes('aborted')
            )) ||
            (error_parse.error && (
                error_parse.error.includes('Failed to fetch') ||
                error_parse.error.includes('NetworkError') ||
                error_parse.error.includes('Load failed') ||
                error_parse.error.includes('aborted')
            ));

        if (isNetworkError) {
            // Mostrar indicador de reintento
            window.Swal.fire({
                title: 'Reintentando conexión...',
                text: 'Se perdió la conexión con el servidor. Reintentando...',
                icon: 'info',
                showConfirmButton: false,
                allowOutsideClick: false,
                willOpen: function () {
                    Swal.showLoading();
                },
                customClass: {
                    confirmButton: 'btn btn-primary waves-effect'
                }
            });

            // Esperar 2 segundos y reintentar
            await new Promise(resolve => setTimeout(resolve, 2000));

            try {
                // Nuevo AbortController para el reintento
                const retryController = new AbortController();
                const retryTimeoutId = setTimeout(() => retryController.abort(), 15000);
                const retryOptions = { ...options, signal: retryController.signal };
                const retryResponse = await fetch(url, retryOptions);
                clearTimeout(retryTimeoutId);
                if (!retryResponse.ok) {
                    throw new Error('Retry failed with status: ' + retryResponse.status);
                }
                const retryData = await retryResponse.json();
                window.Swal.close();
                return retryData;
            } catch (retryError) {
                // Reintento fallido: mostrar error definitivo
                window.Swal.fire({
                    icon: 'error',
                    title: 'Sin conexión',
                    html: '<p>No se pudo conectar con el servidor después de reintentar.</p><p class="text-muted mb-0">Verifique su conexión a internet e intente nuevamente.</p>',
                    allowOutsideClick: false,
                    confirmButtonText: 'Entendido',
                    customClass: {
                        confirmButton: 'btn btn-primary waves-effect'
                    }
                });

                return Promise.reject({
                    title: 'Sin conexión',
                    msg: 'Servidor no disponible',
                    error: error.message
                });
            }
        }

        if (showErrorAlert)
            window.Swal.fire({
                icon: 'error',
                title: error_parse.title,
                text: error_parse.msg || error_parse.error,
                allowOutsideClick: false,
                customClass: {
                    confirmButton: 'btn btn-primary waves-effect'
                }
            });

        return Promise.reject(error_parse);
    });
}

export const fetchHelper = {
    get: (url, headers = {}, time = 1, showErrorAlert = false, useToken = true) => request(url, null, 'GET', time, headers, showErrorAlert, useToken),
    post: (url, data, headers = {}, time = 1, showErrorAlert = false, useToken = true) => request(url, data, 'POST', time, headers, showErrorAlert, useToken),
    /** POST multipart (pase FormData como data; no fija Content-Type para que el navegador envíe boundary) */
    postForm: (url, formData, headers = {}, time = 1, showErrorAlert = false, useToken = true) =>
        request(url, formData, 'POST', time, headers, showErrorAlert, useToken),
    put: (url, data, headers = {}, time = 1, showErrorAlert = false, useToken = true) => request(url, data, 'PUT', time, headers, showErrorAlert, useToken),
    patch: (url, data, headers = {}, time = 1, showErrorAlert = false, useToken = true) => request(url, data, 'PATCH', time, headers, showErrorAlert, useToken),
    delete: (url, data, headers = {}, time = 1, showErrorAlert = false, useToken = true) => request(url, data, 'DELETE', time, headers, showErrorAlert, useToken),
};