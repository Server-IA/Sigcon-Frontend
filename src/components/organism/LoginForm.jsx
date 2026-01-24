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

  return (
    <form onSubmit={handleFormSubmit} className="login-form">
      {error && (
        <ErrorAlert 
          message={error}
          onClose={onErrorClose}
        />
      )}

      <h2 className="login-form-title">Iniciar sesión</h2>
      <p className="login-form-subtitle">Bienvenido a SIGCON 👋<br />Accede a tu cuenta para continuar</p>

      <InputField
        id="email"
        name="email"
        label="Usuario (username o email)"
        placeholder="usuario@email.com"
        value={formData.email}
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