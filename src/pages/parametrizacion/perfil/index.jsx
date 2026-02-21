import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import InputField from '../../../components/molecules/InputFile';
import PasswordInput from '../../../components/molecules/PasswordInput';
import Button from '../../../components/atoms/Button';
import Icon from '../../../components/atoms/Icon';
import NotificationBar from '../../../components/molecules/NotificationBar';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import '../../../styles/profile.css';
import ThemeSelector from '../../../components/organism/ThemeSelector';

/** Campo enviado al backend para la imagen de perfil en base64: "avatar" (string, solo la parte base64 sin prefijo data:image/...) */
const AVATAR_FIELD_NAME = 'avatar';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

const PerfilPage = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user?.user) || {};
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    lastname: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [avatarBase64, setAvatarBase64] = useState(null);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [errors, setErrors] = useState({});
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name: user.name ?? '',
      lastname: user.last_name ?? user.lastname ?? '',
      username: user.username ?? '',
      email: user.email ?? '',
    }));
    // if (user?.avatar) {
    //   const av = user.avatar;
    //   setAvatarBase64(av.startsWith('data:') ? av : `data:image/jpeg;base64,${av}`);
    // }
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user?.id) setNotification({ type: 'error', message: 'Debe iniciar sesión para visualizar sus parámetros.' });
  }, [user?.id]);

  const clearNotification = () => setNotification({ type: null, message: '' });

  const handleChangeImageClick = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setNotification({ type: 'error', message: 'Formato no válido. Use PNG, JPG o JPEG.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarBase64(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setAvatarBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name?.trim()) newErrors.name = 'El nombre es obligatorio.';
    if (!form.lastname?.trim()) newErrors.lastname = 'El apellido es obligatorio.';
    // if (!form.username?.trim()) newErrors.username = 'El nombre de usuario es obligatorio.';
    if (!form.email?.trim()) newErrors.email = 'El correo electrónico es obligatorio.';
    if (form.password) {
      if (form.password.length < 6) newErrors.password = 'La contraseña no cumple con los requisitos mínimos de seguridad.';
      if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'La confirmación de la contraseña no coincide.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    clearNotification();
    if (!validate()) {
      setNotification({ type: 'error', message: 'Revise los campos obligatorios y las validaciones.' });
      return;
    }
    try {
      const url = base_url(['users', 'updateInfo']);
      const payload = {
        name: form.name.trim(),
        lastname: form.lastname.trim(),
        username: form.username?.trim() || undefined,
        email: form.email.trim(),
      };
      if (form.password) payload.password = form.password;
      if (avatarBase64) {
        const base64Only = avatarBase64.includes('base64,') ? avatarBase64.split('base64,')[1] : avatarBase64;
        payload[AVATAR_FIELD_NAME] = base64Only;
      }
      const { data } = await fetchHelper.put(url, payload, {}, 500, false);

      dispatch({ type: 'SET_USER', payload: data });
      setNotification({ type: 'success', message: 'Los cambios se guardaron correctamente.' });
      setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      setErrors({});
    } catch (err) {
      const msg = err?.msg || err?.message;
      if (msg?.toLowerCase().includes('usuario') || msg?.toLowerCase().includes('username')) setNotification({ type: 'error', message: 'El nombre de usuario ya está en uso. Intente con otro.' });
      else if (msg?.toLowerCase().includes('correo') || msg?.toLowerCase().includes('email')) setNotification({ type: 'error', message: 'El correo electrónico ya está registrado por otro usuario.' });
      else if (msg?.toLowerCase().includes('contraseña') || msg?.toLowerCase().includes('password')) setNotification({ type: 'error', message: 'La contraseña no cumple con los requisitos mínimos de seguridad.' });
      else if (msg?.toLowerCase().includes('conexión') || msg?.toLowerCase().includes('conexion')) setNotification({ type: 'error', message: 'No se pudo actualizar la información. Intente nuevamente o contacte al administrador.' });
      else setNotification({ type: 'error', message: msg || 'Ocurrió un error desconocido. Por favor, intente más tarde.' });
    }
  };

  const handleDeleteAccount = async () => {
    const userId = user?.id;
    if (!userId) {
      setNotification({ type: 'error', message: 'No se pudo identificar al usuario.' });
      setDeleteModalVisible(false);
      return;
    }
    try {
      const url = base_url(['users', 'deleteUser', String(userId)]);
      await fetchHelper.delete(url, {}, {}, 500, false);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      dispatch({ type: 'LOGOUT' });
      window.location.href = '/login';
    } catch (err) {
      setNotification({ type: 'error', message: err?.msg || err?.message || 'No se pudo eliminar la cuenta. Intente nuevamente.' });
      setDeleteModalVisible(false);
    }
  };



  return (
    <div className="profile-page">
      <div className="profile-page-grid">
        <div className="profile-column-left">
          <div className="profile-card">
            <h2 className="profile-header">Perfil / Mis datos</h2>
            <div className="profile-body">
              {/* Foto de perfil */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                className="profile-file-input-hidden"
                aria-hidden="true"
              />
              <div className="profile-photo-row">
                <div className="profile-photo-avatar">
                  {avatarBase64 ? (
                    <img src={avatarBase64} alt="avatar" />
                  ) : (
                    <>
                      <img src={user.avatar ? `${base_url(['users/avatars', user.avatar])}` : '/assets/img/avatars/1.png'} alt="avatar" />
                      {/* <span className="profile-photo-placeholder profile-photo-placeholder-hidden" aria-hidden="true"><Icon name="ri-user-3-line" /></span> */}
                    </>
                  )}
                </div>
                <div className="profile-photo-actions">
                  <div className="profile-photo-title">Foto de perfil</div>
                  <div className="profile-photo-buttons">
                    <Button type="button" variant="primary" onClick={handleChangeImageClick}>Cambiar Imagen</Button>
                    {/* <Button type="button" variant="secondary" onClick={handleRemoveImage}>Quitar Imagen</Button> */}
                  </div>
                  <div className="profile-photo-hint">Formatos válidos: PNG, JPG, JPEG</div>
                </div>
              </div>

              {/* Datos personales */}
              <section className="profile-section">
                <span className="profile-section-title">Datos Personales</span>
                <div className="profile-fields-row">
                  <InputField id="name" name="name" label="Nombre" type="text" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} hasError={!!errors.name} />
                  <InputField id="lastname" name="lastname" label="Apellido" type="text" placeholder="Apellido" value={form.lastname} onChange={(e) => setForm({ ...form, lastname: e.target.value })} hasError={!!errors.lastname} />
                </div>
                {/* <div className="profile-field-full">
                  <InputField id="username" name="username" label="Username" type="text" placeholder="Nombre de usuario" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} hasError={!!errors.username} />
                  {errors.username && <div className="profile-field-error">{errors.username}</div>}
                </div> */}
              </section>

              {/* Seguridad de la cuenta */}
              <section className="profile-section">
                <span className="profile-section-title">Seguridad de la Cuenta</span>
                <div className="profile-field-with-button">
                  <InputField id="email" name="email" label="Correo electrónico" type="email" placeholder="Correo electrónico" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} hasError={!!errors.email} />
                  <Button type="button" variant="secondary" onClick={() => document.getElementById('email')?.focus()}>Cambiar Correo</Button>
                </div>
                {errors.email && <div className="profile-field-error">{errors.email}</div>}

                <div className="profile-field-with-button">
                  <PasswordInput id="password" name="password" label="Nueva contraseña" placeholder="(Dejar en blanco para no cambiar)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} hasError={!!errors.password} />
                  {errors.password && <div className="profile-field-error">{errors.password}</div>}
                  <Button type="button" variant="secondary" onClick={() => document.getElementById('password')?.focus()}>Cambiar Contraseña</Button>
                </div>

                <div className="profile-field-full">
                  <PasswordInput id="confirmPassword" name="confirmPassword" label="Confirmación de contraseña" placeholder="Repita la contraseña" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} hasError={!!errors.confirmPassword} />
                  {errors.confirmPassword && <div className="profile-field-error">{errors.confirmPassword}</div>}
                </div>
              </section>

              {/* Notificación */}
              <div className="profile-notification">
                <NotificationBar type={notification.type} message={notification.message} onClose={clearNotification} />
              </div>

              <div className="profile-actions">
                <Button type="button" variant="primary" onClick={handleSave}>Guardar Cambios</Button>
                <Button type="button" variant="danger" onClick={() => setDeleteModalVisible(true)}>Eliminar cuenta</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-column-right">
          <ThemeSelector />
        </div>
      </div>

      {/* Modal confirmar eliminar cuenta */}
      {deleteModalVisible && (
        <div className="profile-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
          <div className="profile-modal">
            <div className="profile-modal-header">
              <span id="profile-modal-title">Eliminar cuenta</span>
              <button type="button" className="profile-modal-close" onClick={() => setDeleteModalVisible(false)} aria-label="Cerrar">
                <Icon name="ri-close-line" />
              </button>
            </div>
            <div className="profile-modal-body">
              <p style={{ margin: 0 }}>¿Está seguro de que desea eliminar su cuenta? Esta acción no se puede deshacer.</p>
            </div>
            <div className="profile-modal-footer">
              <Button type="button" variant="secondary" onClick={() => setDeleteModalVisible(false)}>Cancelar</Button>
              <Button type="button" variant="danger" onClick={handleDeleteAccount}>Eliminar cuenta</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerfilPage;
