export const base_url = (array = [], get = {}) => {
    var environment = import.meta.env.VITE_ENVIRONMENT;
    var url = '';
    if(environment === 'local'){
        url = import.meta.env.VITE_API_URL_LOCAL;
    }else if(environment === 'development'){
        url = import.meta.env.VITE_API_URL_DEVELOPMENT;
    }else if(environment === 'production'){
        url = import.meta.env.VITE_API_URL_PRODUCTION;
    }// Asegurar que haya una URL base

    var path = array.length > 0 ? array.join('/') : ''; // Construir el path
    var getData = Object.entries(get)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '') // Filtrar valores vacíos
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`) // Codificar valores
        .join('&');

    const urlFinal = getData ? `${url}${path}?${getData}` : `${url}${path}`;
  
    return urlFinal;
}

export const toast = (message, type) => {
    toast.success(message);
}