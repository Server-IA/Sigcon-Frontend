import { useState } from 'react';
import {useNavigate} from 'react-router-dom'; 
import LoginForm from '../../components/organism/LoginForm'; 
import '../../styles/auth-login.css'; 
import {base_url} from '../../utils/functions'; 
import { fetchHelper } from '../../utils/fetch';

const LoginPage = () => {
  const navigate = useNavigate(); 

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    if (!formData.email || !formData.password) {
      setError('Por favor completa todos los campos');
      return;
    }
    
    setIsLoading(true);
    const url = base_url(['auth', 'login'])
    
    try {
    const response = await fetchHelper.post(url, formData, {}, 1000)
    console.log('Login response:', response);
    
    //validar respuesta del login 
    if (!response) {
        setError('No se pudo completar la petición. Intente nuevamente o contacte con el administrador');
        setIsLoading(false);
        return;
      }

    //validar token
    const {token} = response; 
    //Saaber si se recibio token 
    if(!token){setError('Error al validar las credenciales'); setIsLoading(false); return;}
    //guardartoken en localstorage 
    localStorage.setItem('token', token); 
    localStorage.getItem("token");
    //Redirigir al DashBoard 
    navigate('/dashboard');
    } catch (err) {
      console.error('Error en el login:', err);
      //mensajes exactos de error
       const ERROR_MAP = {
        INVALID_CREDENTIALS: 'Error al validar las credenciales',
        USER_BLOCKED: 'Usuario bloqueado por superar los 5 intentos',
        DEFAULT: 'No se pudo completar la petición. Intente nuevamente o contacte con el administrador'
      };
      //err desde el fetch.jsx
       const backendError = err?.error || err?.msg;

      if (backendError === 'INVALID_CREDENTIALS') {
        setError(ERROR_MAP.INVALID_CREDENTIALS);
      } else if (backendError === 'USER_BLOCKED') {
        setError(ERROR_MAP.USER_BLOCKED);
      } else {
        setError(ERROR_MAP.DEFAULT);
      }

      setIsLoading(false);
    }
  };
    
    // Simulación de llamada a API

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