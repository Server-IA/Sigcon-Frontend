import Icon from '../atoms/Icon';

const ErrorAlert = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="error-alert" role="alert">
      <div className="error-alert-content">
        <div className="error-alert-icon">
          <Icon name="ri-error-warning-line" />
        </div>
        <p className="error-alert-message">{message}</p>
      </div>
      {onClose && (
        <button 
          className="error-alert-close"
          onClick={onClose}
          aria-label="Cerrar alerta"
        >
          <Icon name="ri-close-line" />
        </button>
      )}
    </div>
  );
};

export default ErrorAlert;