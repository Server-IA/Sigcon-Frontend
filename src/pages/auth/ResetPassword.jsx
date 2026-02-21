import { useState } from 'react';
import '../../styles/auth-login.css'; 
import { useParams } from 'react-router-dom';
import PasswordInput from '../../components/molecules/PasswordInput';
import NotificationAlert from '../../components/molecules/NotificationAlert';
import Link from '../../components/atoms/Link';
import { base_url } from '../../utils/functions';
import { fetchHelper } from '../../utils/fetch';
import AlertPage from '../../components/molecules/AlertPage';

const ResetPassword = () => {
    const { token } = useParams();
    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: '',
        token: token
    });
    const [notification, setNotification] = useState({ message: '', type: 'error', show: false });

    const [errors, setErrors] = useState({
        password: '',
        confirmPassword: '',
    });

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setErrors({ ...errors, [e.target.name]: '' });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            setErrors({ ...errors, confirmPassword: 'Las contraseñas no coinciden' });
            return;
        }
        if (formData.newPassword.length < 6) {
            setErrors({ ...errors, newPassword: 'La contraseña debe tener al menos 6 caracteres' });
            return;
        }
        if (!formData.newPassword.match("[A-Z]")) {
            setErrors({ ...errors, newPassword: 'La contraseña debe tener una letra mayúscula' });
            return;
        }
        if (!formData.newPassword.match("[a-z]")) {
            setErrors({ ...errors, newPassword: 'La contraseña debe tener una letra minúscula' });
            return;
        }
        if (!formData.newPassword.match("[0-9]")) {
            setErrors({ ...errors, newPassword: 'La contraseña debe tener un número' });
            return;
        }
        if (errors.newPassword || errors.confirmPassword) {
            setErrors({ ...errors, newPassword: '', confirmPassword: '' });
        }

        try{
            const url = base_url(['auth', 'reset-password']);
            const { message } = await fetchHelper.post(url, formData, {}, 500, false, false);
            setNotification({ message: message, type: 'success', show: true });
        }catch(error){
            setNotification({ message: error.message || error.msg || 'Error al restablecer la contraseña', type: 'danger', show: true });
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="recovery-form card col-lg-4 col-md-6 col-sm-12">
                <div className="card-body">
                    <h4 className="card-title mb-4">Restablecer contraseña</h4>
                    <AlertPage message={notification.message} type={notification.type} show={notification.show} />
                    <div className="form-floating">
                        <PasswordInput
                            value={formData.newPassword}
                            onChange={handleInputChange}
                            name="newPassword"
                            label="Nueva contraseña"
                            placeholder="********"
                            id="newPassword"
                            hasError={errors.newPassword}
                        />
                        {errors.newPassword && <p className="text-danger">{errors.newPassword}</p>}

                    </div>
                    <div className="form-floating">
                        <PasswordInput
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            name="confirmPassword"
                            label="Confirmar nueva contraseña"
                            placeholder="********"
                            id="confirmPassword"
                            hasError={errors.confirmPassword}
                        />
                        {errors.confirmPassword && <p className="text-danger">{errors.confirmPassword}</p>}
                    </div>
                    La contraseña debe tener:
                    <ul>
                        <li>Al menos 6 caracteres</li>
                        <li>Una letra mayúscula</li>
                        <li>Una letra minúscula</li>
                        <li>Un número</li>
                    </ul>
                    <p className="text-muted">
                        Regresar a <Link to="/login">Iniciar sesión</Link>
                    </p>
                    <button type="submit" className="btn btn-primary">Restablecer contraseña</button>
                </div>
            </form>
        </>
    );
};

export default ResetPassword;