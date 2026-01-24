import { useState } from 'react';
import LoginForm from '../../components/organism/LoginForm'; 
import '../../styles/auth-login.css'; 
import {base_url} from '../../utils/functions'; 
import { fetchHelper } from '../../utils/fetch';

const LoginPage = () => {
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

    const url = base_url(['auth', 'login'])
    
    const response = await fetchHelper.post(url, formData, {}, 1000)
    console.log(response); 
    
    // Simulación de llamada a API
    setTimeout(() => {
      const errorTypes = [
        'Error al validar las credenciales',
        'Usuario bloqueado por superar los 5 intentos',
        'No se pudo completar la petición. Intente nuevamente o contacte con el administrador'
      ];
      
      const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      setError(randomError);
      setIsLoading(false);
      
      console.log('Datos de login:', formData);
    }, 1500);
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