import { useState } from 'react';
import RecoveryPasswordForm from '../../components/organism/RecoveryPasswordForm';
import NotificationAlert from '../../components/molecules/NotificationAlert';
import '../../styles/auth-login.css';
import '../../styles/recovery-password.css';
import { base_url} from "../../utils/functions";
import { fetchHelper } from "../../utils/fetch";

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
    
    try{
      const url = base_url(['auth', 'forgot-password']);
      const { message } = await fetchHelper.post(url, formData, {}, 500, false, false);
      console.log(message);
      setNotification({ 
        message: message, 
        type: 'success' 
      });

    }catch(error){
      console.error(error);
      setNotification({ 
        message: error.message || error.msg || 'Error al enviar el correo de restablecimiento de contraseña', 
        type: 'error' 
      });
    }finally{
      setIsLoading(false);
    }

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
