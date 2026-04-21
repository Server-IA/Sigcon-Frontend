// store/userReducer.js
const initialState = {
    user: null
};
  
export default function userReducer(state = initialState, action) {
    switch (action.type) {
        case "SET_USER":
            action.payload.isAdmin = action.payload.roles?.some(r => r === 'ADMIN' || r === 'SUPERADMIN') || false;
            // Bloque F multi-tenant: PLATFORM_ADMIN es super-usuario cross-empresa.
            // companyId / companyName / platformRole vienen del backend en /auth/login.
            action.payload.isPlatformAdmin = action.payload.platformRole === 'PLATFORM_ADMIN';
            localStorage.setItem('user', JSON.stringify(action.payload));
            return {
                ...state,
                user: action.payload
            };

        case "LOGOUT":
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            return {
                ...state,
                user: null,
                token: null
            };
        case "GET_USER":
            return {
                ...state,
                user: action.payload
            };

        case "SET_TOKEN":
            localStorage.setItem('token', action.payload);
            return {
                ...state,
                token: action.payload
            }; 

        case "GET_TOKEN":
            
            return {
                ...state,
                token: action.payload
            }; 

        default:
            return state;
    }
}
