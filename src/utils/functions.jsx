export const base_url = (array = [], get = {}) => {

    let url = '';
    const env = import.meta.env.MODE || 'local';

    switch(env){
        case 'development':
            url = import.meta.env.VITE_API_URL_LOCAL || 'http://localhost:8080/';
            break;
        case 'production':
            url = import.meta.env.VITE_API_URL_PRODUCTION || 'https://api.inmero.co/sigcon/';
            break;
        case 'development':
            url = import.meta.env.VITE_API_URL_DEVELOPMENT || 'https://test.inmero.co/sigcon/';
            break;
        default:
            url = import.meta.env.VITE_API_URL_LOCAL || 'http://localhost:8080/';
            break;
    }

    var path = array.length > 0 ? array.join('/') : ''; // Construir el path
    var getData = Object.entries(get)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '') // Filtrar valores vacíos
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`) // Codificar valores
        .join('&');

    const urlFinal = getData ? `${url}${path}?${getData}` : `${url}${path}`;
  
    return urlFinal;
}


export const base_redirect_path = (is_login = false) => {
    const joinPath = (...parts) =>
        parts.join('/').replace(/\/+/g, '/')
      
    const base = import.meta.env.MODE === 'production' ? '/sigcon/' : '/'
      
    const path = is_login
        ? joinPath(base, '/login')
        : joinPath(base, '/dashboard')

    console.log(['path', path]);

    return path
}

export const validarArrays = (a, b) => {
    if (a.length !== b.length) return false;
  
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
  
    return sortedA.every((value, index) => value === sortedB[index]);
}
  

export const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};
