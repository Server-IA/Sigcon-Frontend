import { useState, useEffect } from 'react';
import LoginForm from '../../components/organism/LoginForm';
import '../../styles/auth-login.css';
import {base_url} from '../../utils/functions';
import { fetchHelper } from '../../utils/fetch';
import { useDispatch } from 'react-redux';
import { base_redirect_path } from '../../utils/functions';


// BUG-Login (doc QA v2, 2026-06-03 / Imagen 2): "Recuérdame".
// - ANTES: el formulario nacia con credenciales HARDCODEADAS
//   (usernameOrEmail='superadmin@gmail.com', password='123456'), por lo que los
//   campos aparecian precargados incluso sin marcar "Recuérdame".
// - AHORA: los campos arrancan VACIOS salvo que exista una marca de "Recuérdame"
//   guardada. Si el usuario marca la casilla e inicia sesion, se persisten
//   usuario y contrasena (la contrasena en base64 — "cifrado basico" segun el
//   doc, para no dejarla en texto plano) y se precargan en el siguiente ingreso.
//   Al desmarcar la casilla o cerrar sesion explicitamente, se eliminan.
const REMEMBER_KEY = 'sigcon_remember';
const readRemembered = () => {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return { user: obj.u || '', pwd: obj.p ? atob(obj.p) : '' };
  } catch { return null; }
};

const LoginPage = () => {
  const dispatch = useDispatch();
  const remembered = readRemembered();
  const [formData, setFormData] = useState({
    usernameOrEmail: remembered?.user || '',
    password: remembered?.pwd || '',
    rememberMe: !!remembered
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fix bfcache: tras login exitoso se navega con window.location.href dejando
  // isLoading=true. Si el usuario regresa con "atras" del navegador, Chrome/Firefox
  // restauran la pagina desde el back-forward cache con el state intacto y el
  // boton queda eternamente en "Cargando...". Escuchamos pageshow.persisted
  // para resetear el estado y que el formulario sea utilizable de nuevo.
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) {
        setIsLoading(false);
        setError('');
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (error) setError('');
  };

  const handleSubmit = async(e) => {
    e.preventDefault();
    
    // Validación básica
    if (!formData.usernameOrEmail || !formData.password) {
      setError('Por favor completa todos los campos');
      return;
    }

    // BUG-Login (doc QA v2, 2026-06-03): "Recuérdame" funcional. Si esta
    // marcado, se guardan usuario y contrasena (la contrasena en base64) para
    // precargarlos en el proximo ingreso; si no, se borra la marca.
    try {
      if (formData.rememberMe) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({
          u: formData.usernameOrEmail,
          p: btoa(formData.password || ''),
        }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch { /* localStorage no disponible: ignorar */ }

    setIsLoading(true);
    const url = base_url(['auth', 'login'])
    
    try {
      const response = await fetchHelper.post(url, formData, {}, 1000);
      
      console.log('Response:', response);

      //validar token
      const {data: responseData} = response; 
      //Saaber si se recibio token 
      if(!responseData.token){setError('Error al validar las credenciales'); setIsLoading(false); return;}
      //guardartoken en localstorage 
      localStorage.setItem('token', responseData.token);
      dispatch({ type: "SET_TOKEN", payload: responseData.token });
      //peticion para btener la informacion del usuario 
      const userUrl = base_url(['users']);
      const userResponse = await fetchHelper.get(userUrl, {}, 1000); 
      console.log('User response:', userResponse);
      if(userResponse.data){
        // Bloque F: el endpoint /auth/login devuelve companyId/companyName/platformRole
        // que se mergea con el resto de info del usuario para alimentar Redux + header.
        const enriched = {
          ...userResponse.data,
          companyId: responseData.companyId ?? null,
          companyName: responseData.companyName ?? null,
          platformRole: responseData.platformRole ?? null,
          // HU-PA-01 + HU-PA-11: effectivePermissions y roles vienen del /auth/login
          // y son la fuente de verdad del hook usePermissions.
          effectivePermissions: responseData.effectivePermissions || [],
          fullName: responseData.fullName ?? null,
          // Si el login devuelve roles top-level (E1.0), usarlos; sino caer al rol de userResponse
          roles: responseData.roles && responseData.roles.length > 0
                  ? responseData.roles
                  : (userResponse.data.roles || []),
        };
        dispatch({ type: "SET_USER", payload: enriched });

        // QA Bloque AV (HU-PA-BRAND-01 post-login refresh, 2026-05-14): cargar
        // la identidad visual de la empresa del usuario y persistir en
        // localStorage ANTES del redirect. Asi tras window.location.href, el
        // IIFE hydrateBrandThemeAtBoot() en main.jsx lee el localStorage
        // recien populado y aplica el theme correcto al primer paint, sin
        // requerir entrar al apartado Identidad Visual ni recargar la pagina.
        //
        // Antes (Bug QA 2026-05-14): LOGOUT borra localStorage[sigcon_brand_theme_*]
        // por aislamiento cross-tenant. Tras re-login el localStorage estaba
        // vacio y el dashboard mostraba "Barcelona" (companyName del backend)
        // en lugar del brandName custom hasta que el usuario refrescara la
        // pagina o entrara a Identidad Visual.
        if (enriched.companyId && !enriched.isPlatformAdmin) {
          try {
            const brandResp = await fetchHelper.get(
              base_url(['api', 'parametrization', 'brand-config'])
            );
            const cfg = brandResp?.data;
            if (cfg) {
              const scopedKey = `sigcon_brand_theme_${enriched.companyId}`;
              localStorage.setItem(scopedKey, JSON.stringify({
                primaryColor: cfg.primaryColor || '#1E5DAB',
                secondaryColor: cfg.secondaryColor || '#F4A623',
                brandName: cfg.brandName ?? null,
                logoData: cfg.logoData ?? null,
                savedAt: new Date().toISOString(),
              }));
            }
          } catch (brandErr) {
            // Defensive: si el fetch del brand falla, no romper el login.
            // El usuario vera el theme default hasta que entre a Identidad
            // Visual.
            console.warn('[login] no se pudo precargar brand-config:', brandErr?.message || brandErr);
          }
        }
      }
      //Redirigir al DashBoard
      window.location.href = base_redirect_path(false);
    } catch (err) {
      console.error('Error en el login:', err);
      //err desde el fetch.jsx
      const backendError = err?.msg || 'Error inesperado. Intente nuevamente.';
      setError(backendError);
      setIsLoading(false);
    }
  };
    
  return (
    <LoginForm
      formData={formData}
      onInputChange={handleInputChange}
      onSubmit={handleSubmit}
      error={error}
      onErrorClose={() => setError('')}
      isLoading={isLoading}
    />
  );
};

export default LoginPage;