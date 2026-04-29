import { useState, useEffect } from 'react';
import LoginForm from '../../components/organism/LoginForm';
import '../../styles/auth-login.css';
import {base_url} from '../../utils/functions';
import { fetchHelper } from '../../utils/fetch';
import { useDispatch } from 'react-redux';
import { base_redirect_path } from '../../utils/functions';


const LoginPage = () => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    usernameOrEmail: 'superadmin@gmail.com',
    password: '123456',
    rememberMe: false
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
        };
        dispatch({ type: "SET_USER", payload: enriched });
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