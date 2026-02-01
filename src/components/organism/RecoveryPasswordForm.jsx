import InputField from '../molecules/InputFile';
import RecoveryFormActions from '../molecules/RecoveryFormActions';

const RecoveryPasswordForm = ({ 
  formData, 
  onInputChange, 
  onSubmit, 
  isLoading,
  hasError = false
}) => {
  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <form onSubmit={handleFormSubmit} className="recovery-form">
      <h2 className="recovery-form-title">Recuperar contraseña</h2>

      <InputField
        id="email"
        name="email"
        label="Correo"
        type="email"
        placeholder="Tucorreo@gmail.com"
        value={formData.email}
        onChange={onInputChange}
        hasError={hasError}
        required={true}
      />

      <RecoveryFormActions isLoading={isLoading} />
    </form>
  );
};

export default RecoveryPasswordForm;
