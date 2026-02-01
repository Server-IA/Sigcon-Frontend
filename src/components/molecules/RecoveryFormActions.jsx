import Button from '../atoms/Button';
import Link from '../atoms/Link';

const RecoveryFormActions = ({ isLoading = false }) => {
  return (
    <div className="recovery-form-actions">
      <Button 
        type="submit"
        variant="primary"
        disabled={isLoading}
      >
        {isLoading ? 'Enviando...' : 'Recuperar contraseña'}
      </Button>
      <div className="recovery-form-link">
        <span>Volver </span>
        <Link to="/login">Formulario de ingreso</Link>
      </div>
    </div>
  );
};

export default RecoveryFormActions;
