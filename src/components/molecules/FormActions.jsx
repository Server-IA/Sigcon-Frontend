import Button from '../atoms/Button';

const FormActions = ({ isLoading = false }) => {
  return (
    <div className="form-actions">
      <Button 
        type="submit"
        variant="primary"
        disabled={isLoading}
      >
        {isLoading ? 'Cargando...' : 'Iniciar sesión'}
      </Button>
    </div>
  );
};

export default FormActions;