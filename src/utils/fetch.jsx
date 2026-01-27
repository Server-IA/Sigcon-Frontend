export const request = async (url, data = {}, method = 'POST', time = 500, headers = {}) => {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    };
    if (data) {
        options.body = JSON.stringify(data);
    }

    window.toastr.clear();

    if(time != 0){
        window.Swal.fire({
            showConfirmButton: false,
            allowOutsideClick: false,
            customClass: {},
            willOpen: function () {
                Swal.showLoading();
            }
        });
    }

    return fetch(url, options).then(async response => {
        if (response.redirected)
          window.location.href = response.url;
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(JSON.stringify({
                msg: errorData.msg || 'Error desconocido',
                title: errorData.title || 'Error en la consulta',
                error: errorData.error || 'Error general'
            }));
        }
        const responseData = await response.json();
        return new Promise(resolve => {
            window.Swal.close();
            resolve(responseData);
        });
    }).catch(error => {
        window.Swal.close();
        console.error(error);
    
        // 🔴 Error de red (backend caído, conexión rechazada, CORS)
        if (error instanceof TypeError) {
            window.Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudo conectar con el servidor.',
                allowOutsideClick: false,
                customClass: {
                    confirmButton: 'btn btn-primary waves-effect'
                }
            });
    
            return Promise.reject({
                title: 'Error de conexión',
                msg: 'Servidor no disponible',
                error: error.message
            });
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
    get: (url, headers = {}, time = 1) => request(url, null, 'GET', time, headers),
    post: (url, data, headers = {}, time = 1) => request(url, data, 'POST', time, headers),
    put: (url, data, headers = {}, time = 1) => request(url, data, 'PUT', time, headers),
    delete: (url, data, headers = {}, time = 1) => request(url, null, 'DELETE', time, headers),
};