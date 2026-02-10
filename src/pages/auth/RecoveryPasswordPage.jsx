import { useState } from 'react';
import RecoveryPasswordForm from '../../components/organism/RecoveryPasswordForm';
import NotificationAlert from '../../components/molecules/NotificationAlert';
import '../../styles/auth-login.css';
import '../../styles/recovery-password.css';

const RecoveryPasswordPage = () => {
  const [formData, setFormData] = useState({
    email: ''
  });
  
  const [notification, setNotification] = useState({ message: '', type: 'error' });
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (hasError) setHasError(false);
    if (notification.message) setNotification({ message: '', type: 'error' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      setHasError(true);
      setNotification({ 
        message: 'Por favor ingrese su correo electrónico', 
        type: 'error' 
      });
      return;
    }

    setIsLoading(true);
    setHasError(false);

    setTimeout(() => {
      const errorTypes = [
        { message: 'No se encontró el correo electrónico', type: 'error' },
        { message: 'El usuario se encuentra bloqueado, por favor espere a que termine el tiempo de espera para volver a intentarlo', type: 'error' },
        { message: 'No se pudo completar la petición. Intente nuevamente o contacte al administrador.', type: 'error' },
        { message: 'Se ha enviado la nueva contraseña a su correo', type: 'success' }
      ];
      
      const randomResult = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      setNotification(randomResult);
      
      if (randomResult.type === 'error' && randomResult.message === 'No se encontró el correo electrónico') {
        setHasError(true);
      }
      
      setIsLoading(false);
    }, 1500);
  };

  const handleCloseNotification = () => {
    setNotification({ message: '', type: 'error' });
  };

  return (
    <>
      <RecoveryPasswordForm
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        hasError={hasError}
      />
      <NotificationAlert 
        message={notification.message}
        type={notification.type}
        onClose={handleCloseNotification}
      />
    </>
  );
};

export default RecoveryPasswordPage;
