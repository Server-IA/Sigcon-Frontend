import InputField from '../molecules/InputFile';
import PasswordInput from '../molecules/PasswordInput';
import RememberMe from '../molecules/RememberMe';
import FormActions from '../molecules/FormActions';
import ErrorAlert from '../molecules/ErrorAlert';

const LoginForm = ({ 
  formData, 
  onInputChange, 
  onSubmit, 
  error, 
  onErrorClose,
  isLoading 
}) => {
  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  // BUG-Login (2026-06-03 / Imagen 2): autoComplete="off" evita que el navegador
  // precargue/autocomplete credenciales no controladas. La precarga real (campos
  // con superadmin@gmail.com / 123456) venia de valores hardcodeados en el estado
  // de LoginPage, ya removidos alli.
  return (
    <form onSubmit={handleFormSubmit} className="login-form" autoComplete="off">
      {error && (
        <ErrorAlert 
          message={error}
          onClose={onErrorClose}
        />
      )}

      <h2 className="login-form-title">Iniciar sesión</h2>
      <p className="login-form-subtitle">Bienvenido a SIGCON 👋<br />Accede a tu cuenta para continuar</p>

      <InputField
        id="usernameOrEmail"
        name="usernameOrEmail"
        label="Usuario (username o email)"
        placeholder="username o email"
        value={formData.usernameOrEmail}
        onChange={onInputChange}
      />

      <PasswordInput
        value={formData.password}
        onChange={onInputChange}
      />

      <RememberMe
        rememberMe={formData.rememberMe}
        onRememberChange={onInputChange}
      />

      <FormActions 
        isLoading={isLoading}
      />
    </form>
  );
};

export default LoginForm;