// store/userReducer.js
const initialState = {
    user: null
};
  
export default function userReducer(state = initialState, action) {
    switch (action.type) {
        case "SET_USER":
            // HU-PA-12: isAdmin coincide con ADMIN_EMPRESA (rename glosario v2)
            action.payload.isAdmin = action.payload.roles?.some(
                r => r === 'ADMIN' || r === 'SUPERADMIN' || r === 'ADMIN_EMPRESA'
            ) || false;
            action.payload.isPlatformAdmin = action.payload.platformRole === 'PLATFORM_ADMIN';
            // HU-PA-11/12: effectivePermissions del backend ahora viene como array
            // de codes atomicos (ej. ['PAR.ROLES.CREAR', 'AR.FACTURAS_VENTA.VER', ...]).
            // El hook usePermissions() lee este array.
            action.payload.effectivePermissions = action.payload.effectivePermissions || [];
            localStorage.setItem('user', JSON.stringify(action.payload));
            return {
                ...state,
                user: action.payload
            };

        case "UPDATE_EFFECTIVE_PERMISSIONS":
            // HU-PA-12 E4: refresh sin recargar tras cambios de rol/permisos
            if (state.user) {
                const updated = { ...state.user, effectivePermissions: action.payload || [] };
                localStorage.setItem('user', JSON.stringify(updated));
                return { ...state, user: updated };
            }
            return state;

        case "LOGOUT":
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            // QA 2026-05-05: limpiar cache de identidad visual (todas las
            // claves scoped por tenant) para evitar bleed cross-empresa
            // cuando el siguiente login es de otra empresa.
            try {
                Object.keys(localStorage).forEach(k => {
                    if (k === 'sigcon_brand_theme' || k.startsWith('sigcon_brand_theme_')) {
                        localStorage.removeItem(k);
                    }
                });
            } catch (_) { /* ignore */ }
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
