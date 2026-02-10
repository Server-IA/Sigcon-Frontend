import { useState } from 'react';
import LoginForm from '../../components/organism/LoginForm'; 
import '../../styles/auth-login.css'; 
import {base_url} from '../../utils/functions'; 
import { fetchHelper } from '../../utils/fetch';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';

const LoginPage = () => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    email: 'superadmin@gmail.com',
    password: '123456',
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
    const response = await fetchHelper.post(url, formData, {}, 1000);
    
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
    dispatch({ type: "SET_TOKEN", payload: token });
    //peticion para btener la informacion del usuario 
    const userUrl = base_url(['users']);
    const userResponse = await fetchHelper.get(userUrl, {}, 1000); 
    if(userResponse){

      dispatch({ type: "SET_USER", payload: userResponse });

      localStorage.setItem('user', JSON.stringify(userResponse));
      console.log('User info:', userResponse);
    }
    //Redirigir al DashBoard 
    window.location.href = '/dashboard';
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