export const base_url = (array = [], get = {}) => {

    let url = '';
    if(import.meta.env.MODE === "production"){
        url = "https://api.inmero.co/sigcon/";
    }else{
        url = "http://localhost:8080/";
    }

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